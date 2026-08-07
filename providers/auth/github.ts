import { randomBytes } from "node:crypto";

import { getServerEnv } from "@/config/env";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { AccountModel, UserModel, type UserDocument } from "@zmzai/db";

/** GitHub authorize 入口（web flow）。 */
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_USER = "https://api.github.com/user";
const GITHUB_API_EMAILS = "https://api.github.com/user/emails";

/** 只申请最小权限：读 profile + 读邮箱（含 verified 状态）。 */
const GITHUB_SCOPE = "read:user user:email";

/** /api/auth/github 与 callback 之间用的 state cookie 名。 */
export const GITHUB_STATE_COOKIE = "github_oauth_state";
const GITHUB_STATE_TTL_SECONDS = 5 * 60;

/** GitHub /user 返回的关键字段。 */
export interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

export interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export interface GithubProviderConfig {
  clientId: string;
  clientSecret: string;
  /** 形如 `${APP_URL}/api/auth/callback/github` */
  redirectUri: string;
}

/** 从 server env 组装 GitHub OAuth 凭据与回调地址。 */
export function buildGithubConfig(
  env: ReturnType<typeof getServerEnv>,
): GithubProviderConfig {
  return {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    redirectUri: `${env.APP_URL.replace(/\/$/, "")}/api/auth/callback/github`,
  };
}

/** 生成 CSRF state 并告知调用方它应作为 cookie 存活多久。 */
export function newState(): { state: string; maxAge: number } {
  return {
    state: randomBytes(16).toString("base64url"),
    maxAge: GITHUB_STATE_TTL_SECONDS,
  };
}

/** 拼 GitHub authorize URL。 */
export function getAuthorizeUrl(
  cfg: GithubProviderConfig,
  state: string,
): string {
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("scope", GITHUB_SCOPE);
  url.searchParams.set("state", state);
  // 允许用户在 GitHub 上选换账号（而非静默沿用已登录的 GitHub 账号）
  url.searchParams.set("allow_signup", "true");
  return url.toString();
}

/** code → access_token。 */
export async function exchangeCodeForToken(
  cfg: GithubProviderConfig,
  code: string,
): Promise<string> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`github token exchange failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new Error(
      `github token exchange error: ${data.error ?? "no access_token"}`,
    );
  }
  return data.access_token;
}

/** 拉 GitHub 用户 profile。 */
export async function fetchGithubUser(accessToken: string): Promise<GithubUser> {
  const res = await fetch(GITHUB_API_USER, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "zmzai-auth",
    },
  });
  if (!res.ok) {
    throw new Error(`github /user failed: ${res.status}`);
  }
  return (await res.json()) as GithubUser;
}

/** 拉用户邮箱列表，取 primary && verified 的那个。 */
export async function fetchPrimaryVerifiedEmail(
  accessToken: string,
): Promise<string | null> {
  const res = await fetch(GITHUB_API_EMAILS, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "zmzai-auth",
    },
  });
  if (!res.ok) {
    throw new Error(`github /user/emails failed: ${res.status}`);
  }
  const emails = (await res.json()) as GithubEmail[];
  const primary = emails.find((e) => e.primary && e.verified);
  return primary?.email ?? null;
}

/**
 * 解析或创建本地用户：
 * 1. Account 已绑定 github → 复用其 user
 * 2. 否则邮箱命中已有用户 → 建账号绑定该 user（OAuth 邮箱已 verified，安全）
 * 3. 都没命中 → 新建 user（emailVerified=true，passwordHash 用不可用占位禁用密码登录）+ 建账号
 */
export async function resolveOrCreateUser(
  githubUser: GithubUser,
  githubEmail: string | null,
): Promise<UserDocument> {
  await connectMongo();

  const providerAccountId = String(githubUser.id);

  // 1. 已绑定
  const existingAccount = await AccountModel.findOne({
    provider: "github",
    providerAccountId,
  });
  if (existingAccount) {
    const user = await UserModel.findById(existingAccount.userId);
    if (!user) {
      throw new Error("account 指向的 user 不存在");
    }
    return user;
  }

  // 2. 邮箱命中已有用户 → 绑定
  if (githubEmail) {
    const matched = await UserModel.findOne({ email: githubEmail });
    if (matched) {
      await AccountModel.create({
        userId: matched._id,
        provider: "github",
        providerAccountId,
        username: githubUser.login,
        email: githubEmail,
        avatarUrl: githubUser.avatar_url,
      });
      return matched;
    }
  }

  // 3. 新建用户
  if (!githubEmail) {
    // GitHub 用户未公开邮箱且未配 primary verified 邮箱——拒绝，避免无邮箱账号
    throw new Error("GITHUB_NO_VERIFIED_EMAIL");
  }
  const name =
    githubUser.name?.trim() || githubUser.login || githubEmail.split("@")[0];
  // "!" 前缀 + 随机串：bcrypt 永不匹配，密码登录路径被禁用
  const unusablePasswordHash = `!oauth:${randomBytes(32).toString("hex")}`;
  const created = await UserModel.create({
    name,
    email: githubEmail,
    passwordHash: unusablePasswordHash,
    role: "user",
    status: "active",
    emailVerified: true,
  });
  await AccountModel.create({
    userId: created._id,
    provider: "github",
    providerAccountId,
    username: githubUser.login,
    email: githubEmail,
    avatarUrl: githubUser.avatar_url,
  });
  return created;
}
