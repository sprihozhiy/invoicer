"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PaginatedEnvelope, formatDate, formatMoney, requestJson, toMessage } from "@/lib/client-http";

type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "void";

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientName: string;
  total: number;
  currency: string;
  dueDate: string;
};

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InvoiceSummary[]>([]);

  useEffect(() => {
    requestJson<PaginatedEnvelope<InvoiceSummary>>("/api/invoices?page=1&limit=25&sortBy=createdAt&sortDir=desc")
      .then((res) => setItems(res.data))
      .catch((err) => setError(toMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Invoices" description="Track invoice status and due dates.">
      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Loading invoices...</p>}
      {!loading && error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">No invoices yet.</p>}
      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((invoice) => (
                <tr key={invoice.id} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/invoices/${invoice.id}`} className="hover:text-[var(--color-accent-hover)]">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{invoice.clientName}</td>
                  <td className="px-4 py-3">{formatMoney(invoice.total, invoice.currency)}</td>
                  <td className="px-4 py-3 capitalize">{invoice.status}</td>
                  <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
