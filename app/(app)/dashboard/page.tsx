"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, AlertCircle, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { requestJson, toErrorMessage } from "../../_lib/api";
import { formatMoney, formatDate, daysOverdue } from "../../_lib/format";
import { StatusBadge } from "../../_components/StatusBadge";
import { Button } from "../../_components/Button";
import type { DashboardStats, AsyncState } from "../../_lib/types";
import { initialState } from "../../_lib/types";

type ApiEnvelope<T> = { data: T };

function StatCard({
  label,
  sublabel,
  value,
  valueColor,
  icon,
  gradientColor,
  loading,
  error,
}: {
  label: string;
  sublabel?: string;
  value: string;
  valueColor?: string;
  icon?: React.ReactNode;
  gradientColor?: string;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border p-6 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-primary)",
      }}
    >
      {/* Label row with icon */}
      <div className="flex items-center justify-between" style={{ position: "relative", zIndex: 1 }}>
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        {icon && (
          <span
            className="flex items-center justify-center rounded-full p-1.5"
            style={{
              backgroundColor: gradientColor ? `${gradientColor}1a` : "var(--bg-elevated)",
              color: gradientColor ?? "var(--text-secondary)",
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {loading ? (
          <div
            className="h-9 w-28 animate-pulse rounded"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          />
        ) : error ? (
          <p className="text-sm" style={{ color: "var(--danger-fg)" }}>
            {error}
          </p>
        ) : (
          <p
            className="text-3xl font-bold tabular-nums leading-tight"
            style={{ color: valueColor ?? "var(--text-primary)" }}
          >
            {value}
          </p>
        )}
        {sublabel && !loading && !error && (
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {sublabel}
          </p>
        )}
      </div>

      {/* Decorative bottom gradient */}
      {gradientColor && (
        <div
          className="absolute bottom-0 left-0 w-full h-16 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${gradientColor}1a, transparent)`,
            zIndex: 0,
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<AsyncState<DashboardStats>>(initialState());

  useEffect(() => {
    requestJson<ApiEnvelope<DashboardStats>>("/api/dashboard/stats")
      .then((res) => setState({ loading: false, data: res.data, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: toErrorMessage(err) }));
  }, []);

  const { loading, data, error } = state;
  const currency = data?.currency ?? "USD";

  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();

  return (
    <div>
      {/* Page header */}
      <div
        className="flex items-center justify-between px-8 py-5"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>
        <Link href="/invoices/new">
          <Button size="md">
            <Plus size={16} strokeWidth={1.5} />
            New Invoice
          </Button>
        </Link>
      </div>

      <div className="mx-auto max-w-[1280px] px-8 py-8">
        {/* Error banner */}
        {!loading && error && (
          <div
            className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--danger-bg)",
              borderColor: "var(--danger-fg)",
              color: "var(--danger-fg)",
            }}
          >
            <AlertCircle size={16} strokeWidth={1.5} />
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            label="Total Outstanding"
            sublabel="Unpaid across all open invoices"
            value={data ? formatMoney(data.totalOutstanding, currency) : "$0.00"}
            icon={<Wallet size={16} strokeWidth={1.5} />}
            gradientColor="#178dee"
            loading={loading}
            error={null}
          />
          <StatCard
            label="Total Overdue"
            sublabel="Past due date and unpaid"
            value={data ? formatMoney(data.totalOverdue, currency) : "$0.00"}
            valueColor={data && data.totalOverdue > 0 ? "var(--danger-fg)" : undefined}
            icon={<AlertTriangle size={16} strokeWidth={1.5} />}
            gradientColor="#ef4444"
            loading={loading}
            error={null}
          />
          <StatCard
            label="Paid This Month"
            sublabel={`Received in ${monthName} ${year}`}
            value={data ? formatMoney(data.paidThisMonth, currency) : "$0.00"}
            valueColor="var(--success-fg)"
            icon={<CheckCircle2 size={16} strokeWidth={1.5} />}
            gradientColor="#22c55e"
            loading={loading}
            error={null}
          />
        </div>

        {/* Currency disclaimer */}
        {data && (
          <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
            Amounts shown in {currency}. Invoices in other currencies are excluded.
          </p>
        )}

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          {/* Recent Invoices */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Recent Invoices
              </h2>
              <Link
                href="/invoices"
                className="text-sm transition-colors hover:text-[var(--text-primary)]"
                style={{ color: "var(--accent-primary)" }}
              >
                View all
              </Link>
            </div>
            <div
              className="rounded-2xl border"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-primary)",
                overflow: "hidden",
              }}
            >
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
                  ))}
                </div>
              ) : !data || data.recentInvoices.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No invoices yet.
                  </p>
                  <Link href="/invoices/new">
                    <Button size="sm">Create your first invoice</Button>
                  </Link>
                </div>
              ) : (
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Invoice</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="cursor-pointer"
                        onClick={() => (window.location.href = `/invoices/${inv.id}`)}
                      >
                        <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                          {inv.clientName}
                        </td>
                        <td style={{ color: "var(--accent-primary)" }}>
                          <Link
                            href={`/invoices/${inv.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td style={{ color: "var(--text-primary)" }}>
                          {formatMoney(inv.total, inv.currency)}
                        </td>
                        <td>
                          <StatusBadge status={inv.status} />
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {formatDate(inv.dueDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Overdue Invoices */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Overdue
              </h2>
            </div>
            <div
              className="rounded-2xl border"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-primary)",
                overflow: "hidden",
              }}
            >
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
                  ))}
                </div>
              ) : !data || data.overdueInvoices.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No overdue invoices. You&apos;re all caught up.
                  </p>
                </div>
              ) : (
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Invoice</th>
                      <th>Amount Due</th>
                      <th>Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdueInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="cursor-pointer"
                        onClick={() => (window.location.href = `/invoices/${inv.id}`)}
                      >
                        <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                          {inv.clientName}
                        </td>
                        <td style={{ color: "var(--accent-primary)" }}>
                          <Link
                            href={`/invoices/${inv.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td style={{ color: "var(--danger-fg)", fontWeight: 500 }}>
                          {formatMoney(inv.amountDue, inv.currency)}
                        </td>
                        <td>
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: "var(--danger-bg)",
                              color: "var(--danger-fg)",
                            }}
                          >
                            {daysOverdue(inv.dueDate)}d overdue
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
