import Link from "next/link";
import { redirect } from "next/navigation";

import { Seal } from "@/components/seal";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/providers/auth/session";

import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

const sites = [
  { name: "牧之 AI 知识体系", href: "https://muzhi.zmzai.cloud", desc: "博客 + 付费知识体系" },
  { name: "中转驿", href: "https://m.zmzai.cloud", desc: "LLM API 网关" },
  { name: "聚合站", href: "https://zmzai.cloud", desc: "产品矩阵" },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="page-shell flex min-h-dvh flex-col py-10">
      <header className="flex items-center justify-between border-b-2 border-rule pb-5">
        <Wordmark />
        <span className="font-mono text-xs text-muted">auth.zmzai.cloud</span>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-10 py-16">
        <div className="flex items-center gap-5">
          <Seal size={56} className="shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="eyebrow">已登录</p>
            <h1 className="headline text-4xl">你好，{user.name}</h1>
            <p className="text-muted">{user.email} · {user.role}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="headline text-xl">进入子站</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {sites.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group flex flex-col gap-1 border border-line bg-surface p-5 transition-colors hover:border-accent"
                >
                  <span className="font-bold text-ink group-hover:text-accent">{s.name}</span>
                  <span className="text-sm text-muted">{s.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <LogoutButton />
      </section>
    </main>
  );
}
