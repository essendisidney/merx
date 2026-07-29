"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadProductImage } from "@/lib/storage";
import { formatMoney } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentBusiness } = useWorkspace();
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [brands, setBrands] = useState<Tables<"brands">[]>([]);
  const [variants, setVariants] = useState<Tables<"product_variants">[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addingVariant, setAddingVariant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantMessage, setVariantMessage] = useState<string | null>(null);

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

  const [variantForm, setVariantForm] = useState({
    name: "",
    colour: "",
    size: "",
    sku: "",
    selling_price: "",
    stock_quantity: "0",
  });

  const loadVariants = useCallback(async () => {
    if (!currentBusiness || !id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .eq("business_id", currentBusiness.id)
      .order("name");
    setVariants(data ?? []);
  }, [currentBusiness, id]);

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
        setImageUrl(product.image_url);
      }
      setCategories(cats ?? []);
      setBrands(brs ?? []);
      setLoading(false);
    }

    load();
    loadVariants();
  }, [currentBusiness, id, loadVariants]);

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

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentBusiness) return;

    setUploadingImage(true);
    setError(null);

    try {
      const url = await uploadProductImage(currentBusiness.id, id, file);
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: url })
        .eq("id", id)
        .eq("business_id", currentBusiness.id);

      if (updateError) throw updateError;
      setImageUrl(url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed.",
      );
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || !variantForm.name.trim()) return;

    setAddingVariant(true);
    setVariantMessage(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("product_variants")
      .insert({
        product_id: id,
        business_id: currentBusiness.id,
        name: variantForm.name.trim(),
        colour: variantForm.colour.trim() || null,
        size: variantForm.size.trim() || null,
        sku: variantForm.sku.trim() || null,
        selling_price: parseFloat(variantForm.selling_price) || null,
        stock_quantity: parseInt(variantForm.stock_quantity, 10) || 0,
      });

    if (insertError) {
      setVariantMessage(insertError.message);
      setAddingVariant(false);
      return;
    }

    await supabase
      .from("products")
      .update({ has_variants: true })
      .eq("id", id)
      .eq("business_id", currentBusiness.id);

    setVariantForm({
      name: "",
      colour: "",
      size: "",
      sku: "",
      selling_price: "",
      stock_quantity: "0",
    });
    setVariantMessage("Variant added.");
    setAddingVariant(false);
    await loadVariants();
  }

  if (!currentBusiness) return null;

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div className="space-y-6">
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

        {imageUrl && (
          <div className="mb-4">
            <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <Image
                src={imageUrl}
                alt={form.name || "Product"}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}

        <div className="mb-4">
          <Label htmlFor="image">Product image</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            disabled={uploadingImage}
            onChange={handleImageChange}
            className="mt-1 cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface)] file:px-3 file:py-1 file:text-sm"
          />
          {uploadingImage && (
            <p className="mt-1 text-xs text-[var(--muted)]">Uploading…</p>
          )}
        </div>

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

      <section className="max-w-2xl rounded-xl border border-[var(--border)] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
              Variants
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Size, colour, or other product options.
            </p>
          </div>
          <Badge>{variants.length}</Badge>
        </div>

        {variantMessage && (
          <div
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              variantMessage.includes("added")
                ? "bg-[var(--accent-light)] text-[var(--accent)]"
                : "bg-red-50 text-[var(--danger)]"
            }`}
          >
            {variantMessage}
          </div>
        )}

        {variants.length > 0 && (
          <div className="mt-4 divide-y divide-[var(--border)]">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {variant.name}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {[variant.colour, variant.size].filter(Boolean).join(" · ") ||
                      "—"}
                    {variant.sku ? ` · SKU: ${variant.sku}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {variant.selling_price != null && (
                    <span className="text-[var(--ink)]">
                      {formatMoney(
                        variant.selling_price,
                        currentBusiness.currency,
                      )}
                    </span>
                  )}
                  <Badge>{variant.stock_quantity} in stock</Badge>
                  {!variant.is_active && <Badge>Inactive</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleAddVariant}
          className="mt-4 grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label htmlFor="variant_name">Variant name</Label>
            <Input
              id="variant_name"
              value={variantForm.name}
              onChange={(e) =>
                setVariantForm({ ...variantForm, name: e.target.value })
              }
              placeholder="Red / Large"
              required
            />
          </div>
          <div>
            <Label htmlFor="variant_colour">Colour</Label>
            <Input
              id="variant_colour"
              value={variantForm.colour}
              onChange={(e) =>
                setVariantForm({ ...variantForm, colour: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="variant_size">Size</Label>
            <Input
              id="variant_size"
              value={variantForm.size}
              onChange={(e) =>
                setVariantForm({ ...variantForm, size: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="variant_sku">SKU</Label>
            <Input
              id="variant_sku"
              value={variantForm.sku}
              onChange={(e) =>
                setVariantForm({ ...variantForm, sku: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="variant_price">Selling price</Label>
            <Input
              id="variant_price"
              type="number"
              min="0"
              step="0.01"
              value={variantForm.selling_price}
              onChange={(e) =>
                setVariantForm({
                  ...variantForm,
                  selling_price: e.target.value,
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="variant_stock">Stock quantity</Label>
            <Input
              id="variant_stock"
              type="number"
              min="0"
              value={variantForm.stock_quantity}
              onChange={(e) =>
                setVariantForm({
                  ...variantForm,
                  stock_quantity: e.target.value,
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={addingVariant}>
              {addingVariant ? "Adding…" : "Add variant"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
