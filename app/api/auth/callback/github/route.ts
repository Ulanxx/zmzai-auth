import { type NextRequest, NextResponse } from "next/server";

import { getServerEnv } from "@/config/env";
import { createSession } from "@/providers/auth/session";
import { safeNext } from "@/providers/auth/redirect";
import {
  GITHUB_STATE_COOKIE,
  buildGithubConfig,
  exchangeCodeForToken,
  fetchGithubUser,
  fetchPrimaryVerifiedEmail,
  resolveOrCreateUser,
} from "@/providers/auth/github";

export const dynamic = "force-dynamic";

// 简单内存限流（与 /api/login 同模式，独立 key）
const attempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (rec.count >= 10) return false;
  rec.count++;
  return true;
}

function loginRedirectWithError(message: string): NextResponse {
  const url = new URL("/login", getServerEnv().APP_URL);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

/** GET /api/auth/callback/github?code=...&state=... → 换 token、拉 profile、建/找用户、种 SSO cookie、跳回 next。 */
export async function GET(req: NextRequest) {
  const env = getServerEnv();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`github:${ip}`)) {
    return loginRedirectWithError("github_rate_limited");
  }

  // 1. 校验 state（防 CSRF）
  const cookie = req.cookies.get(GITHUB_STATE_COOKIE)?.value;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!cookie || !code || !state) {
    return loginRedirectWithError("github_invalid_request");
  }
  let parsed: { state: string; next: string };
  try {
    parsed = JSON.parse(cookie) as { state: string; next: string };
  } catch {
    return loginRedirectWithError("github_invalid_state");
  }
  if (parsed.state !== state) {
    return loginRedirectWithError("github_state_mismatch");
  }
  const next = safeNext(parsed.next);

  // 2. 换 token + 拉 profile
  const cfg = buildGithubConfig(env);
  let accessToken: string;
  let githubUser;
  let githubEmail: string | null;
  try {
    accessToken = await exchangeCodeForToken(cfg, code);
    githubUser = await fetchGithubUser(accessToken);
    githubEmail = await fetchPrimaryVerifiedEmail(accessToken);
  } catch {
    return loginRedirectWithError("github_exchange_failed");
  }

  // 3. 解析/创建用户
  let user;
  try {
    user = await resolveOrCreateUser(githubUser, githubEmail);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "github_resolve_failed";
    return loginRedirectWithError(
      msg === "GITHUB_NO_VERIFIED_EMAIL"
        ? "github_no_verified_email"
        : "github_resolve_failed",
    );
  }

  // 4. 状态校验（与密码登录一致：必须 active）
  if (user.status !== "active") {
    return loginRedirectWithError("account_disabled");
  }

  // 5. 建 session（种父域 .zmzai.cloud cookie）
  await createSession(user);

  // 302 回来源子域；同步清掉 state cookie
  const res = NextResponse.redirect(new URL(next, env.APP_URL));
  res.cookies.set(GITHUB_STATE_COOKIE, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
