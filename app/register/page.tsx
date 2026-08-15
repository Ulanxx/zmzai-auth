import { redirect } from "next/navigation";

import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/providers/auth/session";
import { safeNext } from "@/providers/auth/redirect";

import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  const user = await getCurrentUser();
  if (user) {
    redirect(next);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-5 py-16">
      <Wordmark className="text-lg" />
      <RegisterForm next={next} />
    </main>
  );
}
