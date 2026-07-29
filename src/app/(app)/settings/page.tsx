"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogOut, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { StaffRole } from "@/lib/database.types";

type TeamMember = {
  id: string;
  user_id: string;
  role: StaffRole;
  is_active: boolean;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

const ROLES: { value: StaffRole; label: string; hint: string }[] = [
  { value: "admin", label: "Admin", hint: "Full access" },
  { value: "manager", label: "Manager", hint: "Ops + oversight" },
  { value: "sales", label: "Sales", hint: "Customers & orders" },
  { value: "inventory", label: "Inventory", hint: "Products & stock" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { currentBusiness, user } = useWorkspace();
  const isAdmin = currentBusiness?.role === "admin";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    currency: "KES",
    tax_rate: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("sales");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [teamMessage, setTeamMessage] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    if (!currentBusiness) return;
    setTeamLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("list_business_members", {
      p_business_id: currentBusiness.id,
    });
    setTeamLoading(false);
    if (error) {
      setTeamMessage(error.message);
      return;
    }
    setMembers((data as TeamMember[]) ?? []);
  }, [currentBusiness]);

  useEffect(() => {
    if (!currentBusiness) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", currentBusiness!.id)
        .single();

      if (data) {
        setForm({
          name: data.name,
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          country: data.country ?? "",
          currency: data.currency,
          tax_rate: String(data.tax_rate),
        });
      }
      setLoading(false);
    }

    load();
    loadTeam();
  }, [currentBusiness, loadTeam]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;

    setSaving(true);
    setMessage(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
        currency: form.currency,
        tax_rate: parseFloat(form.tax_rate) || 0,
      })
      .eq("id", currentBusiness.id);

    setSaving(false);
    setMessage(error ? error.message : "Settings saved.");
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || !inviteEmail.trim()) return;

    setInviteBusy(true);
    setTeamMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("add_business_member", {
      p_business_id: currentBusiness.id,
      p_email: inviteEmail.trim(),
      p_role: inviteRole,
    });
    setInviteBusy(false);

    if (error) {
      setTeamMessage(error.message);
      return;
    }

    setInviteEmail("");
    setInviteRole("sales");
    setTeamMessage("Team member added.");
    await loadTeam();
  }

  async function handleRoleChange(memberId: string, role: StaffRole) {
    setTeamMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("update_business_member_role", {
      p_member_id: memberId,
      p_role: role,
    });
    if (error) {
      setTeamMessage(error.message);
      return;
    }
    await loadTeam();
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this team member from the business?")) return;
    setTeamMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("deactivate_business_member", {
      p_member_id: memberId,
    });
    if (error) {
      setTeamMessage(error.message);
      return;
    }
    setTeamMessage("Member removed.");
    await loadTeam();
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!currentBusiness) return null;

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  const activeMembers = members.filter((m) => m.is_active);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={`Signed in as ${user.fullName}`}
      />

      <form
        onSubmit={handleSave}
        className="max-w-2xl rounded-xl border border-[var(--border)] bg-white p-6"
      >
        {message && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${message.includes("saved") ? "bg-[var(--accent-light)] text-[var(--accent)]" : "bg-red-50 text-[var(--danger)]"}`}
          >
            {message}
          </div>
        )}

        <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
          Business profile
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="tax_rate">Default tax rate (%)</Label>
            <Input
              id="tax_rate"
              type="number"
              min="0"
              step="0.01"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || !isAdmin}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="danger" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
        {!isAdmin && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Only admins can edit the business profile.
          </p>
        )}
      </form>

      <section className="max-w-2xl rounded-xl border border-[var(--border)] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
              Team
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Add staff who already have a Merx account. Roles: Admin, Manager,
              Sales, Inventory.
            </p>
          </div>
          <Badge>{activeMembers.length} active</Badge>
        </div>

        {teamMessage && (
          <div
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              teamMessage.includes("added") || teamMessage.includes("removed")
                ? "bg-[var(--accent-light)] text-[var(--accent)]"
                : "bg-red-50 text-[var(--danger)]"
            }`}
          >
            {teamMessage}
          </div>
        )}

        {isAdmin && (
          <form
            onSubmit={handleAddMember}
            className="mt-4 grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <Label htmlFor="invite_email">Email</Label>
              <Input
                id="invite_email"
                type="email"
                placeholder="colleague@business.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="invite_role">Role</Label>
              <select
                id="invite_role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={inviteBusy} className="w-full">
                <UserPlus className="h-4 w-4" />
                {inviteBusy ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 divide-y divide-[var(--border)]">
          {teamLoading ? (
            <p className="py-4 text-sm text-[var(--muted)]">Loading team…</p>
          ) : activeMembers.length === 0 ? (
            <p className="py-4 text-sm text-[var(--muted)]">No team members yet.</p>
          ) : (
            activeMembers.map((member) => {
              const isYou = member.user_id === user.id;
              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {member.full_name || "User"}
                      {isYou ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {member.email || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && !isYou ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(
                              member.id,
                              e.target.value as StaffRole,
                            )
                          }
                          className="h-9 rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemove(member.id)}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Badge>
                        {ROLES.find((r) => r.value === member.role)?.label ??
                          member.role}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
