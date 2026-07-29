"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatRelativeDate } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { OrderStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag } from "lucide-react";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentBusiness } = useWorkspace();
  const [customer, setCustomer] = useState<Tables<"customers"> | null>(null);
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness || !id) return;

    async function load() {
      const supabase = createClient();
      const [{ data: cust }, { data: ords }] = await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .eq("id", id)
          .eq("business_id", currentBusiness!.id)
          .single(),
        supabase
          .from("orders")
          .select("*")
          .eq("customer_id", id)
          .eq("business_id", currentBusiness!.id)
          .order("created_at", { ascending: false }),
      ]);

      setCustomer(cust);
      setOrders(ords ?? []);
      setLoading(false);
    }

    load();
  }, [currentBusiness, id]);

  if (!currentBusiness) return null;

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (!customer) {
    return <p className="text-sm text-[var(--muted)]">Customer not found.</p>;
  }

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={[customer.phone, customer.email, customer.company]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-sm text-[var(--muted)]">Phone</p>
          <p className="mt-1 text-[var(--ink)]">{customer.phone ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-sm text-[var(--muted)]">Email</p>
          <p className="mt-1 text-[var(--ink)]">{customer.email ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-sm text-[var(--muted)]">Type</p>
          <p className="mt-1 capitalize text-[var(--ink)]">
            {customer.customer_type}
          </p>
        </div>
      </div>

      <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
        Purchase history
      </h2>

      {orders.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={ShoppingBag}
          title="No orders"
          description="This customer hasn't placed any orders yet."
        />
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Order #</th>
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
