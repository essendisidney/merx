import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderStatus } from "./database.types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(
  amount: number,
  currency = "KES",
  locale = "en-KE",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  quotation: "Quotation",
  approved: "Approved",
  order: "Order",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const NEXT_ORDER_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  draft: "quotation",
  quotation: "approved",
  approved: "order",
  order: "completed",
};

export function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
