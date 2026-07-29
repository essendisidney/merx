"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Boxes,
  ChevronDown,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessSection, type NavSection } from "@/lib/roles";
import type { StaffRole } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section: NavSection;
  children?: { label: string; href: string }[];
};

const allNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "dashboard",
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    section: "products",
    children: [
      { label: "All products", href: "/products" },
      { label: "Categories", href: "/products/categories" },
      { label: "Brands", href: "/products/brands" },
    ],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Warehouse,
    section: "inventory",
    children: [
      { label: "Stock levels", href: "/inventory" },
      { label: "Adjustments", href: "/inventory/adjustments" },
      { label: "Transfers", href: "/inventory/transfers" },
    ],
  },
  {
    label: "Sales",
    href: "/sales/orders",
    icon: ShoppingCart,
    section: "sales",
    children: [
      { label: "Quotations", href: "/sales/quotations" },
      { label: "Orders", href: "/sales/orders" },
    ],
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    section: "customers",
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    section: "notifications",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    section: "settings",
  },
];

function filterNavItems(role: StaffRole) {
  return allNavItems.filter((item) => canAccessSection(role, item.section));
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  const isActive =
    pathname === item.href ||
    (hasChildren &&
      item.children!.some(
        (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
      )) ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));

  const [open, setOpen] = useState(isActive);

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-[var(--accent-light)] text-[var(--accent)]"
              : "text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]",
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  open && "rotate-180",
                )}
              />
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-7 mt-1 space-y-0.5 border-l border-[var(--border)] pl-3">
            {item.children!.map((child) => {
              const childActive =
                pathname === child.href ||
                pathname.startsWith(child.href + "/");
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-sm transition-colors",
                    childActive
                      ? "font-medium text-[var(--accent)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]",
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-[var(--accent-light)] text-[var(--accent)]"
          : "text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function SidebarContent({
  onNavigate,
  navItems,
}: {
  onNavigate?: () => void;
  navItems: NavItem[];
}) {
  const { businesses, currentBusiness, setCurrentBusinessId } = useWorkspace();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] px-4 py-5">
        <Link
          href="/dashboard"
          className="font-display text-xl font-semibold text-[var(--ink)]"
          onClick={onNavigate}
        >
          Merx
        </Link>
        {businesses.length > 1 && currentBusiness ? (
          <select
            value={currentBusiness.id}
            onChange={(e) => setCurrentBusinessId(e.target.value)}
            className="mt-3 w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-[var(--ink)]"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        ) : currentBusiness ? (
          <p className="mt-1 truncate text-xs text-[var(--muted)]">
            {currentBusiness.name}
          </p>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  );
}

type MobileNavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: NavSection;
};

const allMobileNavItems: MobileNavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "dashboard",
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    section: "products",
  },
  {
    label: "Sales",
    href: "/sales/orders",
    icon: ShoppingCart,
    section: "sales",
  },
  {
    label: "Stock",
    href: "/inventory",
    icon: Boxes,
    section: "inventory",
  },
  { label: "More", href: "#menu", icon: Menu },
];

export function AppShell({
  children,
  unreadCount = 0,
}: {
  children: React.ReactNode;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const { currentBusiness } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = currentBusiness?.role ?? "sales";
  const navItems = filterNavItems(role);
  const mobileNavItems = allMobileNavItems.filter(
    (item) =>
      item.href === "#menu" ||
      (item.section && canAccessSection(role, item.section)),
  );

  return (
    <div className="flex min-h-screen bg-[var(--surface)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface-elevated)] md:block">
        <SidebarContent navItems={navItems} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="relative h-full w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              navItems={navItems}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-white px-4 md:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)] md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-medium text-[var(--ink)]">
              {currentBusiness?.name ?? "Workspace"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/search"
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </Link>
            <Link
              href="/notifications"
              className="relative rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[var(--border)] bg-white md:hidden">
          {mobileNavItems.map((item) => {
            const isMenu = item.href === "#menu";
            const isActive =
              !isMenu &&
              (pathname === item.href ||
                pathname.startsWith(item.href + "/"));

            if (isMenu) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[var(--muted)]"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2",
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted)]",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
