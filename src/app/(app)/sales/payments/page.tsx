"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatMoney,
  formatRelativeDate,
  PAYMENT_METHOD_LABELS,
} from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type PaymentRow = Tables<"payments"> & {
  orders: { order_number: string } | null;
  receipts: { id: string; receipt_number: string } | null;
};

export default function PaymentsPage() {
  const { currentBusiness } = useWorkspace();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("payments")
        .select("*, orders(order_number), receipts(id, receipt_number)")
        .eq("business_id", currentBusiness!.id)
        .order("paid_at", { ascending: false });

      setPayments((data as PaymentRow[]) ?? []);
      setLoading(false);
    }

    load();
  }, [currentBusiness]);

  if (!currentBusiness) return null;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="All recorded payments"
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments"
          description="Payments appear here when recorded against orders."
          action={
            <Link
              href="/sales/orders"
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              View orders
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]"
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
                    {payment.orders ? (
                      <Link
                        href={`/sales/orders/${payment.order_id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {payment.orders.order_number}
                      </Link>
                    ) : (
                      "—"
                    )}
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
  );
}
