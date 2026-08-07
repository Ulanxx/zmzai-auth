import { type NextRequest, NextResponse } from "next/server";

import { getServerEnv } from "@/config/env";
import { safeNext } from "@/providers/auth/redirect";
import {
  buildGithubConfig,
  getAuthorizeUrl,
  newState,
  GITHUB_STATE_COOKIE,
} from "@/providers/auth/github";

export const dynamic = "force-dynamic";

/** GET /api/auth/github?next=... → 种 state cookie，302 到 GitHub authorize。 */
export async function GET(req: NextRequest) {
  const env = getServerEnv();
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const { state, maxAge } = newState();

  // 把 state 与 next 一起存进短期 cookie；回调时校验 state 防 CSRF，读 next 跳回
  const res = NextResponse.redirect(
    getAuthorizeUrl(buildGithubConfig(env), state),
  );
  res.cookies.set(GITHUB_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
