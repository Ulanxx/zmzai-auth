import { redirect } from "next/navigation";

import { Seal } from "@/components/seal";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/providers/auth/session";
import { safeNext } from "@/providers/auth/redirect";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  // 已有登录态 → 直接跳回来源子站（无 next 则回落地页），不重复登录
  const user = await getCurrentUser();
  if (user) {
    redirect(next);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-5 py-16">
      <div className="flex flex-col items-center gap-3">
        <Seal size={56} />
        <Wordmark className="text-lg" />
      </div>
      <LoginForm next={next} error={params.error} />
    </main>
  );
}
