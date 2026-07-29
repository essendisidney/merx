"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage() {
  const { currentBusiness } = useWorkspace();
  const [notifications, setNotifications] = useState<
    Tables<"notifications">[]
  >([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!currentBusiness) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("created_at", { ascending: false });
    setNotifications(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [currentBusiness]);

  async function markRead(id: string) {
    if (!currentBusiness) return;
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("business_id", currentBusiness.id);
    load();
  }

  async function markAllRead() {
    if (!currentBusiness) return;
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("business_id", currentBusiness.id)
      .eq("is_read", false);
    load();
  }

  if (!currentBusiness) return null;

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={
          unread > 0 ? `${unread} unread` : "You're all caught up"
        }
        actions={
          unread > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead}>
              Mark all read
            </Button>
          )
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Alerts about orders, stock, and customers will appear here."
        />
      ) : (
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-4 py-4 ${!n.is_read ? "bg-[var(--accent-light)]/30" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--ink)]">{n.title}</p>
                  {!n.is_read && <Badge variant="accent">New</Badge>}
                </div>
                {n.body && (
                  <p className="mt-1 text-sm text-[var(--muted)]">{n.body}</p>
                )}
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatRelativeDate(n.created_at)}
                </p>
                {n.link && (
                  <Link
                    href={n.link}
                    className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline"
                  >
                    View
                  </Link>
                )}
              </div>
              {!n.is_read && (
                <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
