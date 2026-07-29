import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--surface)]">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent-light)] via-[var(--surface)] to-white"
        aria-hidden
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <span className="font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
          Merx
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center md:px-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
          Merx
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight text-[var(--ink)] md:text-5xl">
          Run your business from one place
        </h1>
        <p className="mt-4 max-w-lg text-base text-[var(--muted)] md:text-lg">
          Products, inventory, sales, and customers — built for teams that need
          clarity, not clutter.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)]"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
