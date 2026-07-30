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
  PAYMENT_METHOD_LABELS,
} from "@/lib/utils";
import type {
  PaymentMethod,
  Tables,
  TablesUpdate,
} from "@/lib/database.types";
import { canWriteSales } from "@/lib/roles";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InvoiceStatusBadge,
  OrderPaymentStatusBadge,
  OrderStatusBadge,
} from "@/components/ui/badge";

type OrderDetail = Tables<"orders"> & {
  customers: { name: string; phone: string | null } | null;
};

type PaymentRow = Tables<"payments"> & {
  receipts: { id: string; receipt_number: string } | null;
};

type RecordPaymentResult = {
  payment_id: string;
  receipt_id: string;
  receipt_number: string;
};

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentBusiness } = useWorkspace();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<Tables<"order_items">[]>([]);
  const [invoice, setInvoice] = useState<Tables<"invoices"> | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<RecordPaymentResult | null>(
    null,
  );

  const canWrite = currentBusiness
    ? canWriteSales(currentBusiness.role)
    : false;

  async function loadOrder() {
    if (!currentBusiness || !id) return;
    const supabase = createClient();
    const [{ data: ord }, { data: its }, { data: invs }, { data: pays }] =
      await Promise.all([
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
        supabase
          .from("invoices")
          .select("*")
          .eq("order_id", id)
          .eq("business_id", currentBusiness.id)
          .neq("status", "void")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("payments")
          .select("*, receipts(id, receipt_number)")
          .eq("order_id", id)
          .eq("business_id", currentBusiness.id)
          .order("paid_at", { ascending: false }),
      ]);

    const orderData = ord as OrderDetail | null;
    setOrder(orderData);
    setItems(its ?? []);
    setInvoice(invs);
    setPayments((pays as PaymentRow[]) ?? []);

    if (orderData) {
      const remaining = Math.max(0, orderData.total - orderData.amount_paid);
      setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : "");
    }

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

  async function handleCreateInvoice() {
    if (!order || !currentBusiness) return;

    setCreatingInvoice(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_invoice_from_order", {
      p_order_id: order.id,
    });

    setCreatingInvoice(false);

    if (error) {
      setPaymentError(error.message);
      return;
    }

    setInvoice(data);
    setPaymentError(null);
    loadOrder();
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !currentBusiness) return;

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
      p_invoice_id: invoice?.id ?? null,
    });

    setRecordingPayment(false);

    if (error) {
      setPaymentError(error.message);
      return;
    }

    const result = data as RecordPaymentResult;
    setLastReceipt(result);
    setShowPaymentForm(false);
    setPaymentReference("");
    setPaymentNotes("");
    loadOrder();
  }

  if (!currentBusiness) return null;

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (!order) {
    return <p className="text-sm text-[var(--muted)]">Order not found.</p>;
  }

  const nextStatus = NEXT_ORDER_STATUS[order.status];
  const remaining = Math.max(0, order.total - order.amount_paid);

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
        <OrderPaymentStatusBadge status={order.payment_status} />
        <span className="text-sm text-[var(--muted)]">
          {formatMoney(order.amount_paid, currentBusiness.currency)} paid of{" "}
          {formatMoney(order.total, currentBusiness.currency)}
          {remaining > 0 &&
            ` · ${formatMoney(remaining, currentBusiness.currency)} remaining`}
        </span>
        {order.customers ? (
          <Link
            href={`/customers/${order.customer_id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            {order.customers.name}
          </Link>
        ) : (
          <span className="text-sm text-[var(--muted)]">Walk-in</span>
        )}
      </div>

      {lastReceipt && (
        <div className="mb-6 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-light)] p-4 text-sm text-[var(--ink)]">
          Payment recorded.{" "}
          <Link
            href={`/sales/receipts/${lastReceipt.receipt_id}`}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            View receipt {lastReceipt.receipt_number}
          </Link>
        </div>
      )}

      {canWrite && order.payment_status !== "paid" && (
        <div className="mb-6 flex flex-wrap gap-2">
          {!invoice && (
            <Button
              variant="secondary"
              onClick={handleCreateInvoice}
              disabled={creatingInvoice}
            >
              {creatingInvoice ? "Creating…" : "Create invoice"}
            </Button>
          )}
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
        </div>
      )}

      {invoice && (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-[var(--muted)]">Linked invoice</p>
              <Link
                href={`/sales/invoices/${invoice.id}`}
                className="font-medium text-[var(--accent)] hover:underline"
              >
                {invoice.invoice_number}
              </Link>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          {invoice.issued_at && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Issued {formatRelativeDate(invoice.issued_at)}
            </p>
          )}
        </div>
      )}

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

      <div className="mt-8">
        <h2 className="mb-4 font-display text-lg font-semibold text-[var(--ink)]">
          Payments
        </h2>
        {payments.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No payments recorded yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatRelativeDate(payment.paid_at)}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink)]">
                      {formatMoney(payment.amount, currentBusiness.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {PAYMENT_METHOD_LABELS[payment.method]}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {payment.reference ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {payment.receipts ? (
                        <Link
                          href={`/sales/receipts/${payment.receipts.id}`}
                          className="text-[var(--accent)] hover:underline"
                        >
                          {payment.receipts.receipt_number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
