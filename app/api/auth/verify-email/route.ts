import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { verifyEmailToken } from "@/lib/identity";

const schema = z.object({ token: z.string().min(20).max(200) }).strict();

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !(await verifyEmailToken(parsed.data.token))) {
    return NextResponse.json({ error: "验证链接无效、已使用或已过期" }, { status: 400 });
  }
  return NextResponse.json({ verified: true });
}
