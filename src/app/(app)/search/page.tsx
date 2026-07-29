"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Package, Search, ShoppingBag, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge } from "@/components/ui/badge";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { currentBusiness } = useWorkspace();
  const [query, setQuery] = useState(q);
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [customers, setCustomers] = useState<Tables<"customers">[]>([]);
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setQuery(q);
    if (q && currentBusiness) {
      runSearch(q);
    }
  }, [q, currentBusiness]);

  async function runSearch(term: string) {
    if (!currentBusiness || !term.trim()) return;

    setLoading(true);
    setSearched(true);
    const supabase = createClient();
    const pattern = `%${term.trim()}%`;

    const [{ data: prods }, { data: custs }, { data: ords }] =
      await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("business_id", currentBusiness.id)
          .or(
            `name.ilike.${pattern},sku.ilike.${pattern},barcode.ilike.${pattern}`,
          )
          .limit(10),
        supabase
          .from("customers")
          .select("*")
          .eq("business_id", currentBusiness.id)
          .or(`name.ilike.${pattern},phone.ilike.${pattern}`)
          .limit(10),
        supabase
          .from("orders")
          .select("*")
          .eq("business_id", currentBusiness.id)
          .ilike("order_number", pattern)
          .limit(10),
      ]);

    setProducts(prods ?? []);
    setCustomers(custs ?? []);
    setOrders(ords ?? []);
    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    window.history.replaceState(null, "", `/search?${params.toString()}`);
    runSearch(query);
  }

  if (!currentBusiness) return null;

  const hasResults =
    products.length > 0 || customers.length > 0 || orders.length > 0;

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find products, customers, and orders"
      />

      <form onSubmit={handleSubmit} className="relative mb-8 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, SKU, phone, order number…"
          className="pl-9"
          autoFocus
        />
      </form>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Searching…</p>
      ) : searched && !hasResults ? (
        <EmptyState
          icon={Search}
          title="No results"
          description={`Nothing found for "${q}"`}
        />
      ) : (
        <div className="space-y-8">
          {products.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-[var(--ink)]">
                <Package className="h-4 w-4 text-[var(--accent)]" />
                Products
              </h2>
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 last:border-0 hover:bg-[var(--surface)]"
                  >
                    <div>
                      <p className="font-medium text-[var(--ink)]">{p.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {p.sku ?? p.barcode ?? "No SKU"}
                      </p>
                    </div>
                    <span className="text-sm text-[var(--ink)]">
                      {formatMoney(p.selling_price, currentBusiness.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {customers.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-[var(--ink)]">
                <Users className="h-4 w-4 text-[var(--accent)]" />
                Customers
              </h2>
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                {customers.map((c) => (
                  <Link
                    key={c.id}
                    href={`/customers/${c.id}`}
                    className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 last:border-0 hover:bg-[var(--surface)]"
                  >
                    <div>
                      <p className="font-medium text-[var(--ink)]">{c.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {c.phone ?? c.email ?? "—"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {orders.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-[var(--ink)]">
                <ShoppingBag className="h-4 w-4 text-[var(--accent)]" />
                Orders
              </h2>
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                {orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/sales/orders/${o.id}`}
                    className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 last:border-0 hover:bg-[var(--surface)]"
                  >
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-[var(--ink)]">
                        {o.order_number}
                      </p>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <span className="text-sm text-[var(--ink)]">
                      {formatMoney(o.total, currentBusiness.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <SearchResults />
    </Suspense>
  );
}
