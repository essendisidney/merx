"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CURRENCIES = ["KES", "USD", "UGX", "TZS", "GBP"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("KES");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const slug = slugify(name);

    const { error: rpcError } = await supabase.rpc("create_business", {
      p_name: name,
      p_slug: slug,
      p_currency: currency,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Merx
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">
            Set up your business
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Tell us about your business to get started.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Business name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Supplies Ltd"
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as (typeof CURRENCIES)[number])
                }
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? "Creating…" : "Create business"}
          </Button>
        </form>
      </div>
    </div>
  );
}
