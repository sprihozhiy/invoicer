"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Plus, Trash2, AlertCircle } from "lucide-react";
import { requestJson, ApiClientError, toErrorMessage } from "../../../_lib/api";
import { formatMoney, formatDate } from "../../../_lib/format";
import { Button } from "../../../_components/Button";
import {
  Label,
  Input,
  Select,
  Textarea,
  FieldError,
  FormGroup,
} from "../../../_components/FormField";
import { useToast } from "../../../_components/Toast";
import { Modal } from "../../../_components/Modal";
import { StatusBadge } from "../../../_components/StatusBadge";
import { CURRENCIES } from "../../../_lib/constants";

type ApiEnvelope<T> = { data: T };
type PaginatedEnvelope<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number };
};

interface ClientWithStats {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    country: string;
  } | null;
  currency: string;
  notes: string | null;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  lastInvoiceDate: string | null;
  createdAt: string;
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: "draft" | "sent" | "partial" | "paid" | "overdue" | "void";
  total: number;
  amountDue: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  createdAt: string;
}

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  currency: string;
  notes: string;
}

const EMPTY_FORM: ClientForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  currency: "USD",
  notes: "",
};

function clientToForm(client: ClientWithStats): ClientForm {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    company: client.company ?? "",
    addressLine1: client.address?.line1 ?? "",
    addressLine2: client.address?.line2 ?? "",
    city: client.address?.city ?? "",
    state: client.address?.state ?? "",
    postalCode: client.address?.postalCode ?? "",
    country: client.address?.country ?? "",
    currency: client.currency,
    notes: client.notes ?? "",
  };
}

function formToBody(form: ClientForm) {
  return {
    name: form.name,
    email: form.email || null,
    phone: form.phone || null,
    company: form.company || null,
    address:
      form.addressLine1 || form.city || form.country
        ? {
            line1: form.addressLine1,
            line2: form.addressLine2 || null,
            city: form.city,
            state: form.state || null,
            postalCode: form.postalCode || null,
            country: form.country,
          }
        : null,
    currency: form.currency,
    notes: form.notes || null,
  };
}

function ClientFormFields({
  form,
  errors,
  onChange,
  disabled,
}: {
  form: ClientForm;
  errors: Partial<Record<keyof ClientForm, string>>;
  onChange: (field: keyof ClientForm, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FormGroup>
        <Label htmlFor="cf-name" required>
          Name
        </Label>
        <Input
          id="cf-name"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Client name"
          disabled={disabled}
          error={errors.name}
        />
        <FieldError message={errors.name} />
      </FormGroup>

      <div className="grid grid-cols-2 gap-4">
        <FormGroup>
          <Label htmlFor="cf-email">Email</Label>
          <Input
            id="cf-email"
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="email@example.com"
            disabled={disabled}
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="cf-phone">Phone</Label>
          <Input
            id="cf-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="+1 555 000 0000"
            disabled={disabled}
          />
        </FormGroup>
      </div>

      <FormGroup>
        <Label htmlFor="cf-company">Company</Label>
        <Input
          id="cf-company"
          value={form.company}
          onChange={(e) => onChange("company", e.target.value)}
          placeholder="Company name"
          disabled={disabled}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="cf-addr1">Address</Label>
        <Input
          id="cf-addr1"
          value={form.addressLine1}
          onChange={(e) => onChange("addressLine1", e.target.value)}
          placeholder="Street address"
          disabled={disabled}
          className="mb-2"
        />
        <Input
          value={form.addressLine2}
          onChange={(e) => onChange("addressLine2", e.target.value)}
          placeholder="Address line 2 (optional)"
          disabled={disabled}
        />
      </FormGroup>

      <div className="grid grid-cols-2 gap-4">
        <FormGroup>
          <Label htmlFor="cf-city">City</Label>
          <Input
            id="cf-city"
            value={form.city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder="City"
            disabled={disabled}
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="cf-state">State / Region</Label>
          <Input
            id="cf-state"
            value={form.state}
            onChange={(e) => onChange("state", e.target.value)}
            placeholder="State or region"
            disabled={disabled}
          />
        </FormGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormGroup>
          <Label htmlFor="cf-postal">Postal Code</Label>
          <Input
            id="cf-postal"
            value={form.postalCode}
            onChange={(e) => onChange("postalCode", e.target.value)}
            placeholder="Postal code"
            disabled={disabled}
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="cf-country">Country</Label>
          <Input
            id="cf-country"
            value={form.country}
            onChange={(e) => onChange("country", e.target.value)}
            placeholder="Country"
            disabled={disabled}
          />
        </FormGroup>
      </div>

      <FormGroup>
        <Label htmlFor="cf-currency">Currency</Label>
        <Select
          id="cf-currency"
          value={form.currency}
          onChange={(e) => onChange("currency", e.target.value)}
          disabled={disabled}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="cf-notes">Notes</Label>
        <Textarea
          id="cf-notes"
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Internal notes (optional)"
          rows={3}
          disabled={disabled}
        />
      </FormGroup>
    </>
  );
}

function EditClientModal({
  open,
  client,
  onClose,
  onUpdated,
}: {
  open: boolean;
  client: ClientWithStats | null;
  onClose: () => void;
  onUpdated: (updated: ClientWithStats) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open && client) {
      setForm(clientToForm(client));
      setErrors({});
      setSubmitError(null);
    }
  }, [open, client]);

  const handleChange = (field: keyof ClientForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ClientForm, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const res = await requestJson<ApiEnvelope<ClientWithStats>>(
        `/api/clients/${client.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formToBody(form)),
        },
      );
      toast("Client updated.");
      onUpdated(res.data);
      onClose();
    } catch (err) {
      setSubmitError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Client" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ClientFormFields
            form={form}
            errors={errors}
            onChange={handleChange}
            disabled={saving}
          />
        </div>
        {submitError && (
          <p className="mt-3 text-sm" style={{ color: "var(--danger-fg)" }}>
            {submitError}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteClientModal({
  open,
  client,
  onClose,
  onDeleted,
}: {
  open: boolean;
  client: ClientWithStats | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setDeleteError(null);
  }, [open]);

  const handleDelete = async () => {
    if (!client) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await requestJson(`/api/clients/${client.id}`, { method: "DELETE" });
      toast("Client deleted.");
      onDeleted();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CLIENT_HAS_INVOICES") {
        setDeleteError("This client has existing invoices and cannot be deleted.");
      } else {
        setDeleteError(toErrorMessage(err));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete this client?">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        This action cannot be undone.
      </p>
      {deleteError && (
        <div
          className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--danger-bg)",
            borderColor: "var(--danger-fg)",
            color: "var(--danger-fg)",
          }}
        >
          <AlertCircle size={14} strokeWidth={1.5} className="flex-shrink-0" />
          {deleteError}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button type="button" variant="danger" loading={deleting} onClick={handleDelete}>
          Delete Client
        </Button>
      </div>
    </Modal>
  );
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

function formatAddress(
  address: ClientWithStats["address"],
): string | null {
  if (!address) return null;
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.join(", ") || null;
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<ClientWithStats | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadClient = useCallback(async () => {
    setLoadingClient(true);
    setClientError(null);
    try {
      const res = await requestJson<ApiEnvelope<ClientWithStats>>(`/api/clients/${id}`);
      setClient(res.data);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setNotFound(true);
      } else {
        setClientError(toErrorMessage(err));
      }
    } finally {
      setLoadingClient(false);
    }
  }, [id]);

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await requestJson<PaginatedEnvelope<InvoiceSummary>>(
        `/api/clients/${id}/invoices?page=1&limit=50`,
      );
      setInvoices(res.data);
    } catch {
      // Non-fatal; show empty state
    } finally {
      setLoadingInvoices(false);
    }
  }, [id]);

  useEffect(() => {
    loadClient();
    loadInvoices();
  }, [loadClient, loadInvoices]);

  const filteredInvoices = statusFilter
    ? invoices.filter((inv) => inv.status === statusFilter)
    : invoices;

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 px-8 py-24 text-center">
        <p className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Client not found.
        </p>
        <Link href="/clients">
          <Button variant="secondary" size="sm">
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back to Clients
          </Button>
        </Link>
      </div>
    );
  }

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
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--text-primary)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            Clients
          </Link>
          {loadingClient ? (
            <div
              className="h-8 w-40 animate-pulse rounded"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            />
          ) : (
            <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {client?.name}
            </h1>
          )}
        </div>
        {client && (
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="md" onClick={() => setEditOpen(true)}>
              <Edit size={15} strokeWidth={1.5} />
              Edit
            </Button>
            <Link href={`/invoices/new?clientId=${client.id}`}>
              <Button size="md">
                <Plus size={15} strokeWidth={1.5} />
                New Invoice
              </Button>
            </Link>
            <Button variant="danger" size="md" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={15} strokeWidth={1.5} />
              Delete
            </Button>
          </div>
        )}
      </div>

      {clientError && (
        <div className="mx-auto max-w-[1280px] px-8 pt-6">
          <div
            className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--danger-bg)",
              borderColor: "var(--danger-fg)",
              color: "var(--danger-fg)",
            }}
          >
            <AlertCircle size={16} strokeWidth={1.5} />
            {clientError}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1280px] px-8 py-8">
        {loadingClient ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl"
                style={{ backgroundColor: "var(--bg-elevated)" }}
              />
            ))}
          </div>
        ) : client ? (
          <>
            {/* Two-column: Profile + Financials */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Client Profile card */}
              <div
                className="rounded-2xl border p-6"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-primary)",
                }}
              >
                <h2 className="mb-5 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Client Profile
                </h2>
                <dl className="space-y-4">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <dt className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Name
                    </dt>
                    <dd className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {client.name}
                    </dd>
                  </div>
                  {client.company && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Company
                      </dt>
                      <dd className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {client.company}
                      </dd>
                    </div>
                  )}
                  {client.email && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Email
                      </dt>
                      <dd className="text-sm">
                        <a
                          href={`mailto:${client.email}`}
                          className="hover:underline"
                          style={{ color: "var(--accent-primary)" }}
                        >
                          {client.email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {client.phone && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Phone
                      </dt>
                      <dd className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {client.phone}
                      </dd>
                    </div>
                  )}
                  {client.address && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Address
                      </dt>
                      <dd className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {formatAddress(client.address)}
                      </dd>
                    </div>
                  )}
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <dt className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Currency
                    </dt>
                    <dd className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {client.currency}
                    </dd>
                  </div>
                  {client.notes && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Notes
                      </dt>
                      <dd
                        className="text-sm whitespace-pre-wrap"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {client.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Financial Summary card */}
              <div
                className="rounded-2xl border p-6"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-primary)",
                }}
              >
                <h2
                  className="mb-5 text-base font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Financial Summary
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Total Invoiced
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {formatMoney(client.totalInvoiced, client.currency)}
                    </span>
                  </div>
                  <div
                    className="border-t"
                    style={{ borderColor: "var(--border-primary)" }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Total Paid
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--success-fg)" }}
                    >
                      {formatMoney(client.totalPaid, client.currency)}
                    </span>
                  </div>
                  <div
                    className="border-t"
                    style={{ borderColor: "var(--border-primary)" }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Balance Due
                    </span>
                    <span
                      className={client.totalOutstanding > 0 ? "text-base font-bold" : "text-sm font-medium"}
                      style={{
                        color:
                          client.totalOutstanding > 0
                            ? "var(--danger-fg)"
                            : "var(--text-primary)",
                      }}
                    >
                      {formatMoney(client.totalOutstanding, client.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice History section */}
            <div className="mt-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  Invoice History
                </h2>
                {/* Status filter pills */}
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor:
                          statusFilter === f.value
                            ? "var(--accent-primary)"
                            : "var(--bg-elevated)",
                        borderColor:
                          statusFilter === f.value
                            ? "var(--accent-primary)"
                            : "var(--border-primary)",
                        color: statusFilter === f.value ? "#fff" : "var(--text-secondary)",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="rounded-2xl border"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-primary)",
                  overflow: "hidden",
                }}
              >
                {loadingInvoices ? (
                  <div className="space-y-3 p-6">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-10 animate-pulse rounded"
                        style={{ backgroundColor: "var(--bg-elevated)" }}
                      />
                    ))}
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                    {statusFilter ? (
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        No invoices match this status.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          No invoices for this client yet.
                        </p>
                        <Link href={`/invoices/new?clientId=${client.id}`}>
                          <Button size="sm">
                            <Plus size={14} strokeWidth={1.5} />
                            Create Invoice
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                ) : (
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Modals */}
      {client && (
        <>
          <EditClientModal
            open={editOpen}
            client={client}
            onClose={() => setEditOpen(false)}
            onUpdated={(updated) => {
              setClient(updated);
              setEditOpen(false);
            }}
          />
          <DeleteClientModal
            open={deleteOpen}
            client={client}
            onClose={() => setDeleteOpen(false)}
            onDeleted={() => router.push("/clients")}
          />
        </>
      )}
    </div>
  );
}
