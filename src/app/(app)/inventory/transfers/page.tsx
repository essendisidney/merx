"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { canWriteInventory } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

type TransferRow = Tables<"inventory_movements"> & {
  products: { name: string } | null;
};

export default function TransfersPage() {
  const { currentBusiness, user } = useWorkspace();
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [branches, setBranches] = useState<Tables<"branches">[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState("");
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canWrite = currentBusiness
    ? canWriteInventory(currentBusiness.role)
    : false;

  const load = useCallback(async () => {
    if (!currentBusiness) return;
    const supabase = createClient();
    const [{ data: moves }, { data: prods }, { data: brs }] = await Promise.all([
      supabase
        .from("inventory_movements")
        .select("*, products(name)")
        .eq("business_id", currentBusiness.id)
        .eq("movement_type", "transfer")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("products")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("branches")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true)
        .order("is_main", { ascending: false })
        .order("name"),
    ]);
    setTransfers((moves as TransferRow[]) ?? []);
    setProducts(prods ?? []);
    setBranches(brs ?? []);
    setLoading(false);
  }, [currentBusiness]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (branches.length > 0) {
      if (!fromBranchId) setFromBranchId(branches[0]!.id);
      if (!toBranchId && branches.length > 1) setToBranchId(branches[1]!.id);
    }
  }, [branches, fromBranchId, toBranchId]);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || !productId || !fromBranchId || !toBranchId) return;

    setSaving(true);
    setError(null);

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setError("Quantity must be greater than zero.");
      setSaving(false);
      return;
    }

    if (fromBranchId === toBranchId) {
      setError("From and to branches must be different.");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("inventory_movements")
      .insert({
        business_id: currentBusiness.id,
        product_id: productId,
        branch_id: fromBranchId,
        to_branch_id: toBranchId,
        movement_type: "transfer",
        quantity: qty,
        notes: notes || null,
        created_by: user.id,
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setShowForm(false);
    setProductId("");
    setQuantity("");
    setNotes("");
    setSaving(false);
    await load();
  }

  if (!currentBusiness) return null;

  const branchName = (id: string | null) =>
    branches.find((b) => b.id === id)?.name ?? "—";

  if (!canWrite) {
    return (
      <div>
        <PageHeader
          title="Transfers"
          description="Move stock between branches"
        />
        <p className="text-sm text-[var(--muted)]">
          You do not have permission to record inventory transfers.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Transfers"
        description="Move stock between branches"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              New transfer
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
          onSubmit={handleTransfer}
          className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4"
        >
          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
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
                    {p.name} ({p.stock_quantity} total)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="from_branch">From branch</Label>
              <select
                id="from_branch"
                value={fromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
                required
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="to_branch">To branch</Label>
              <select
                id="to_branch"
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                required
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Record transfer"}
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
      ) : transfers.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transfers"
          description="Move stock between your branches."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatRelativeDate(t.created_at)}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink)]">
                    {t.products?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {branchName(t.branch_id)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {branchName(t.to_branch_id)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{t.quantity}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {t.notes ?? "—"}
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
