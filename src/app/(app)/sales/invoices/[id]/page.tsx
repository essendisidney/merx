"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatMoney,
  formatRelativeDate,
  PAYMENT_METHOD_LABELS,
} from "@/lib/utils";
import type { PaymentMethod, Tables } from "@/lib/database.types";
import { canWriteSales } from "@/lib/roles";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvoiceStatusBadge } from "@/components/ui/badge";

type InvoiceDetail = Tables<"invoices">;

type OrderDetail = Tables<"orders"> & {
  customers: { name: string; phone: string | null } | null;
};

type RecordPaymentResult = {
  payment_id: string;
  receipt_id: string;
  receipt_number: string;
};

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentBusiness } = useWorkspace();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<Tables<"order_items">[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const canWrite = currentBusiness
    ? canWriteSales(currentBusiness.role)
    : false;

  async function loadInvoice() {
    if (!currentBusiness || !id) return;

    const supabase = createClient();
    const { data: inv } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("business_id", currentBusiness.id)
      .single();

    if (!inv) {
      setInvoice(null);
      setLoading(false);
      return;
    }

    setInvoice(inv);

    const [{ data: ord }, { data: its }] = await Promise.all([
      supabase
        .from("orders")
        .select("*, customers(name, phone)")
        .eq("id", inv.order_id)
        .eq("business_id", currentBusiness.id)
        .single(),
      supabase
        .from("order_items")
        .select("*")
        .eq("order_id", inv.order_id)
        .eq("business_id", currentBusiness.id),
    ]);

    const orderData = ord as OrderDetail | null;
    setOrder(orderData);
    setItems(its ?? []);

    if (orderData) {
      const remaining = Math.max(0, orderData.total - orderData.amount_paid);
      setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : "");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInvoice();
  }, [currentBusiness, id]);

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice || !order || !currentBusiness) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }

    setRecordingPayment(true);
    setPaymentError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("record_payment", {
      p_order_id: order.id,
      p_amount: amount,
      p_method: paymentMethod,
      p_reference: paymentReference.trim() || null,
      p_notes: paymentNotes.trim() || null,
      p_invoice_id: invoice.id,
    });

    setRecordingPayment(false);

    if (error) {
      setPaymentError(error.message);
      return;
    }

    const result = data as RecordPaymentResult;
    setShowPaymentForm(false);
    router.push(`/sales/receipts/${result.receipt_id}`);
  }

  if (!currentBusiness) return null;

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (!invoice || !order) {
    return <p className="text-sm text-[var(--muted)]">Invoice not found.</p>;
  }

  const remaining = Math.max(0, order.total - order.amount_paid);

  return (
    <div>
      <PageHeader
        title={invoice.invoice_number}
        description={
          invoice.issued_at
            ? `Issued ${formatRelativeDate(invoice.issued_at)}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/sales/orders/${order.id}`}>
              <Button variant="secondary">View order</Button>
            </Link>
            {canWrite &&
              invoice.status !== "void" &&
              invoice.status !== "paid" &&
              order.payment_status !== "paid" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPaymentForm(!showPaymentForm);
                    setPaymentError(null);
                    if (!showPaymentForm && remaining > 0) {
                      setPaymentAmount(remaining.toFixed(2));
                    }
                  }}
                >
                  {showPaymentForm ? "Cancel" : "Record payment"}
                </Button>
              )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <InvoiceStatusBadge status={invoice.status} />
        {order.customers ? (
          <span className="text-sm text-[var(--ink)]">
            {order.customers.name}
            {order.customers.phone && (
              <span className="text-[var(--muted)]">
                {" "}
                · {order.customers.phone}
              </span>
            )}
          </span>
        ) : (
          <span className="text-sm text-[var(--muted)]">Walk-in</span>
        )}
      </div>

      {showPaymentForm && canWrite && (
        <form
          onSubmit={handleRecordPayment}
          className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4"
        >
          <h2 className="mb-4 font-display text-lg font-semibold text-[var(--ink)]">
            Record payment
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Method</Label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="payment-reference">Reference</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. M-Pesa code"
              />
            </div>
            <div>
              <Label htmlFor="payment-notes">Notes</Label>
              <Input
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>
          {paymentError && (
            <p className="mt-3 text-sm text-[var(--danger)]">{paymentError}</p>
          )}
          <div className="mt-4">
            <Button type="submit" disabled={recordingPayment}>
              {recordingPayment ? "Recording…" : "Record payment"}
            </Button>
          </div>
        </form>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-sm text-[var(--muted)]">Subtotal</p>
          <p className="mt-1 text-[var(--ink)]">
            {formatMoney(invoice.subtotal, currentBusiness.currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-sm text-[var(--muted)]">Tax</p>
          <p className="mt-1 text-[var(--ink)]">
            {formatMoney(invoice.tax_amount, currentBusiness.currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-sm text-[var(--muted)]">Total</p>
          <p className="mt-1 font-display text-lg font-semibold text-[var(--ink)]">
            {formatMoney(invoice.total, currentBusiness.currency)}
          </p>
        </div>
      </div>

      {invoice.notes && (
        <p className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
          {invoice.notes}
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
        </table>
      </div>
    </div>
  );
}
