"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ApiEnvelope, formatMoney, requestJson, toMessage } from "@/lib/client-http";

type BusinessProfile = {
  businessName: string;
  email: string | null;
  defaultCurrency: string;
};

type DashboardStats = {
  totalOutstanding: number;
  totalOverdue: number;
  paidThisMonth: number;
  currency: string;
};

type InvoiceRow = {
  id: string;
  status: "draft" | "sent" | "partial" | "paid" | "overdue" | "void";
  total: number;
};

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [invoiceCount, setInvoiceCount] = useState<number>(0);

  useEffect(() => {
    Promise.all([
      requestJson<ApiEnvelope<BusinessProfile>>("/api/profile"),
      requestJson<ApiEnvelope<DashboardStats>>("/api/dashboard/stats"),
      requestJson<{ data: InvoiceRow[]; meta: { total: number } }>("/api/invoices?page=1&limit=1"),
    ])
      .then(([profileRes, dashboardRes, invoicesRes]) => {
        setProfile(profileRes.data);
        setDashboard(dashboardRes.data);
        setInvoiceCount(invoicesRes.meta.total);
      })
      .catch((err) => setError(toMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Billing" description="Manage your plan and billing details.">
      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Loading billing...</p>}
      {!loading && error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      {!loading && !error && profile && dashboard && (
        <div className="space-y-6">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Current Plan</p>
            <h2 className="mt-2 text-2xl font-semibold">Free</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Unlimited invoices, unlimited clients, catalog items, and dashboard tracking.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <p className="text-xs text-[var(--color-text-secondary)]">Workspace</p>
                <p className="mt-1 text-sm font-medium">{profile.businessName || "Unnamed business"}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <p className="text-xs text-[var(--color-text-secondary)]">Billing Email</p>
                <p className="mt-1 text-sm font-medium">{profile.email || "No email set"}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <p className="text-xs text-[var(--color-text-secondary)]">Default Currency</p>
                <p className="mt-1 text-sm font-medium">{profile.defaultCurrency}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-lg font-medium">Usage Snapshot</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <p className="text-xs text-[var(--color-text-secondary)]">Invoices Created</p>
                <p className="mt-1 text-sm font-medium">{invoiceCount}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <p className="text-xs text-[var(--color-text-secondary)]">Outstanding</p>
                <p className="mt-1 text-sm font-medium">{formatMoney(dashboard.totalOutstanding, dashboard.currency)}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <p className="text-xs text-[var(--color-text-secondary)]">Overdue</p>
                <p className="mt-1 text-sm font-medium text-[var(--color-error)]">{formatMoney(dashboard.totalOverdue, dashboard.currency)}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <p className="text-xs text-[var(--color-text-secondary)]">Paid This Month</p>
                <p className="mt-1 text-sm font-medium text-[var(--color-success)]">{formatMoney(dashboard.paidThisMonth, dashboard.currency)}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">Amounts shown in {dashboard.currency}. Invoices in other currencies are excluded.</p>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-lg font-medium">Manage Billing Details</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Billing details are managed from your business profile. Update your business name, defaults, and account information there.
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-block rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
            >
              Open Settings
            </Link>
          </section>
        </div>
      )}
    </AppShell>
  );
}
