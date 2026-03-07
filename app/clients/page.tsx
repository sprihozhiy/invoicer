"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { EmptyState, Modal, PageError, PageLoader } from "@/components/ui";
import { ApiEnvelope, ApiClientError, Client, ClientWithStats, CURRENCY_OPTIONS, PaginatedEnvelope, apiRequest, formatCurrency, formatDate } from "@/lib/client";

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  currency: string;
  notes: string;
};

const EMPTY_FORM: ClientForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  currency: "USD",
  notes: "",
};

export default function ClientsPage() {
  const { pushToast } = useToast();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ClientWithStats[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientWithStats | null>(null);
  const [editing, setEditing] = useState<ClientWithStats | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const hasSearch = useMemo(() => search.trim().length > 0, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiRequest<PaginatedEnvelope<Client>>(`/api/clients?page=1&limit=50&search=${encodeURIComponent(search)}`);
      const full = await Promise.all(
        list.data.map(async (item) => {
          const detail = await apiRequest<ApiEnvelope<ClientWithStats>>(`/api/clients/${item.id}`);
          return detail.data;
        }),
      );
      setRows(full);
    } catch {
      setError("Something went wrong on our end. Try again.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(client: ClientWithStats) {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      company: client.company ?? "",
      line1: client.address?.line1 ?? "",
      line2: client.address?.line2 ?? "",
      city: client.address?.city ?? "",
      state: client.address?.state ?? "",
      postalCode: client.address?.postalCode ?? "",
      country: client.address?.country ?? "US",
      currency: client.currency,
      notes: client.notes ?? "",
    });
    setModalOpen(true);
  }

  async function submitClient(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        address: form.line1 && form.city ? { line1: form.line1, line2: form.line2 || null, city: form.city, state: form.state || null, postalCode: form.postalCode || null, country: form.country || "US" } : null,
        currency: form.currency,
        notes: form.notes || null,
      };

      if (editing) {
        await apiRequest<ApiEnvelope<Client>>(`/api/clients/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        pushToast("Client updated.");
      } else {
        await apiRequest<ApiEnvelope<Client>>("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        pushToast("Client added.");
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      if (err instanceof ApiClientError && err.field === "name") {
        setError("Client name is required.");
      } else {
        setError("Failed to save. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient() {
    if (!deleteTarget) return;
    try {
      await apiRequest<{ success: true }>(`/api/clients/${deleteTarget.id}`, { method: "DELETE" });
      pushToast("Client deleted.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CLIENT_HAS_INVOICES") {
        setError("This client has existing invoices and cannot be deleted.");
      } else {
        setError("Something went wrong. Try again.");
      }
      setDeleteTarget(null);
    }
  }

  return (
    <AppShell
      title="Clients"
      action={<button className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium" onClick={openAdd}><Plus size={16} /> Add Client</button>}
    >
      <div className="mb-6">
        <input className="w-full max-w-[360px] rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" placeholder="Search clients..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      {loading ? <PageLoader /> : null}
      {error ? <PageError message={error} onRetry={load} /> : null}

      {!loading && !error && rows.length === 0 && !hasSearch ? (
        <EmptyState title="No clients yet." body="Add your first client and start invoicing." action={<button onClick={openAdd} className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium">Add Client</button>} />
      ) : null}

      {!loading && !error && rows.length === 0 && hasSearch ? <p className="text-sm text-[#A0A0A0]">No clients match your search.</p> : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-[#2E2E2E] text-left text-xs uppercase text-[#A0A0A0]">
                  <th className="py-3">Name</th><th className="py-3">Company</th><th className="py-3">Email</th><th className="py-3">Total Invoiced</th><th className="py-3">Outstanding</th><th className="py-3">Last Invoice</th><th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#2E2E2E] text-sm">
                    <td className="py-3"><Link href={`/clients/${row.id}`} className="text-[#6366F1] hover:text-[#818CF8]">{row.name}</Link></td>
                    <td className="py-3">{row.company || "—"}</td>
                    <td className="py-3">{row.email || "—"}</td>
                    <td className="py-3">{formatCurrency(row.totalInvoiced, row.currency)}</td>
                    <td className="py-3">{formatCurrency(row.totalOutstanding, row.currency)}</td>
                    <td className="py-3">{row.lastInvoiceDate ? formatDate(row.lastInvoiceDate) : "—"}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button className="rounded-md border border-[#2E2E2E] p-1 text-[#A0A0A0]" onClick={() => openEdit(row)}><Pencil size={14} /></button>
                        <button className="rounded-md border border-[#EF4444] p-1 text-[#EF4444]" onClick={() => setDeleteTarget(row)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Modal open={modalOpen} title={editing ? "Edit Client" : "Add Client"} onClose={() => setModalOpen(false)}>
        <form className="space-y-3" onSubmit={submitClient}>
          <label className="block text-xs text-[#A0A0A0]">Full Name<input required className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="Jane Smith" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></label>
          <label className="block text-xs text-[#A0A0A0]">Email Address<input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="jane@company.com" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} /></label>
          <label className="block text-xs text-[#A0A0A0]">Phone<input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="+1 555 000 0000" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} /></label>
          <label className="block text-xs text-[#A0A0A0]">Company<input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="Acme Corp" value={form.company} onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))} /></label>
          <label className="block text-xs text-[#A0A0A0]">Address<input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="123 Main St" value={form.line1} onChange={(event) => setForm((prev) => ({ ...prev, line1: event.target.value }))} /></label>
          <label className="block text-xs text-[#A0A0A0]">Suite / Unit<input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="Apt 4B" value={form.line2} onChange={(event) => setForm((prev) => ({ ...prev, line2: event.target.value }))} /></label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs text-[#A0A0A0]">City<input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="New York" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} /></label>
            <label className="block text-xs text-[#A0A0A0]">State / Region<input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="NY" value={form.state} onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))} /></label>
            <label className="block text-xs text-[#A0A0A0]">Postal Code<input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="10001" value={form.postalCode} onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))} /></label>
            <label className="block text-xs text-[#A0A0A0]">Country<select className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}><option value="US">United States</option><option value="CA">Canada</option></select></label>
            <label className="block text-xs text-[#A0A0A0]">Currency<select className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}>{CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          </div>
          <label className="block text-xs text-[#A0A0A0]">Notes<textarea className="mt-2 min-h-[90px] w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="Private notes about this client" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /></label>
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg border border-[#2E2E2E] px-4 py-2 text-sm" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Save Client"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} title="Delete this client?" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-[#A0A0A0]">This action cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-[#2E2E2E] px-4 py-2 text-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button type="button" className="rounded-lg border border-[#EF4444] px-4 py-2 text-sm text-[#EF4444]" onClick={deleteClient}>Delete Client</button>
        </div>
      </Modal>
    </AppShell>
  );
}
