"use client";

import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";

export default function BrandsPage() {
  const { currentBusiness } = useWorkspace();
  const [brands, setBrands] = useState<Tables<"brands">[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadBrands() {
    if (!currentBusiness) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("brands")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("name");
    setBrands(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadBrands();
  }, [currentBusiness]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || !name.trim()) return;

    setSaving(true);
    const supabase = createClient();
    await supabase.from("brands").insert({
      business_id: currentBusiness.id,
      name: name.trim(),
      description: description.trim() || null,
    });

    setName("");
    setDescription("");
    setSaving(false);
    loadBrands();
  }

  if (!currentBusiness) return null;

  return (
    <div>
      <PageHeader title="Brands" description="Manage product brands" />

      <form
        onSubmit={handleAdd}
        className="mb-6 max-w-lg rounded-xl border border-[var(--border)] bg-white p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Brand name"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <Button type="submit" className="mt-3" size="sm" disabled={saving}>
          {saving ? "Adding…" : "Add brand"}
        </Button>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : brands.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No brands"
          description="Add brands to label your products."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-[var(--ink)]">
                    {b.name}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {b.description ?? "—"}
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
