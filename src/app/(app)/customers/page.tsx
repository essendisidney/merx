"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";

export default function CustomersPage() {
  const { currentBusiness } = useWorkspace();
  const [customers, setCustomers] = useState<Tables<"customers">[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
  });
  const [saving, setSaving] = useState(false);

  async function loadCustomers() {
    if (!currentBusiness) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("name");
    setCustomers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, [currentBusiness]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;

    setSaving(true);
    const supabase = createClient();
    await supabase.from("customers").insert({
      business_id: currentBusiness.id,
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      company: form.company || null,
    });

    setForm({ name: "", phone: "", email: "", company: "" });
    setShowForm(false);
    setSaving(false);
    loadCustomers();
  }

  if (!currentBusiness) return null;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customer list"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            Add customer
          </Button>
        }
      />

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
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
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save customer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers"
          description="Add customers to track orders and purchases."
          action={
            <Button onClick={() => setShowForm(true)}>Add customer</Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Company
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {c.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {c.email ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted)] sm:table-cell">
                    {c.company ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
