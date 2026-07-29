"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Package } from "lucide-react";

export default function ProductsPage() {
  const { currentBusiness } = useWorkspace();
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", currentBusiness!.id)
        .order("name");

      setProducts(data ?? []);
      setLoading(false);
    }

    load();
  }, [currentBusiness]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  if (!currentBusiness) return null;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        actions={
          <Link href="/products/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add product
            </Button>
          </Link>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search ? "No products found" : "No products yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first product to get started."
          }
          action={
            !search && (
              <Link href="/products/new">
                <Button>Add product</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  SKU
                </th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted)] sm:table-cell">
                    {p.sku ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink)]">
                    {formatMoney(p.selling_price, currentBusiness.currency)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {p.stock_quantity}
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
