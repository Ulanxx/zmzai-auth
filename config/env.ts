import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3001"),
  /** 与 muzhi 同 Atlas、同 database，读它的 User/Session 表 */
  MONGODB_URI: z.string().min(1),
  /** 必须与 muzhi 一致——hash session token 用 ${AUTH_SECRET}:${token} */
  AUTH_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default("muzhi_session"),
  /** cookie 作用域父域，子域共享登录态 */
  SESSION_COOKIE_DOMAIN: z.string().trim().min(1).optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedEnv ??= envSchema.parse(process.env);
  return cachedEnv;
}

export function requireAuthSecret(): string {
  const secret = getServerEnv().AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET 未设置");
  }
  return secret;
}
