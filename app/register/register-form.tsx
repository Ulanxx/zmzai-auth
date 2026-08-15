"use client";

import { useState } from "react";

import { Button, Input } from "@zmzai/theme";

export function RegisterForm({ next }: { next: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? "注册失败");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <form className="flex w-full max-w-sm flex-col gap-4 border border-line bg-surface p-8 text-center">
        <p className="eyebrow">zmzai cloud · 注册</p>
        <h1 className="headline text-3xl">验证邮件已发送</h1>
        <p className="text-sm text-muted">
          我们已向 <strong>{email}</strong> 发送了验证链接，请打开邮件完成验证后再登录。
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            window.location.href = next;
          }}
        >
          返回登录
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-5 border border-line bg-surface p-8">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">zmzai cloud · 注册</p>
        <h1 className="headline text-3xl">创建账号</h1>
        <p className="text-sm text-muted">注册一次，zmzai.cloud 全站通用。</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">昵称</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="怎么称呼你" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">邮箱</span>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">密码（至少 12 位，含字母和数字）</span>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="••••••••••••" />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Button type="submit" disabled={busy} className="w-full justify-center">
        {busy ? "注册中…" : "注册"}
      </Button>

      <p className="text-center text-xs text-muted">
        已有账号？{" "}
        <a href={`/login${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline underline-offset-2 hover:text-accent">
          去登录
        </a>
      </p>
    </form>
  );
}
