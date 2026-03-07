"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { EmptyState, Modal, PageError, PageLoader, StatusBadge } from "@/components/ui";
import { ApiClientError, ApiEnvelope, ClientWithStats, InvoiceSummary, PaginatedEnvelope, STATUS_OPTIONS, apiRequest, formatCurrency, formatDate } from "@/lib/client";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientWithStats | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [status, setStatus] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientRes, invoiceRes] = await Promise.all([
        apiRequest<ApiEnvelope<ClientWithStats>>(`/api/clients/${params.id}`),
        apiRequest<PaginatedEnvelope<InvoiceSummary>>(`/api/clients/${params.id}/invoices?page=1&limit=50${status ? `&status=${status}` : ""}`),
      ]);
      setClient(clientRes.data);
      setInvoices(invoiceRes.data);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setError("Client not found.");
      } else {
        setError("Something went wrong on our end. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [params.id, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function removeClient() {
    try {
      await apiRequest<{ success: true }>(`/api/clients/${params.id}`, { method: "DELETE" });
      pushToast("Client deleted.");
      router.push("/clients");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CLIENT_HAS_INVOICES") {
        pushToast("This client has existing invoices and cannot be deleted.", "error");
      } else {
        pushToast("Something went wrong. Try again.", "error");
      }
    }
  }

  if (loading) return <AppShell title="Client"><PageLoader /></AppShell>;
  if (error) return <AppShell title="Client"><PageError message={error} onRetry={load} /></AppShell>;
  if (!client) return null;

  return (
    <AppShell
      title={client.name}
      action={
        <div className="flex gap-2">
          <Link href={`/invoices/new?clientId=${client.id}`} className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium">New Invoice</Link>
          <button className="rounded-lg border border-[#EF4444] px-4 py-2 text-sm text-[#EF4444]" onClick={() => setDeleteOpen(true)}>Delete</button>
        </div>
      }
    >
      <section className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
        <h2 className="text-2xl font-semibold">Client Profile</h2>
        <div className="mt-4 grid gap-3 text-sm text-[#A0A0A0] md:grid-cols-2">
          <p><span className="text-[#F5F5F5]">Name:</span> {client.name}</p>
          <p><span className="text-[#F5F5F5]">Company:</span> {client.company || "—"}</p>
          <p><span className="text-[#F5F5F5]">Email:</span> {client.email || "—"}</p>
          <p><span className="text-[#F5F5F5]">Phone:</span> {client.phone || "—"}</p>
          <p><span className="text-[#F5F5F5]">Address:</span> {client.address?.line1 || "—"}</p>
          <p><span className="text-[#F5F5F5]">Currency:</span> {client.currency}</p>
          <p className="md:col-span-2"><span className="text-[#F5F5F5]">Notes:</span> {client.notes || "—"}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6"><p className="text-sm text-[#A0A0A0]">Total Invoiced</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(client.totalInvoiced, client.currency)}</p></div>
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6"><p className="text-sm text-[#A0A0A0]">Total Paid</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(client.totalPaid, client.currency)}</p></div>
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6"><p className="text-sm text-[#A0A0A0]">Balance Due</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(client.totalOutstanding, client.currency)}</p></div>
      </section>

      <section className="mt-8 rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Invoice History</h2>
          <select className="rounded-lg border border-[#2E2E2E] bg-[#242424] px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        {invoices.length === 0 ? (
          <EmptyState title="No invoices for this client yet." action={<Link href={`/invoices/new?clientId=${client.id}`} className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm">Create Invoice</Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px]">
              <thead>
                <tr className="border-b border-[#2E2E2E] text-left text-xs uppercase text-[#A0A0A0]">
                  <th className="py-3">Invoice #</th><th className="py-3">Issue Date</th><th className="py-3">Due Date</th><th className="py-3">Amount</th><th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[#2E2E2E] text-sm">
                    <td className="py-3"><Link href={`/invoices/${invoice.id}`} className="text-[#6366F1] hover:text-[#818CF8]">{invoice.invoiceNumber}</Link></td>
                    <td className="py-3">{formatDate(invoice.issueDate)}</td>
                    <td className="py-3">{formatDate(invoice.dueDate)}</td>
                    <td className="py-3">{formatCurrency(invoice.total, invoice.currency)}</td>
                    <td className="py-3"><StatusBadge status={invoice.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this client?">
        <p className="text-sm text-[#A0A0A0]">This action cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-[#2E2E2E] px-4 py-2 text-sm" onClick={() => setDeleteOpen(false)}>Cancel</button>
          <button type="button" className="rounded-lg border border-[#EF4444] px-4 py-2 text-sm text-[#EF4444]" onClick={removeClient}>Delete Client</button>
        </div>
      </Modal>
    </AppShell>
  );
}
