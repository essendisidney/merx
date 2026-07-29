import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isOnboarding = pathname.startsWith("/onboarding");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("id, role, business_id, businesses(id, name, slug, currency, tax_rate)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const businesses =
    memberships
      ?.map((m) => {
        const biz = m.businesses as unknown as {
          id: string;
          name: string;
          slug: string;
          currency: string;
          tax_rate: number;
        } | null;
        if (!biz) return null;
        return {
          membershipId: m.id,
          role: m.role,
          ...biz,
        };
      })
      .filter(Boolean) ?? [];

  if (!businesses.length && isOnboarding) {
    return <>{children}</>;
  }

  if (!businesses.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
            Merx
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Create your workspace
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Every business on Merx gets its own workspace for products,
            customers, and orders.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-medium text-white"
          >
            Set up business
          </Link>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businesses[0]!.id)
    .eq("is_read", false);

  return (
    <WorkspaceProvider
      initialBusinesses={businesses as never}
      initialUser={{
        id: user.id,
        email: user.email ?? "",
        fullName: profile?.full_name ?? user.email ?? "User",
      }}
    >
      <AppShell unreadCount={unreadCount ?? 0}>{children}</AppShell>
    </WorkspaceProvider>
  );
}
