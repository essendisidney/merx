"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const router = useRouter();
  const { currentBusiness, user } = useWorkspace();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    currency: "KES",
    tax_rate: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusiness) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", currentBusiness!.id)
        .single();

      if (data) {
        setForm({
          name: data.name,
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          country: data.country ?? "",
          currency: data.currency,
          tax_rate: String(data.tax_rate),
        });
      }
      setLoading(false);
    }

    load();
  }, [currentBusiness]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;

    setSaving(true);
    setMessage(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
        currency: form.currency,
        tax_rate: parseFloat(form.tax_rate) || 0,
      })
      .eq("id", currentBusiness.id);

    setSaving(false);
    setMessage(error ? error.message : "Settings saved.");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!currentBusiness) return null;

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description={`Signed in as ${user.fullName}`}
      />

      <form
        onSubmit={handleSave}
        className="max-w-2xl rounded-xl border border-[var(--border)] bg-white p-6"
      >
        {message && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${message.includes("saved") ? "bg-[var(--accent-light)] text-[var(--accent)]" : "bg-red-50 text-[var(--danger)]"}`}
          >
            {message}
          </div>
        )}

        <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
          Business profile
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="tax_rate">Default tax rate (%)</Label>
            <Input
              id="tax_rate"
              type="number"
              min="0"
              step="0.01"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="danger" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </form>
    </div>
  );
}
