import { createHmac, randomBytes } from "node:crypto";

import { model, models, Schema, type Model, type Types } from "mongoose";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getServerEnv, requireAuthSecret } from "@/config/env";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { sendIdentityEmail } from "@/providers/email";
import { UserModel } from "@zmzai/db";

/* ---------- credentials ---------- */

export const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(12, "密码至少需要 12 位")
  .max(128, "密码不能超过 128 位")
  .refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), { message: "密码必须同时包含字母和数字" });

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

/* ---------- identity token ---------- */

const identityTokenPurposes = ["verify_email", "reset_password"] as const;
type IdentityTokenPurpose = (typeof identityTokenPurposes)[number];

interface IdentityTokenRecord {
  userId: Types.ObjectId;
  purpose: IdentityTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const identityTokenSchema = new Schema<IdentityTokenRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purpose: { type: String, enum: identityTokenPurposes, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { strict: "throw", timestamps: true },
);

const IdentityTokenModel = (models.IdentityToken as Model<IdentityTokenRecord> | undefined) ?? model<IdentityTokenRecord>("IdentityToken", identityTokenSchema);

async function issueIdentityToken(userId: string, purpose: IdentityTokenPurpose): Promise<string> {
  await connectMongo();
  const token = generateOpaqueToken();
  const env = getServerEnv();
  const lifetimeMs = purpose === "verify_email" ? env.EMAIL_VERIFICATION_TTL_HOURS * 3_600_000 : 60 * 60_000;
  await IdentityTokenModel.deleteMany({ userId, purpose, usedAt: null });
  await IdentityTokenModel.create({ userId, purpose, tokenHash: hashOpaqueToken(token, requireAuthSecret()), expiresAt: new Date(Date.now() + lifetimeMs), usedAt: null });
  return token;
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  await connectMongo();
  const now = new Date();
  const record = await IdentityTokenModel.findOneAndUpdate(
    { tokenHash: hashOpaqueToken(token, requireAuthSecret()), purpose: "verify_email", expiresAt: { $gt: now }, usedAt: null },
    { $set: { usedAt: now } },
    { new: true },
  );
  if (!record) return false;
  await UserModel.updateOne({ _id: record.userId }, { $set: { emailVerified: true } });
  return true;
}

/* ---------- register ---------- */

export async function registerUser(input: { name: string; email: string; password: string }): Promise<{ userId: string }> {
  await connectMongo();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: "user",
    status: "active",
    emailVerified: false,
  });
  // 邮件不阻塞注册返回（SMTP 跨境握手可能超时）；失败走重发流程。
  void (async () => {
    try {
      const token = await issueIdentityToken(String(user._id), "verify_email");
      const env = getServerEnv();
      const actionUrl = new URL("/verify-email", env.APP_URL);
      actionUrl.searchParams.set("token", token);
      await sendIdentityEmail({ to: user.email, recipientName: user.name, actionUrl: actionUrl.toString(), kind: "verify_email" });
    } catch (error) {
      console.error("[identity] 验证邮件发送失败", error);
    }
  })();
  return { userId: String(user._id) };
}
