"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Warehouse } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default function InventoryPage() {
  const { currentBusiness, user } = useWorkspace();
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [branches, setBranches] = useState<Tables<"branches">[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [movementType, setMovementType] = useState<"stock_in" | "stock_out">(
    "stock_in",
  );
  const [productId, setProductId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!currentBusiness) return;
    const supabase = createClient();
    const [{ data: prods }, { data: brs }] = await Promise.all([
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
    setProducts(prods ?? []);
    setBranches(brs ?? []);
    setLoading(false);
  }, [currentBusiness]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (branches.length > 0 && !branchId) {
      setBranchId(branches[0]!.id);
    }
  }, [branches, branchId]);

  async function handleMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || !productId || !quantity || !branchId) return;

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      setError("Quantity must be greater than zero.");
      setSaving(false);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) {
      setSaving(false);
      return;
    }

    if (movementType === "stock_out" && product.stock_quantity < qty) {
      setError("Insufficient stock for stock out.");
      setSaving(false);
      return;
    }

    const { error: moveError } = await supabase
      .from("inventory_movements")
      .insert({
        business_id: currentBusiness.id,
        product_id: productId,
        branch_id: branchId,
        movement_type: movementType,
        quantity: qty,
        notes: notes || null,
        created_by: user.id,
      });

    if (moveError) {
      setError(moveError.message);
      setSaving(false);
      return;
    }

    setPanelOpen(false);
    setProductId("");
    setQuantity("");
    setNotes("");
    setSaving(false);
    await loadProducts();
  }

  if (!currentBusiness) return null;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Current stock levels"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setMovementType("stock_in");
                setPanelOpen(true);
              }}
            >
              Stock in
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setMovementType("stock_out");
                setPanelOpen(true);
              }}
            >
              Stock out
            </Button>
            <Link href="/inventory/adjustments">
              <Button size="sm" variant="ghost">
                Adjustments
              </Button>
            </Link>
            <Link href="/inventory/transfers">
              <Button size="sm" variant="ghost">
                Transfers
              </Button>
            </Link>
          </div>
        }
      />

      {panelOpen && (
        <form
          onSubmit={handleMovement}
          className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4"
        >
          <h3 className="font-medium text-[var(--ink)]">
            {movementType === "stock_in" ? "Stock in" : "Stock out"}
          </h3>
          {error && (
            <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="branch">Branch</Label>
              <select
                id="branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.is_main ? " (Main)" : ""}
                  </option>
                ))}
              </select>
            </div>
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
                    {p.name} ({p.stock_quantity} in stock)
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
            <div>
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
            <Button type="submit" size="sm" disabled={saving || !branchId}>
              {saving ? "Saving…" : "Record movement"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setPanelOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="No products"
          description="Add products to track inventory."
          action={
            <Link href="/products/new">
              <Button>Add product</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">In stock</th>
                <th className="px-4 py-3 font-medium">Reorder</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const low = p.stock_quantity <= p.reorder_level;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {p.sku ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink)]">
                      {p.stock_quantity} {p.unit}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {p.reorder_level}
                    </td>
                    <td className="px-4 py-3">
                      {low ? (
                        <Badge variant="warning">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Low
                        </Badge>
                      ) : (
                        <Badge variant="accent">OK</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
