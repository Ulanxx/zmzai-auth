"use client";

import { useEffect, useState } from "react";

import { Button } from "@zmzai/theme";

import { Seal } from "@/components/seal";
import { Wordmark } from "@/components/wordmark";

export default function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [state, setState] = useState<"verifying" | "verified" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const params = await searchParams;
      if (!params.token) {
        setState("error");
        setError("缺少验证令牌");
        return;
      }
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token }),
      });
      if (res.ok) {
        setState("verified");
      } else {
        const j = await res.json().catch(() => ({}));
        setState("error");
        setError(j.error ?? "验证失败");
      }
    })();
  }, [searchParams]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-5 py-16">
      <div className="flex flex-col items-center gap-3">
        <Seal size={56} />
        <Wordmark className="text-lg" />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-4 border border-line bg-surface p-8 text-center">
        {state === "verifying" && (
          <>
            <p className="eyebrow">zmzai cloud · 邮箱验证</p>
            <h1 className="headline text-3xl">正在验证…</h1>
          </>
        )}
        {state === "verified" && (
          <>
            <p className="eyebrow">zmzai cloud · 邮箱验证</p>
            <h1 className="headline text-3xl">验证成功</h1>
            <p className="text-sm text-muted">你的邮箱已通过验证，可以登录了。</p>
            <Button onClick={() => { window.location.href = "/login"; }}>去登录</Button>
          </>
        )}
        {state === "error" && (
          <>
            <p className="eyebrow">zmzai cloud · 邮箱验证</p>
            <h1 className="headline text-3xl">验证失败</h1>
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="secondary" onClick={() => { window.location.href = "/login"; }}>返回登录</Button>
          </>
        )}
      </div>
    </main>
  );
}
