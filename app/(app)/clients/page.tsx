"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreVertical, Users, Edit, Trash2 } from "lucide-react";
import { requestJson, ApiClientError, toErrorMessage } from "../../_lib/api";
import { formatMoney, formatDate } from "../../_lib/format";
import { Button, IconButton } from "../../_components/Button";
import {
  Label,
  Input,
  Select,
  Textarea,
  FieldError,
  FormGroup,
} from "../../_components/FormField";
import { useToast } from "../../_components/Toast";
import { Modal } from "../../_components/Modal";
import { StatusBadge } from "../../_components/StatusBadge";
import { CURRENCIES } from "../../_lib/constants";

type ApiEnvelope<T> = { data: T };
type PaginatedEnvelope<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number };
};

interface Client {
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
  totalInvoiced?: number;
  totalOutstanding?: number;
  lastInvoiceDate?: string | null;
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

function clientToForm(client: Client): ClientForm {
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

function AddClientModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setErrors({});
      setSubmitError(null);
    }
  }, [open]);

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
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await requestJson<ApiEnvelope<Client>>("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToBody(form)),
      });
      toast("Client added.");
      onAdded();
      onClose();
    } catch (err) {
      setSubmitError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Client" maxWidth="max-w-2xl">
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
            Add Client
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditClientModal({
  open,
  client,
  onClose,
  onUpdated,
}: {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onUpdated: () => void;
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
      await requestJson<ApiEnvelope<Client>>(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToBody(form)),
      });
      toast("Client updated.");
      onUpdated();
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

function DeleteConfirmModal({
  open,
  client,
  onClose,
  onDeleted,
}: {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
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
      onDeleted(client.id);
      onClose();
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
        <p className="mt-3 text-sm" style={{ color: "var(--danger-fg)" }}>
          {deleteError}
        </p>
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

function RowMenu({
  client,
  onEdit,
  onDelete,
}: {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
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
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
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
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-primary)" }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit(client);
            }}
          >
            <Edit size={14} strokeWidth={1.5} />
            Edit
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--danger-fg)" }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete(client);
            }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

const LIMIT = 25;

export default function ClientsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (q) params.set("search", q);
      const res = await requestJson<PaginatedEnvelope<Client>>(`/api/clients?${params}`);
      setClients(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(search, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeout.current !== null) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      load(val, 1);
    }, 300);
  };

  const handleAdded = () => load(search, 1);
  const handleUpdated = () => load(search, page);
  const handleDeleted = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setTotal((prev) => prev - 1);
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
          Clients
        </h1>
        <Button size="md" onClick={() => setAddOpen(true)}>
          <Plus size={16} strokeWidth={1.5} />
          Add Client
        </Button>
      </div>

      <div className="mx-auto max-w-[1280px] px-8 py-8">
        {/* Search toolbar */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search
              size={16}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="search"
              placeholder="Search clients..."
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
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded"
                  style={{ backgroundColor: "var(--bg-elevated)" }}
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: "var(--danger-fg)" }}>
                {error}
              </p>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <Users size={40} strokeWidth={1} style={{ color: "var(--text-muted)" }} />
              {search ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  No clients match your search.
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
                      No clients yet.
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      Add your first client and start invoicing.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus size={14} strokeWidth={1.5} />
                    Add Client
                  </Button>
                </>
              )}
            </div>
          ) : (
            <table className="app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Total Invoiced</th>
                  <th>Outstanding</th>
                  <th>Last Invoice</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {client.name}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {client.company ?? "—"}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {client.email ?? "—"}
                    </td>
                    <td style={{ color: "var(--text-primary)" }}>
                      {client.totalInvoiced != null
                        ? formatMoney(client.totalInvoiced, client.currency)
                        : "—"}
                    </td>
                    <td
                      style={{
                        color:
                          client.totalOutstanding && client.totalOutstanding > 0
                            ? "var(--danger-fg)"
                            : "var(--text-primary)",
                        fontWeight:
                          client.totalOutstanding && client.totalOutstanding > 0 ? 500 : undefined,
                      }}
                    >
                      {client.totalOutstanding != null
                        ? formatMoney(client.totalOutstanding, client.currency)
                        : "—"}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {client.lastInvoiceDate ? formatDate(client.lastInvoiceDate) : "—"}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        client={client}
                        onEdit={(c) => setEditClient(c)}
                        onDelete={(c) => setDeleteClient(c)}
                      />
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

      {/* Modals */}
      <AddClientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleAdded}
      />
      <EditClientModal
        open={editClient !== null}
        client={editClient}
        onClose={() => setEditClient(null)}
        onUpdated={handleUpdated}
      />
      <DeleteConfirmModal
        open={deleteClient !== null}
        client={deleteClient}
        onClose={() => setDeleteClient(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
