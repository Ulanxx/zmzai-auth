import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { emailSchema, passwordSchema, registerUser } from "@/lib/identity";

const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export async function POST(request: NextRequest) {
  // 只接受同源表单提交（注册是站内表单，不走跨域）
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "跨域请求被拒绝" }, { status: 403 });
  }
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "注册信息格式错误" }, { status: 400 });
  }
  try {
    const { userId } = await registerUser(parsed.data);
    return NextResponse.json({ userId }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
    }
    throw error;
  }
}
