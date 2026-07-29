"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatMoney,
  formatRelativeDate,
  NEXT_ORDER_STATUS,
  ORDER_STATUS_LABELS,
} from "@/lib/utils";
import type { Tables, TablesUpdate } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/ui/badge";

type OrderDetail = Tables<"orders"> & {
  customers: { name: string; phone: string | null } | null;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentBusiness } = useWorkspace();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<Tables<"order_items">[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  async function loadOrder() {
    if (!currentBusiness || !id) return;
    const supabase = createClient();
    const [{ data: ord }, { data: its }] = await Promise.all([
      supabase
        .from("orders")
        .select("*, customers(name, phone)")
        .eq("id", id)
        .eq("business_id", currentBusiness.id)
        .single(),
      supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id)
        .eq("business_id", currentBusiness.id),
    ]);
    setOrder(ord as OrderDetail | null);
    setItems(its ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrder();
  }, [currentBusiness, id]);

  async function advanceStatus() {
    if (!order || !currentBusiness) return;

    const nextStatus = NEXT_ORDER_STATUS[order.status];
    if (!nextStatus) return;

    setAdvancing(true);
    const supabase = createClient();
    const updates: TablesUpdate<"orders"> = { status: nextStatus };

    if (nextStatus === "order") {
      updates.order_date = new Date().toISOString();
    }
    if (nextStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    await supabase
      .from("orders")
      .update(updates)
      .eq("id", order.id)
      .eq("business_id", currentBusiness.id);

    setAdvancing(false);
    loadOrder();
    router.refresh();
  }

  if (!currentBusiness) return null;

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (!order) {
    return <p className="text-sm text-[var(--muted)]">Order not found.</p>;
  }

  const nextStatus = NEXT_ORDER_STATUS[order.status];

  return (
    <div>
      <PageHeader
        title={order.order_number}
        description={`Created ${formatRelativeDate(order.created_at)}`}
        actions={
          nextStatus && (
            <Button onClick={advanceStatus} disabled={advancing}>
              {advancing
                ? "Updating…"
                : `Mark as ${ORDER_STATUS_LABELS[nextStatus]}`}
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        {order.customers && (
          <Link
            href={`/customers/${order.customer_id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            {order.customers.name}
          </Link>
        )}
        {!order.customers && (
          <span className="text-sm text-[var(--muted)]">Walk-in</span>
        )}
      </div>

      {order.notes && (
        <p className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
          {order.notes}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Unit price</th>
              <th className="px-4 py-3 font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-4 py-3 text-[var(--ink)]">
                  {item.product_name}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {item.sku ?? "—"}
                </td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">
                  {formatMoney(item.unit_price, currentBusiness.currency)}
                </td>
                <td className="px-4 py-3">
                  {formatMoney(item.line_total, currentBusiness.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--border)] bg-[var(--surface)]">
              <td colSpan={4} className="px-4 py-3 text-right text-[var(--muted)]">
                Subtotal
              </td>
              <td className="px-4 py-3 text-[var(--ink)]">
                {formatMoney(order.subtotal, currentBusiness.currency)}
              </td>
            </tr>
            <tr className="bg-[var(--surface)]">
              <td colSpan={4} className="px-4 py-3 text-right text-[var(--muted)]">
                Tax
              </td>
              <td className="px-4 py-3 text-[var(--ink)]">
                {formatMoney(order.tax_amount, currentBusiness.currency)}
              </td>
            </tr>
            <tr className="bg-[var(--surface)]">
              <td
                colSpan={4}
                className="px-4 py-3 text-right font-medium text-[var(--ink)]"
              >
                Total
              </td>
              <td className="px-4 py-3 font-display text-lg font-semibold text-[var(--ink)]">
                {formatMoney(order.total, currentBusiness.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
