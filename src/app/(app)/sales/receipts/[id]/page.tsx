"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatMoney,
  formatRelativeDate,
  PAYMENT_METHOD_LABELS,
} from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

type ReceiptDetail = Tables<"receipts"> & {
  payments: Tables<"payments"> | null;
  orders:
    | (Tables<"orders"> & {
        customers: { name: string; phone: string | null } | null;
        order_items: Tables<"order_items">[];
      })
    | null;
};

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { currentBusiness } = useWorkspace();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness || !id) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("receipts")
        .select(
          "*, payments(*), orders(*, customers(name, phone), order_items(*))",
        )
        .eq("id", id)
        .eq("business_id", currentBusiness!.id)
        .single();

      setReceipt(data as ReceiptDetail | null);
      setLoading(false);
    }

    load();
  }, [currentBusiness, id]);

  if (!currentBusiness) return null;

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (!receipt || !receipt.payments || !receipt.orders) {
    return <p className="text-sm text-[var(--muted)]">Receipt not found.</p>;
  }

  const payment = receipt.payments;
  const order = receipt.orders;
  const items = order.order_items ?? [];

  return (
    <div>
      <PageHeader
        title={`Receipt ${receipt.receipt_number}`}
        description={formatRelativeDate(receipt.issued_at)}
        className="print:hidden"
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Link href={`/sales/orders/${order.id}`}>
              <Button variant="secondary">View order</Button>
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-lg rounded-xl border border-[var(--border)] bg-white p-8 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 text-center">
          <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
            {currentBusiness.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Payment receipt</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[var(--muted)]">Receipt #</p>
            <p className="font-medium text-[var(--ink)]">
              {receipt.receipt_number}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[var(--muted)]">Date</p>
            <p className="font-medium text-[var(--ink)]">
              {formatRelativeDate(receipt.issued_at)}
            </p>
          </div>
          <div>
            <p className="text-[var(--muted)]">Customer</p>
            <p className="font-medium text-[var(--ink)]">
              {order.customers?.name ?? "Walk-in"}
            </p>
            {order.customers?.phone && (
              <p className="text-[var(--muted)]">{order.customers.phone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[var(--muted)]">Order</p>
            <p className="font-medium text-[var(--ink)]">{order.order_number}</p>
          </div>
        </div>

        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="py-2 text-[var(--ink)]">{item.product_name}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right text-[var(--ink)]">
                  {formatMoney(item.line_total, currentBusiness.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-6 space-y-1 border-t border-[var(--border)] pt-4 text-sm">
          <div className="flex justify-between text-[var(--muted)]">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal, currentBusiness.currency)}</span>
          </div>
          <div className="flex justify-between text-[var(--muted)]">
            <span>Tax</span>
            <span>{formatMoney(order.tax_amount, currentBusiness.currency)}</span>
          </div>
          <div className="flex justify-between font-medium text-[var(--ink)]">
            <span>Order total</span>
            <span>{formatMoney(order.total, currentBusiness.currency)}</span>
          </div>
        </div>

        <div className="rounded-lg bg-[var(--surface)] p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Payment amount</span>
            <span className="font-display text-lg font-semibold text-[var(--ink)]">
              {formatMoney(payment.amount, currentBusiness.currency)}
            </span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-[var(--muted)]">Method</span>
            <span className="text-[var(--ink)]">
              {PAYMENT_METHOD_LABELS[payment.method]}
            </span>
          </div>
          {payment.reference && (
            <div className="mt-2 flex justify-between">
              <span className="text-[var(--muted)]">Reference</span>
              <span className="text-[var(--ink)]">{payment.reference}</span>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-[var(--muted)] print:mt-12">
          Thank you for your business
        </p>
      </div>
    </div>
  );
}
