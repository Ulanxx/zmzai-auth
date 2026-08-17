import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo, Navbar } from "@zmzai/theme";
import { allProducts, letterProducts, statusLabel } from "@/lib/products";
import { getCurrentUser } from "@/providers/auth/session";
import { safeNext } from "@/providers/auth/redirect";

import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  if (!user) {
    // 未登录 → 登录页；带上 next 让登录后能跳回来源子站
    const target = safeNext(next);
    redirect(target === "/" ? "/login" : `/login?next=${encodeURIComponent(target)}`);
  }

  // 已登录 + 从子站带 next 过来 → 直达来源站，不停在通用落地页
  if (next) {
    redirect(safeNext(next));
  }

  return (
    <main className="page-shell flex min-h-dvh flex-col py-10">
      <Navbar
        sublabel="auth"
        brandHref="/"
        badge={<span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-3">auth.zmzai.cloud</span>}
        actions={<LogoutButton />}
      />

      <section className="flex flex-col gap-10 pt-16">
        {/* 问候区 — 云朵标 + 当前登录身份 */}
        <div className="flex items-center gap-5">
          <Logo size={56} />
          <div className="flex flex-col gap-1">
            <p className="eyebrow">已登录</p>
            <h1 className="headline text-4xl">你好，{user.name}</h1>
            <p className="text-muted">{user.email} · {user.role}</p>
          </div>
        </div>

        {/* Hero — zmzai 逐字母矩阵：我的名字就是产品矩阵 */}
        <h2 className="font-mono font-bold uppercase leading-none tracking-tight">
          <span className="sr-only">zmzai cloud</span>
          <span
            aria-hidden="true"
            className="flex flex-wrap items-end gap-x-6 gap-y-4 text-[clamp(3rem,9vw,6rem)]"
          >
            {letterProducts.map((p, i) => (
              <span key={`${p.letter}-${i}`} className="flex items-end gap-x-3">
                <Link
                  href={p.href}
                  className="focus-ring group flex items-end gap-x-3 text-ink"
                  title={`${p.name} — ${p.tagline}`}
                >
                  <span className="transition-colors group-hover:text-accent">
                    {p.letter}
                  </span>
                  {/* 盖好：每个字母产品线盖一枚刻汉字的朱文印 */}
                  <span className="grid size-[0.72em] shrink-0 place-items-center rounded-[2px] bg-accent-strong font-serif text-[0.34em] font-bold leading-none text-accent-ink transition-colors group-hover:bg-accent">
                    {p.hanzi}
                  </span>
                </Link>
              </span>
            ))}
            <span className="self-end pb-[0.18em] text-[0.5em] font-normal text-muted">
              .cloud
            </span>
          </span>
        </h2>

        <p className="max-w-2xl text-lg leading-9 text-ink/80">
          一次登录，<span className="font-mono text-accent">zmzai</span> 全站通用。
          牧之知识体系、中转驿、沙箱场、Agent 使与工作台，从同一个入口出发。
        </p>
      </section>

      {/* 现在可用 — 全产品线入口，与主站同款编辑风清单 */}
      <section className="rule-top flex flex-col gap-8 pt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="headline text-3xl">现在可用</h2>
          <span className="eyebrow">进入一个产品，开始工作</span>
        </div>
        <ol className="flex flex-col divide-y divide-line border-y-2 border-rule">
          {allProducts.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                className="group grid gap-4 py-7 sm:grid-cols-[6rem_1fr_auto] sm:items-baseline"
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-bold uppercase transition-colors group-hover:text-accent">
                    {p.letter}
                  </span>
                  <span className="font-serif text-lg text-muted">{p.hanzi}</span>
                </span>
                <span>
                  <span className="headline block text-2xl transition-colors group-hover:text-accent">
                    {p.name}
                  </span>
                  <span className="mt-1 block text-ink/70">{p.tagline}</span>
                </span>
                <span className="flex items-baseline gap-3 font-mono text-xs">
                  <span className="text-accent-readable">{statusLabel(p.status)}</span>
                  <span className="text-muted transition-colors group-hover:text-accent">
                    进入 →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <footer className="flex flex-1 items-end justify-start pb-2 pt-12">
        <LogoutButton />
      </footer>
    </main>
  );
}
