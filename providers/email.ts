import nodemailer from "nodemailer";

import { getServerEnv } from "@/config/env";

export type IdentityEmailKind = "verify_email";

export interface IdentityEmailMessage {
  to: string;
  recipientName: string;
  actionUrl: string;
  kind: IdentityEmailKind;
}

function emailCopy(message: IdentityEmailMessage): { subject: string; text: string } {
  if (message.kind === "verify_email") {
    return {
      subject: "验证你的 zmzai.cloud 邮箱",
      text: `${message.recipientName}，你好：\n\n请打开下面的链接完成邮箱验证。链接仅在限定时间内有效：\n${message.actionUrl}\n\n如果不是你发起的注册，请忽略此邮件。`,
    };
  }
  return { subject: "zmzai.cloud 身份验证", text: `请打开链接：${message.actionUrl}` };
}

/** 发送身份验证邮件。SMTP 未配置时降级 console（开发环境）。 */
export async function sendIdentityEmail(message: IdentityEmailMessage): Promise<void> {
  const env = getServerEnv();
  if (env.EMAIL_PROVIDER !== "smtp") {
    console.log("[email:console]", message.kind, "→", message.to, message.actionUrl);
    return;
  }
  if (!env.EMAIL_FROM || !env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    throw new Error("SMTP 配置不完整");
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    disableFileAccess: true,
    disableUrlAccess: true,
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 5_000,
  });
  const copy = emailCopy(message);
  await transport.sendMail({
    from: env.EMAIL_FROM,
    to: message.to,
    subject: copy.subject,
    text: copy.text,
  });
}
