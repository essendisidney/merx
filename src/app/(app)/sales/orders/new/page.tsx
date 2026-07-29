"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LineItem = {
  product_id: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
};

export default function NewOrderPage() {
  const router = useRouter();
  const { currentBusiness, user } = useWorkspace();
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [customers, setCustomers] = useState<Tables<"customers">[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<"draft" | "quotation">("draft");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusiness) return;

    async function load() {
      const supabase = createClient();
      const [{ data: prods }, { data: custs }] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("business_id", currentBusiness!.id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("customers")
          .select("*")
          .eq("business_id", currentBusiness!.id)
          .order("name"),
      ]);
      setProducts(prods ?? []);
      setCustomers(custs ?? []);
    }

    load();
  }, [currentBusiness]);

  function addLine() {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const quantity = parseInt(qty, 10) || 1;
    const taxRate = product.tax_rate ?? currentBusiness!.tax_rate;
    const lineSubtotal = product.selling_price * quantity;
    const lineTotal = lineSubtotal * (1 + taxRate / 100);

    setLines([
      ...lines,
      {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity,
        unit_price: product.selling_price,
        tax_rate: taxRate,
        line_total: lineTotal,
      },
    ]);
    setSelectedProduct("");
    setQty("1");
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  const subtotal = lines.reduce(
    (sum, l) => sum + l.unit_price * l.quantity,
    0,
  );
  const taxAmount = lines.reduce(
    (sum, l) => sum + l.unit_price * l.quantity * (l.tax_rate / 100),
    0,
  );
  const total = subtotal + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || lines.length === 0) {
      setError("Add at least one line item.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: orderNumber, error: numError } = await supabase.rpc(
      "next_order_number",
      { p_business_id: currentBusiness.id },
    );

    if (numError || !orderNumber) {
      setError(numError?.message ?? "Failed to generate order number.");
      setLoading(false);
      return;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        business_id: currentBusiness.id,
        customer_id: customerId || null,
        order_number: orderNumber,
        status,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        total,
        notes: notes || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      setError(orderError?.message ?? "Failed to create order.");
      setLoading(false);
      return;
    }

    const items = lines.map((l) => ({
      order_id: order.id,
      business_id: currentBusiness.id,
      product_id: l.product_id,
      product_name: l.product_name,
      sku: l.sku,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate,
      line_total: l.line_total,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(items);

    if (itemsError) {
      setError(itemsError.message);
      setLoading(false);
      return;
    }

    router.push(`/sales/orders/${order.id}`);
  }

  if (!currentBusiness) return null;

  return (
    <div>
      <PageHeader
        title="New order"
        description="Create a quotation or draft order"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="grid gap-4 rounded-xl border border-[var(--border)] bg-white p-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="customer">Customer</Label>
            <select
              id="customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
            >
              <option value="">Walk-in</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "draft" | "quotation")
              }
              className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="quotation">Quotation</option>
            </select>
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

        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <h3 className="font-medium text-[var(--ink)]">Line items</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="h-10 flex-1 min-w-[200px] rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} —{" "}
                  {formatMoney(p.selling_price, currentBusiness.currency)}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-20"
              placeholder="Qty"
            />
            <Button type="button" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {lines.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-3 py-2 text-[var(--ink)]">
                        {l.product_name}
                      </td>
                      <td className="px-3 py-2">{l.quantity}</td>
                      <td className="px-3 py-2">
                        {formatMoney(l.unit_price, currentBusiness.currency)}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(l.line_total, currentBusiness.currency)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="text-[var(--muted)] hover:text-[var(--danger)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 space-y-1 text-right text-sm">
            <p className="text-[var(--muted)]">
              Subtotal:{" "}
              <span className="text-[var(--ink)]">
                {formatMoney(subtotal, currentBusiness.currency)}
              </span>
            </p>
            <p className="text-[var(--muted)]">
              Tax:{" "}
              <span className="text-[var(--ink)]">
                {formatMoney(taxAmount, currentBusiness.currency)}
              </span>
            </p>
            <p className="font-display text-lg font-semibold text-[var(--ink)]">
              Total: {formatMoney(total, currentBusiness.currency)}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || lines.length === 0}>
            {loading ? "Creating…" : "Create order"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
