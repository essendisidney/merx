"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatRelativeDate } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type OrderRow = Tables<"orders"> & {
  customers: { name: string } | null;
};

export default function OrdersPage() {
  const { currentBusiness } = useWorkspace();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select("*, customers(name)")
        .eq("business_id", currentBusiness!.id)
        .in("status", ["approved", "order", "completed"])
        .order("created_at", { ascending: false });

      setOrders((data as OrderRow[]) ?? []);
      setLoading(false);
    }

    load();
  }, [currentBusiness]);

  if (!currentBusiness) return null;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Approved and completed orders"
        actions={
          <Link href="/sales/orders/new">
            <Button>
              <Plus className="h-4 w-4" />
              New order
            </Button>
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders"
          description="Orders appear here once quotations are approved."
          action={
            <Link href="/sales/orders/new">
              <Button>Create order</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/orders/${o.id}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink)]">
                    {o.customers?.name ?? "Walk-in"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatRelativeDate(o.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--ink)]">
                    {formatMoney(o.total, currentBusiness.currency)}
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
