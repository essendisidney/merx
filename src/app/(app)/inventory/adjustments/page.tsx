"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

type MovementRow = Tables<"inventory_movements"> & {
  products: { name: string } | null;
};

export default function AdjustmentsPage() {
  const { currentBusiness, user } = useWorkspace();
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!currentBusiness) return;
    const supabase = createClient();
    const [{ data: moves }, { data: prods }] = await Promise.all([
      supabase
        .from("inventory_movements")
        .select("*, products(name)")
        .eq("business_id", currentBusiness.id)
        .eq("movement_type", "adjustment")
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true)
        .order("name"),
    ]);
    setMovements((moves as MovementRow[]) ?? []);
    setProducts(prods ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [currentBusiness]);

  async function handleAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || !productId || !quantity) return;

    setSaving(true);
    const supabase = createClient();
    const qty = parseInt(quantity, 10);
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    await supabase.from("inventory_movements").insert({
      business_id: currentBusiness.id,
      product_id: productId,
      movement_type: "adjustment",
      quantity: Math.abs(qty),
      notes: notes || `Adjustment: ${qty > 0 ? "+" : ""}${qty}`,
      created_by: user.id,
    });

    await supabase
      .from("products")
      .update({ stock_quantity: product.stock_quantity + qty })
      .eq("id", productId)
      .eq("business_id", currentBusiness.id);

    setShowForm(false);
    setProductId("");
    setQuantity("");
    setNotes("");
    setSaving(false);
    load();
  }

  if (!currentBusiness) return null;

  return (
    <div>
      <PageHeader
        title="Adjustments"
        description="Inventory adjustment history"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              New adjustment
            </Button>
            <Link href="/inventory">
              <Button size="sm" variant="ghost">
                Stock levels
              </Button>
            </Link>
          </div>
        }
      />

      {showForm && (
        <form
          onSubmit={handleAdjustment}
          className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4"
        >
          <p className="text-sm text-[var(--muted)]">
            Use positive numbers to add stock, negative to remove.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="product">Product</Label>
              <select
                id="product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="qty">Adjustment (+/-)</Label>
              <Input
                id="qty"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Apply adjustment"}
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
      ) : movements.length === 0 ? (
        <EmptyState
          icon={History}
          title="No adjustments"
          description="Record stock corrections here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatRelativeDate(m.created_at)}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink)]">
                    {m.products?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{m.quantity}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {m.notes ?? "—"}
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
