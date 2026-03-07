"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Plus, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/toast";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageError, PageLoader, StatusBadge } from "@/components/ui";
import { ApiClientError, InvoiceSummary, PaginatedEnvelope, STATUS_OPTIONS, apiRequest, formatCurrency, formatDate } from "@/lib/client";

export function InvoiceListPage({ title = "Invoices" }: { title?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InvoiceSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [searchDraft, setSearchDraft] = useState(params.get("search") ?? "");

  const page = Number(params.get("page") ?? "1") || 1;
  const status = params.get("status") ?? "";

  const query = useMemo(() => {
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("limit", "20");
    q.set("sortBy", "createdAt");
    q.set("sortDir", "desc");
    if (status) q.set("status", status);
    const search = params.get("search");
    if (search) q.set("search", search);
    return q.toString();
  }, [page, params, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<PaginatedEnvelope<InvoiceSummary>>(`/api/invoices?${query}`);
      setRows(res.data);
      setTotal(res.meta.total);
    } catch {
      setError("Something went wrong on our end. Try again.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const q = new URLSearchParams(params.toString());
      if (searchDraft) q.set("search", searchDraft);
      else q.delete("search");
      q.set("page", "1");
      router.replace(`/invoices?${q.toString()}`);
    }, 300);
    return () => clearTimeout(handle);
  }, [params, router, searchDraft]);

  function updateStatus(next: string) {
    const q = new URLSearchParams(params.toString());
    if (next) q.set("status", next);
    else q.delete("status");
    q.set("page", "1");
    router.replace(`/invoices?${q.toString()}`);
  }

  async function duplicate(id: string, invoiceNumber: string) {
    try {
      const res = await apiRequest<{ data: { id: string } }>(`/api/invoices/${id}/duplicate`, { method: "POST" });
      pushToast(`Duplicated from ${invoiceNumber}.`);
      router.push(`/invoices/${res.data.id}`);
    } catch {
      pushToast("Something went wrong. Try again.", "error");
    }
  }

  const noSearchMatches = !loading && !error && rows.length === 0 && (params.get("search") || status);

  return (
    <AppShell
      title={title}
      action={<Link href="/invoices/new" className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-white hover:bg-[#818CF8]"><Plus size={18} /> New Invoice</Link>}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          className="w-full max-w-[360px] rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm"
          placeholder="Search invoices..."
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <select className="rounded-lg border border-[#2E2E2E] bg-[#242424] px-3 py-3 text-sm" value={status} onChange={(event) => updateStatus(event.target.value)}>
          {STATUS_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : null}
      {error ? <PageError message={error} onRetry={load} /> : null}

      {!loading && !error && rows.length === 0 && !noSearchMatches ? (
        <EmptyState
          title="No invoices yet."
          body="Create your first invoice to start getting paid."
          action={<Link href="/invoices/new" className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-white">New Invoice</Link>}
        />
      ) : null}

      {!loading && !error && noSearchMatches ? <p className="text-sm text-[#A0A0A0]">No invoices match your search.</p> : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#2E2E2E] text-left text-xs uppercase text-[#A0A0A0]">
                  <th className="py-3">#</th><th className="py-3">Client</th><th className="py-3">Issue Date</th><th className="py-3">Due Date</th><th className="py-3">Amount</th><th className="py-3">Status</th><th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#2E2E2E] text-sm hover:bg-[#2E2E2E]">
                    <td className="py-3 text-[#6366F1]"><Link href={`/invoices/${row.id}`}>{row.invoiceNumber}</Link></td>
                    <td className="py-3">{row.clientName}</td>
                    <td className="py-3">{formatDate(row.issueDate)}</td>
                    <td className="py-3">{formatDate(row.dueDate)}</td>
                    <td className="py-3">{formatCurrency(row.total, row.currency)}</td>
                    <td className="py-3"><StatusBadge status={row.status} /></td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <a href={`/api/invoices/${row.id}/pdf`} className="rounded-md border border-[#2E2E2E] p-1 text-[#A0A0A0] hover:bg-[#242424]" title="Download PDF">
                          <Download size={16} />
                        </a>
                        <button type="button" className="rounded-md border border-[#2E2E2E] p-1 text-[#A0A0A0] hover:bg-[#242424]" title="Duplicate" onClick={() => duplicate(row.id, row.invoiceNumber)}>
                          <Copy size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-[#A0A0A0]">
            <span>{total} invoices</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#2E2E2E] px-3 py-1 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => router.replace(`/invoices?${new URLSearchParams({ ...Object.fromEntries(params.entries()), page: String(page - 1) }).toString()}`)}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#2E2E2E] px-3 py-1 disabled:opacity-40"
                disabled={rows.length < 20}
                onClick={() => router.replace(`/invoices?${new URLSearchParams({ ...Object.fromEntries(params.entries()), page: String(page + 1) }).toString()}`)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
