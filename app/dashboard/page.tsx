"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageError, PageLoader, StatusBadge } from "@/components/ui";
import { ApiEnvelope, DashboardStats, formatCurrency, formatDate, apiRequest } from "@/lib/client";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<ApiEnvelope<DashboardStats>>("/api/dashboard/stats");
      setStats(res.data);
    } catch {
      setError("Something went wrong on our end. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const paidMonthLabel = useMemo(() => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date()), []);

  return (
    <AppShell
      title="Dashboard"
      action={
        <Link href="/invoices/new" className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-white hover:bg-[#818CF8]">
          <Plus size={18} strokeWidth={1.5} /> New Invoice
        </Link>
      }
    >
      {loading ? <PageLoader /> : null}
      {error ? <PageError message={error} onRetry={load} /> : null}
      {!loading && !error && stats ? (
        <div className="space-y-8 animate-fade-up">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
              <p className="text-sm text-[#A0A0A0]">Total Outstanding</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(stats.totalOutstanding, stats.currency)}</p>
              <p className="mt-2 text-xs text-[#6B6B6B]">Unpaid across all open invoices</p>
            </div>
            <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
              <p className="text-sm text-[#A0A0A0]">Total Overdue</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(stats.totalOverdue, stats.currency)}</p>
              <p className="mt-2 text-xs text-[#6B6B6B]">Past due date and unpaid</p>
            </div>
            <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
              <p className="text-sm text-[#A0A0A0]">Paid This Month</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(stats.paidThisMonth, stats.currency)}</p>
              <p className="mt-2 text-xs text-[#6B6B6B]">Received in {paidMonthLabel}</p>
            </div>
          </div>
          <p className="text-sm text-[#6B6B6B]">Amounts shown in {stats.currency}. Invoices in other currencies are excluded.</p>

          <section className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
            <h2 className="text-2xl font-semibold">Recent Invoices</h2>
            {stats.recentInvoices.length === 0 ? (
              <EmptyState
                title="No invoices yet."
                action={<Link className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-white" href="/invoices/new">Create your first invoice</Link>}
              />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="border-b border-[#2E2E2E] text-left text-xs uppercase text-[#A0A0A0]">
                      <th className="py-3">Client</th><th className="py-3">Invoice</th><th className="py-3">Amount</th><th className="py-3">Status</th><th className="py-3">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-[#2E2E2E] text-sm">
                        <td className="py-3 text-[#F5F5F5]">{invoice.clientName}</td>
                        <td className="py-3"><Link href={`/invoices/${invoice.id}`} className="text-[#6366F1] hover:text-[#818CF8]">{invoice.invoiceNumber}</Link></td>
                        <td className="py-3">{formatCurrency(invoice.total, invoice.currency)}</td>
                        <td className="py-3"><StatusBadge status={invoice.status} /></td>
                        <td className="py-3">{formatDate(invoice.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
            <h2 className="text-2xl font-semibold">Overdue</h2>
            {stats.overdueInvoices.length === 0 ? (
              <p className="mt-3 text-sm text-[#A0A0A0]">No overdue invoices. You&apos;re all caught up.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="border-b border-[#2E2E2E] text-left text-xs uppercase text-[#A0A0A0]">
                      <th className="py-3">Client</th><th className="py-3">Invoice</th><th className="py-3">Amount Due</th><th className="py-3">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.overdueInvoices.map((invoice) => {
                      const dueDate = new Date(`${invoice.dueDate}T00:00:00.000Z`);
                      const days = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
                      return (
                        <tr key={invoice.id} className="border-b border-[#2E2E2E] text-sm">
                          <td className="py-3 text-[#F5F5F5]">{invoice.clientName}</td>
                          <td className="py-3"><Link href={`/invoices/${invoice.id}`} className="text-[#6366F1] hover:text-[#818CF8]">{invoice.invoiceNumber}</Link></td>
                          <td className="py-3">{formatCurrency(invoice.amountDue, invoice.currency)}</td>
                          <td className="py-3 text-[#EF4444]">{days}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
