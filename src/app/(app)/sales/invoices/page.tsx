"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatMoney,
  formatRelativeDate,
} from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type InvoiceRow = Tables<"invoices"> & {
  orders: { order_number: string } | null;
};

export default function InvoicesPage() {
  const { currentBusiness } = useWorkspace();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("invoices")
        .select("*, orders(order_number)")
        .eq("business_id", currentBusiness!.id)
        .order("issued_at", { ascending: false, nullsFirst: false });

      setInvoices((data as InvoiceRow[]) ?? []);
      setLoading(false);
    }

    load();
  }, [currentBusiness]);

  if (!currentBusiness) return null;

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Invoices issued from orders"
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices"
          description="Create an invoice from an order to see it here."
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
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/invoices/${inv.id}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    {inv.orders ? (
                      <Link
                        href={`/sales/orders/${inv.order_id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {inv.orders.order_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {inv.issued_at
                      ? formatRelativeDate(inv.issued_at)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink)]">
                    {formatMoney(inv.total, currentBusiness.currency)}
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
