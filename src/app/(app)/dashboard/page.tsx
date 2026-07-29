"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  DollarSign,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type DashboardStats = {
  todaySales: number;
  todayOrders: number;
  completedRevenue: number;
  customersCount: number;
  productsCount: number;
  lowStockCount: number;
  bestSellers: { name: string; quantity: number; revenue: number }[];
};

export default function DashboardPage() {
  const { currentBusiness } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;

    async function load() {
      const supabase = createClient();
      const bizId = currentBusiness!.id;
      const currency = currentBusiness!.currency;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [
        { data: todayOrders },
        { data: completedOrders },
        { count: customersCount },
        { count: productsCount },
        { data: products },
        { data: orderItems },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("total")
          .eq("business_id", bizId)
          .gte("created_at", todayIso),
        supabase
          .from("orders")
          .select("total")
          .eq("business_id", bizId)
          .eq("status", "completed"),
        supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", bizId),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("business_id", bizId)
          .eq("is_active", true),
        supabase
          .from("products")
          .select("stock_quantity, reorder_level")
          .eq("business_id", bizId)
          .eq("is_active", true),
        supabase
          .from("order_items")
          .select("product_name, quantity, line_total")
          .eq("business_id", bizId),
      ]);

      const todaySales =
        todayOrders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;
      const completedRevenue =
        completedOrders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;
      const lowStockCount =
        products?.filter(
          (p) => p.stock_quantity <= p.reorder_level,
        ).length ?? 0;

      const sellerMap = new Map<
        string,
        { quantity: number; revenue: number }
      >();
      orderItems?.forEach((item) => {
        const existing = sellerMap.get(item.product_name) ?? {
          quantity: 0,
          revenue: 0,
        };
        sellerMap.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.line_total),
        });
      });

      const bestSellers = Array.from(sellerMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setStats({
        todaySales,
        todayOrders: todayOrders?.length ?? 0,
        completedRevenue,
        customersCount: customersCount ?? 0,
        productsCount: productsCount ?? 0,
        lowStockCount,
        bestSellers,
      });
      setLoading(false);
    }

    load();
  }, [currentBusiness]);

  if (!currentBusiness) return null;

  const currency = currentBusiness.currency;

  const kpis = stats
    ? [
        {
          label: "Today's sales",
          value: formatMoney(stats.todaySales, currency),
          icon: DollarSign,
        },
        {
          label: "Orders today",
          value: String(stats.todayOrders),
          icon: ShoppingBag,
        },
        {
          label: "Completed revenue",
          value: formatMoney(stats.completedRevenue, currency),
          icon: TrendingUp,
        },
        {
          label: "Customers",
          value: String(stats.customersCount),
          icon: Users,
        },
        {
          label: "Products",
          value: String(stats.productsCount),
          icon: Package,
        },
        {
          label: "Low stock",
          value: String(stats.lowStockCount),
          icon: AlertTriangle,
          warn: stats.lowStockCount > 0,
        },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Overview for ${currentBusiness.name}`}
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-[var(--border)] bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--muted)]">{kpi.label}</p>
                  <kpi.icon
                    className={`h-4 w-4 ${kpi.warn ? "text-[var(--warning)]" : "text-[var(--accent)]"}`}
                  />
                </div>
                <p
                  className={`mt-2 font-display text-2xl font-semibold ${kpi.warn ? "text-[var(--warning)]" : "text-[var(--ink)]"}`}
                >
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
              Best-selling products
            </h2>
            {stats!.bestSellers.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="No sales yet"
                description="Products will appear here once you start selling."
                action={
                  <Link
                    href="/sales/orders/new"
                    className="text-sm font-medium text-[var(--accent)] hover:underline"
                  >
                    Create an order
                  </Link>
                }
              />
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Qty sold</th>
                      <th className="px-4 py-3 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats!.bestSellers.map((item) => (
                      <tr
                        key={item.name}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="px-4 py-3 text-[var(--ink)]">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-[var(--ink)]">
                          {formatMoney(item.revenue, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
