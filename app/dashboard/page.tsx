"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ApiEnvelope, formatDate, formatMoney, requestJson, toMessage } from "@/lib/client-http";

type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "void";

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientName: string;
  total: number;
  amountDue: number;
  currency: string;
  dueDate: string;
};

type DashboardStats = {
  totalOutstanding: number;
  totalOverdue: number;
  paidThisMonth: number;
  currency: string;
  recentInvoices: InvoiceSummary[];
  overdueInvoices: InvoiceSummary[];
};

const statusStyles: Record<InvoiceStatus, string> = {
  draft: "text-[#A0A0A0] bg-[#1C1C1C]",
  sent: "text-[#6366F1] bg-[#1E1B4B]",
  partial: "text-[#F59E0B] bg-[#431407]",
  paid: "text-[#22C55E] bg-[#052E16]",
  overdue: "text-[#EF4444] bg-[#450A0A]",
  void: "text-[#6B6B6B] bg-[#171717]",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    requestJson<ApiEnvelope<DashboardStats>>("/api/dashboard/stats")
      .then((res) => setData(res.data))
      .catch((err) => setError(toMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Dashboard" description="Total outstanding. Total overdue. Paid this month.">
      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Loading dashboard...</p>}
      {!loading && error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      {!loading && !error && data && (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-xs text-[var(--color-text-secondary)]">Total Outstanding</p>
              <p className="mt-2 text-2xl font-semibold">{formatMoney(data.totalOutstanding, data.currency)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-xs text-[var(--color-text-secondary)]">Total Overdue</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-error)]">{formatMoney(data.totalOverdue, data.currency)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-xs text-[var(--color-text-secondary)]">Paid This Month</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-success)]">{formatMoney(data.paidThisMonth, data.currency)}</p>
            </div>
          </div>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Recent Invoices</h2>
              <Link href="/invoices" className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
                View all
              </Link>
            </div>
            {data.recentInvoices.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{invoice.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatMoney(invoice.total, invoice.currency)}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] ${statusStyles[invoice.status]}`}>{invoice.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 text-lg font-medium">Overdue Invoices</h2>
            {data.overdueInvoices.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">No overdue invoices. You&apos;re all caught up.</p>
            ) : (
              <div className="space-y-2">
                {data.overdueInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{invoice.clientName} · due {formatDate(invoice.dueDate)}</p>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-error)]">{formatMoney(invoice.amountDue, invoice.currency)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
