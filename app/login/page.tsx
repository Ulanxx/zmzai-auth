"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Wordmark } from "@/components/wordmark";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
