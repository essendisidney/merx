"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentBusiness } = useWorkspace();
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [brands, setBrands] = useState<Tables<"brands">[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    category_id: "",
    brand_id: "",
    cost_price: "",
    selling_price: "",
    stock_quantity: "",
    reorder_level: "",
    unit: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    if (!currentBusiness || !id) return;

    async function load() {
      const supabase = createClient();
      const [{ data: product }, { data: cats }, { data: brs }] =
        await Promise.all([
          supabase
            .from("products")
            .select("*")
            .eq("id", id)
            .eq("business_id", currentBusiness!.id)
            .single(),
          supabase
            .from("categories")
            .select("*")
            .eq("business_id", currentBusiness!.id)
            .order("name"),
          supabase
            .from("brands")
            .select("*")
            .eq("business_id", currentBusiness!.id)
            .order("name"),
        ]);

      if (product) {
        setForm({
          name: product.name,
          sku: product.sku ?? "",
          barcode: product.barcode ?? "",
          category_id: product.category_id ?? "",
          brand_id: product.brand_id ?? "",
          cost_price: String(product.cost_price),
          selling_price: String(product.selling_price),
          stock_quantity: String(product.stock_quantity),
          reorder_level: String(product.reorder_level),
          unit: product.unit,
          description: product.description ?? "",
          is_active: product.is_active,
        });
      }
      setCategories(cats ?? []);
      setBrands(brs ?? []);
      setLoading(false);
    }

    load();
  }, [currentBusiness, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("products")
      .update({
        name: form.name,
        sku: form.sku || null,
        barcode: form.barcode || null,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        cost_price: parseFloat(form.cost_price) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        stock_quantity: parseInt(form.stock_quantity, 10) || 0,
        reorder_level: parseInt(form.reorder_level, 10) || 0,
        unit: form.unit,
        description: form.description || null,
        is_active: form.is_active,
      })
      .eq("id", id)
      .eq("business_id", currentBusiness.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  if (!currentBusiness) return null;

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div>
      <PageHeader
        title={form.name || "Product"}
        description={`Price: ${formatMoney(parseFloat(form.selling_price) || 0, currentBusiness.currency)}`}
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl rounded-xl border border-[var(--border)] bg-white p-6"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={form.category_id}
              onChange={(e) =>
                setForm({ ...form, category_id: e.target.value })
              }
              className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="brand">Brand</Label>
            <select
              id="brand"
              value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
            >
              <option value="">None</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cost_price">Cost price</Label>
            <Input
              id="cost_price"
              type="number"
              min="0"
              step="0.01"
              value={form.cost_price}
              onChange={(e) =>
                setForm({ ...form, cost_price: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="selling_price">Selling price</Label>
            <Input
              id="selling_price"
              type="number"
              min="0"
              step="0.01"
              value={form.selling_price}
              onChange={(e) =>
                setForm({ ...form, selling_price: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="stock">Stock quantity</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={form.stock_quantity}
              onChange={(e) =>
                setForm({ ...form, stock_quantity: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="reorder">Reorder level</Label>
            <Input
              id="reorder"
              type="number"
              min="0"
              value={form.reorder_level}
              onChange={(e) =>
                setForm({ ...form, reorder_level: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            <Label htmlFor="is_active" className="mb-0">
              Active
            </Label>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/products")}
          >
            Back
          </Button>
        </div>
      </form>
    </div>
  );
}
