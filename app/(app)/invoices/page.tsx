"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreVertical, Download, Copy, FileText } from "lucide-react";
import { requestJson, toErrorMessage } from "../../_lib/api";
import { formatMoney, formatDate } from "../../_lib/format";
import { StatusBadge } from "../../_components/StatusBadge";
import { Button } from "../../_components/Button";
import { useToast } from "../../_components/Toast";
import type { InvoiceStatus, InvoiceSummary } from "../../_lib/types";

type PaginatedEnvelope<T> = { data: T[]; meta: { total: number; page: number; limit: number } };
type ApiEnvelope<T> = { data: T };

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

const LIMIT = 25;

function RowMenu({
  invoice,
  onDuplicate,
}: {
  invoice: InvoiceSummary;
  onDuplicate: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-hover)]"
        style={{ color: "var(--text-secondary)" }}
        aria-label="More actions"
      >
        <MoreVertical size={16} strokeWidth={1.5} />
      </button>
      {open && (
        <div
          className="absolute right-0 z-10 mt-1 w-44 rounded-xl border py-1 shadow-lg"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border-primary)",
          }}
        >
          {invoice.status !== "void" && (
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-primary)" }}
              onClick={() => setOpen(false)}
            >
              <Download size={14} strokeWidth={1.5} />
              Download PDF
            </a>
          )}
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-primary)" }}
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDuplicate(invoice.id); }}
          >
            <Copy size={14} strokeWidth={1.5} />
            Duplicate
          </button>
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(
    async (q: string, status: string, p: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(LIMIT),
          sortBy: "createdAt",
          sortDir: "desc",
        });
        if (q) params.set("search", q);
        if (status) params.set("status", status);

        const res = await requestJson<PaginatedEnvelope<InvoiceSummary>>(
          `/api/invoices?${params}`,
        );
        setInvoices(res.data);
        setTotal(res.meta.total);
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(search, statusFilter, page);
  }, [statusFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      load(val, statusFilter, 1);
    }, 300);
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const duplicate = async (id: string) => {
    try {
      const res = await requestJson<ApiEnvelope<{ id: string; invoiceNumber: string }>>(
        `/api/invoices/${id}/duplicate`,
        { method: "POST" },
      );
      toast(`Duplicated from ${invoices.find((i) => i.id === id)?.invoiceNumber ?? "invoice"}.`);
      router.push(`/invoices/${res.data.id}`);
    } catch (err) {
      toast(toErrorMessage(err), "error");
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Page header */}
      <div
        className="flex items-center justify-between px-8 py-6"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Invoices
        </h1>
        <Link href="/invoices/new">
          <Button size="md">
            <Plus size={16} strokeWidth={1.5} />
            New Invoice
          </Button>
        </Link>
      </div>

      <div className="mx-auto max-w-[1280px] px-8 py-8">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              size={16}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="search"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-lg border py-2.5 pl-9 pr-4 text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none"
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: statusFilter === f.value ? "var(--accent-primary)" : "var(--bg-elevated)",
                  borderColor: statusFilter === f.value ? "var(--accent-primary)" : "var(--border-primary)",
                  color: statusFilter === f.value ? "#fff" : "var(--text-secondary)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
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
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: "var(--danger-fg)" }}>{error}</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <FileText size={40} strokeWidth={1} style={{ color: "var(--text-muted)" }} />
              {search || statusFilter ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  No invoices match your search.
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
                      No invoices yet.
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      Create your first invoice to start getting paid.
                    </p>
                  </div>
                  <Link href="/invoices/new">
                    <Button size="sm">New Invoice</Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <table className="app-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td>
                      <Link
                        href={`/invoices/${inv.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {inv.clientName}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {formatDate(inv.issueDate)}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {formatMoney(inv.total, inv.currency)}
                    </td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <RowMenu invoice={inv} onDuplicate={duplicate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
