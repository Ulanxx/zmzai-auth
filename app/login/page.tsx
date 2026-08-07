"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Wordmark } from "@/components/wordmark";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const paramError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OAuth 回调失败时把 ?error= 映射成中文提示
  useEffect(() => {
    if (!paramError) return;
    const map: Record<string, string> = {
      github_invalid_request: "GitHub 登录请求无效",
      github_invalid_state: "GitHub 登录状态已过期，请重试",
      github_state_mismatch: "GitHub 登录状态校验失败，请重试",
      github_exchange_failed: "GitHub 授权失败，请重试",
      github_no_verified_email: "你的 GitHub 账号没有已验证的主邮箱，无法登录",
      github_resolve_failed: "GitHub 账号解析失败，请重试",
      github_rate_limited: "GitHub 登录尝试过多，请稍后再试",
      account_disabled: "账号已禁用",
    };
    setError(map[paramError] ?? "登录失败");
  }, [paramError]);

  const githubHref = `/api/auth/github?next=${encodeURIComponent(next)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, next }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? "登录失败");
      return;
    }
    // 跳回来源子域
    window.location.href = j.next ?? "/";
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-5 border border-line bg-surface p-8">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">zmzai cloud · 单点登录</p>
        <h1 className="headline text-3xl">登录牧之的云</h1>
        <p className="text-sm text-muted">
          一次登录，zmzai.cloud 全站通用。
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">邮箱</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-line bg-paper px-3 py-2.5"
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">密码</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-line bg-paper px-3 py-2.5"
          placeholder="••••••••"
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button type="submit" disabled={busy} className="btn-primary justify-center disabled:opacity-50">
        {busy ? "登录中…" : "登录"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-muted">或</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <a
        href={githubHref}
        className="flex justify-center border border-line bg-paper px-3 py-2.5 text-sm transition-colors hover:bg-surface"
      >
        使用 GitHub 登录
      </a>

      <p className="text-center text-xs text-muted">
        还没有账号？{" "}
        <a href="https://muzhi.zmzai.cloud/register" className="underline underline-offset-2 hover:text-accent">
          去 muzhi 注册
        </a>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-5 py-16">
      <Wordmark className="text-lg" />
      <Suspense fallback={<div className="h-64 w-full max-w-sm animate-pulse border border-line bg-surface" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
