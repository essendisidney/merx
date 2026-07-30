import { cn } from "@/lib/utils";
import type {
  InvoiceStatus,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/database.types";
import {
  INVOICE_STATUS_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
} from "@/lib/utils";

type BadgeVariant = "default" | "accent" | "warning" | "danger" | "muted";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)]",
  accent: "bg-[var(--accent-light)] text-[var(--accent)] border-transparent",
  warning: "bg-amber-50 text-[var(--warning)] border-transparent",
  danger: "bg-red-50 text-[var(--danger)] border-transparent",
  muted: "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]",
};

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusVariant: Partial<Record<OrderStatus, BadgeVariant>> = {
  draft: "muted",
  quotation: "default",
  approved: "accent",
  order: "accent",
  completed: "accent",
  cancelled: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={statusVariant[status] ?? "default"}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

const paymentStatusVariant: Record<OrderPaymentStatus, BadgeVariant> = {
  unpaid: "danger",
  partial: "warning",
  paid: "accent",
};

export function OrderPaymentStatusBadge({
  status,
}: {
  status: OrderPaymentStatus;
}) {
  return (
    <Badge variant={paymentStatusVariant[status]}>
      {ORDER_PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

const invoiceStatusVariant: Record<InvoiceStatus, BadgeVariant> = {
  draft: "muted",
  issued: "default",
  paid: "accent",
  void: "danger",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant={invoiceStatusVariant[status]}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
