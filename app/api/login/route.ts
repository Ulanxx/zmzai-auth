import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSession } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { UserModel } from "@/providers/database/mongodb/models/user";

export const dynamic = "force-dynamic";

const loginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
    next: z.string().max(500).optional(),
  })
  .strict();

function err(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

/** next 白名单：只允许 zmzai.cloud 域，防开放重定向。 */
function safeNext(next: string | undefined): string {
  if (!next) return "/";
  try {
    const url = new URL(next);
    if (url.hostname === "zmzai.cloud" || url.hostname.endsWith(".zmzai.cloud")) {
      return next;
    }
  } catch {
    // 相对路径允许
    if (next.startsWith("/")) return next;
  }
  return "/";
}

// 简单内存限流（常驻进程下有效；serverless 多实例需 Redis）
const attempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (rec.count >= 5) return false;
  rec.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`login:${ip}`)) {
    return err("登录尝试过多，请稍后再试", 429);
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return err("邮箱或密码格式错误", 400);
  }

  await connectMongo();
  const user = await UserModel.findOne({ email: parsed.data.email }).select(
    "+passwordHash",
  );

  if (
    !user ||
    user.status !== "active" ||
    !(await bcrypt.compare(parsed.data.password, user.passwordHash))
  ) {
    return err("邮箱或密码错误", 401);
  }

  if (!user.emailVerified) {
    return err("请先完成邮箱验证", 403, "EMAIL_NOT_VERIFIED");
  }

  await createSession(user);

  return NextResponse.json({
    ok: true,
    next: safeNext(parsed.data.next),
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
