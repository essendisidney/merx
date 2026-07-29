import type { StaffRole } from "@/lib/database.types";

export type NavSection =
  | "dashboard"
  | "products"
  | "inventory"
  | "sales"
  | "customers"
  | "notifications"
  | "settings";

const ROLE_ACCESS: Record<StaffRole, NavSection[]> = {
  admin: [
    "dashboard",
    "products",
    "inventory",
    "sales",
    "customers",
    "notifications",
    "settings",
  ],
  manager: [
    "dashboard",
    "products",
    "inventory",
    "sales",
    "customers",
    "notifications",
    "settings",
  ],
  sales: ["dashboard", "sales", "customers", "notifications", "settings"],
  inventory: [
    "dashboard",
    "products",
    "inventory",
    "notifications",
    "settings",
  ],
};

export function canAccessSection(role: StaffRole, section: NavSection) {
  return ROLE_ACCESS[role]?.includes(section) ?? false;
}

export function canManageTeam(role: StaffRole) {
  return role === "admin";
}

export function canEditBusiness(role: StaffRole) {
  return role === "admin";
}

export function canManageBranches(role: StaffRole) {
  return role === "admin" || role === "manager";
}

export function canWriteInventory(role: StaffRole) {
  return role === "admin" || role === "manager" || role === "inventory";
}

export function canWriteProducts(role: StaffRole) {
  return role === "admin" || role === "manager" || role === "inventory";
}

export function canWriteSales(role: StaffRole) {
  return role === "admin" || role === "manager" || role === "sales";
}
