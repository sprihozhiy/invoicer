"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Search,
  User,
  Building2,
  Mail,
} from "lucide-react";
import { requestJson, toErrorMessage } from "../../../_lib/api";
import { todayISO, addDaysToISO, centsToDisplay, parseCents } from "../../../_lib/format";
import { CURRENCIES } from "../../../_lib/constants";
import type { BusinessProfile, Client, CatalogItem, ApiEnvelope, PaginatedEnvelope } from "../../../_lib/types";
import { Button } from "../../../_components/Button";
import { Label, Input, Select, Textarea, FieldError, FormGroup } from "../../../_components/FormField";
import { useToast } from "../../../_components/Toast";
import { Modal } from "../../../_components/Modal";

// ── Local types ──────────────────────────────────────────────────────────────

interface LineItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
  catalogSuggestions: CatalogItem[];
  showSuggestions: boolean;
}

interface AddClientForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  currency: string;
  notes: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function newLineItem(): LineItemRow {
  return {
    id: Math.random().toString(36).slice(2),
    description: "",
    quantity: "1",
    unitPrice: "0.00",
    taxable: false,
    catalogSuggestions: [],
    showSuggestions: false,
  };
}

function calcRowAmount(row: LineItemRow): number {
  const qty = parseFloat(row.quantity) || 0;
  const price = parseCents(row.unitPrice);
  return Math.round(qty * price);
}

function formatDisplayAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ── AddClientModal ────────────────────────────────────────────────────────────

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (client: Client) => void;
}

const defaultClientForm = (): AddClientForm => ({
  name: "",
  email: "",
  phone: "",
  company: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  currency: "USD",
  notes: "",
});

function AddClientModal({ open, onClose, onSuccess }: AddClientModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<AddClientForm>(defaultClientForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AddClientForm, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(defaultClientForm());
      setError(null);
      setFieldErrors({});
    }
  }, [open]);

  const set = (field: keyof AddClientForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof AddClientForm, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        currency: form.currency || "USD",
      };
      if (form.email.trim()) body.email = form.email.trim();
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.company.trim()) body.company = form.company.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();
      if (form.addressLine1.trim() || form.city.trim() || form.country.trim()) {
        body.address = {
          line1: form.addressLine1.trim(),
          line2: null,
          city: form.city.trim(),
          state: form.state.trim() || null,
          postalCode: form.postalCode.trim() || null,
          country: form.country.trim(),
        };
      }
      const res = await requestJson<ApiEnvelope<Client>>("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast("Client added.");
      onSuccess(res.data);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Client" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit}>
        {error && (
          <div
            className="mb-5 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormGroup>
            <Label htmlFor="cn-name" required>Name</Label>
            <Input
              id="cn-name"
              value={form.name}
              onChange={set("name")}
              placeholder="Jane Smith"
              error={fieldErrors.name}
            />
            <FieldError message={fieldErrors.name} />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cn-company">Company</Label>
            <Input
              id="cn-company"
              value={form.company}
              onChange={set("company")}
              placeholder="Acme Corp"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cn-email">Email</Label>
            <Input
              id="cn-email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="jane@example.com"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cn-phone">Phone</Label>
            <Input
              id="cn-phone"
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+1 555 000 0000"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cn-addr1">Address</Label>
            <Input
              id="cn-addr1"
              value={form.addressLine1}
              onChange={set("addressLine1")}
              placeholder="123 Main St"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cn-city">City</Label>
            <Input
              id="cn-city"
              value={form.city}
              onChange={set("city")}
              placeholder="San Francisco"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cn-state">State / Province</Label>
            <Input
              id="cn-state"
              value={form.state}
              onChange={set("state")}
              placeholder="CA"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cn-postal">Postal Code</Label>
            <Input
              id="cn-postal"
              value={form.postalCode}
              onChange={set("postalCode")}
              placeholder="94102"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cn-country">Country</Label>
            <Input
              id="cn-country"
              value={form.country}
              onChange={set("country")}
              placeholder="US"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cn-currency">Currency</Label>
            <Select id="cn-currency" value={form.currency} onChange={set("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </FormGroup>
        </div>

        <FormGroup>
          <Label htmlFor="cn-notes">Notes</Label>
          <Textarea
            id="cn-notes"
            value={form.notes}
            onChange={set("notes")}
            rows={3}
            placeholder="Any additional notes about this client..."
          />
        </FormGroup>

        <div className="flex justify-end gap-3 pt-2">
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

// ── ClientCard ────────────────────────────────────────────────────────────────

function ClientCard({ client, onClear }: { client: Client; onClear: () => void }) {
  return (
    <div
      className="mt-3 flex items-start justify-between rounded-xl border p-4"
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-primary)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: "var(--bg-hover)" }}
        >
          <User size={16} strokeWidth={1.5} style={{ color: "var(--text-secondary)" }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {client.name}
          </p>
          {client.company && (
            <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              <Building2 size={11} strokeWidth={1.5} />
              {client.company}
            </p>
          )}
          {client.email && (
            <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <Mail size={11} strokeWidth={1.5} />
              {client.email}
            </p>
          )}
          <p className="mt-1 text-xs font-medium" style={{ color: "var(--accent-primary)" }}>
            {client.currency}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="rounded p-1 transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger-fg)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        aria-label="Remove client"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();

  // ── Header / meta ──────────────────────────────────────────────────────────
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceNumberLoading, setInvoiceNumberLoading] = useState(true);
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [currency, setCurrency] = useState("USD");

  // ── Profile ────────────────────────────────────────────────────────────────
  const [taxRate, setTaxRate] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");

  // ── Discount ───────────────────────────────────────────────────────────────
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("0");

  // ── Client ─────────────────────────────────────────────────────────────────
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  const clientSearchRef = useRef<HTMLDivElement>(null);
  const clientSearchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Line items ─────────────────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState<LineItemRow[]>([newLineItem()]);
  const [lineItemErrors, setLineItemErrors] = useState<Record<string, string>>({});

  const catalogTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lineItemDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── On mount: fetch next invoice number + profile ──────────────────────────
  useEffect(() => {
    async function loadInitial() {
      try {
        const [numRes, profileRes] = await Promise.all([
          requestJson<ApiEnvelope<{ invoiceNumber: string }>>("/api/invoices/next-number"),
          requestJson<ApiEnvelope<BusinessProfile>>("/api/profile"),
        ]);
        setInvoiceNumber(numRes.data.invoiceNumber);
        const profile = profileRes.data;
        setCurrency(profile.defaultCurrency || "USD");
        const taxRateVal = profile.defaultTaxRate ?? 0;
        setTaxRate(String(taxRateVal));
        const termsDays = profile.defaultPaymentTermsDays ?? 30;
        const today = todayISO();
        setIssueDate(today);
        setDueDate(addDaysToISO(today, termsDays));
        if (profile.defaultTerms) setPaymentTerms(profile.defaultTerms);
        if (profile.defaultNotes) setNotes(profile.defaultNotes);
      } catch (err) {
        toast(toErrorMessage(err), "error");
      } finally {
        setInvoiceNumberLoading(false);
      }
    }
    loadInitial();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close client dropdown on click outside ─────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!clientSearchRef.current?.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Close catalog dropdowns on click outside ───────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setLineItems((prev) =>
        prev.map((row) => {
          const ref = lineItemDropdownRefs.current[row.id];
          if (ref && !ref.contains(e.target as Node)) {
            return { ...row, showSuggestions: false };
          }
          return row;
        })
      );
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Client search ──────────────────────────────────────────────────────────
  const handleClientSearchChange = (val: string) => {
    setClientSearch(val);
    setShowClientDropdown(true);
    clearTimeout(clientSearchTimeout.current);
    if (!val.trim()) {
      setClientResults([]);
      setClientSearching(false);
      return;
    }
    setClientSearching(true);
    clientSearchTimeout.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: val, limit: "8" });
        const res = await requestJson<PaginatedEnvelope<Client>>(`/api/clients?${params}`);
        setClientResults(res.data);
      } catch {
        setClientResults([]);
      } finally {
        setClientSearching(false);
      }
    }, 300);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setCurrency(client.currency || currency);
    setClientSearch("");
    setClientResults([]);
    setShowClientDropdown(false);
    setClientError(null);
  };

  const handleClientAdded = (client: Client) => {
    handleSelectClient(client);
    setShowAddClientModal(false);
  };

  // ── Line item helpers ──────────────────────────────────────────────────────
  const updateLineItem = useCallback(
    (id: string, patch: Partial<LineItemRow>) => {
      setLineItems((prev) =>
        prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
      );
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (id: string, value: string) => {
      updateLineItem(id, { description: value, showSuggestions: value.trim().length > 0 });
      clearTimeout(catalogTimeouts.current[id]);
      if (!value.trim()) {
        updateLineItem(id, { catalogSuggestions: [], showSuggestions: false });
        return;
      }
      catalogTimeouts.current[id] = setTimeout(async () => {
        try {
          const params = new URLSearchParams({ search: value, limit: "6" });
          const res = await requestJson<PaginatedEnvelope<CatalogItem>>(
            `/api/catalog?${params}`
          );
          updateLineItem(id, { catalogSuggestions: res.data, showSuggestions: res.data.length > 0 });
        } catch {
          updateLineItem(id, { catalogSuggestions: [], showSuggestions: false });
        }
      }, 300);
    },
    [updateLineItem]
  );

  const handleSelectCatalogItem = useCallback(
    (rowId: string, item: CatalogItem) => {
      setLineItems((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                description: item.name,
                unitPrice: centsToDisplay(item.unitPrice),
                taxable: item.taxable,
                catalogSuggestions: [],
                showSuggestions: false,
              }
            : row
        )
      );
    },
    []
  );

  const addLineItem = () => {
    setLineItems((prev) => [...prev, newLineItem()]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((row) => row.id !== id));
  };

  const moveLineItem = (id: string, direction: "up" | "down") => {
    setLineItems((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  // ── Computed totals ────────────────────────────────────────────────────────
  const subtotalCents = lineItems.reduce((sum, row) => sum + calcRowAmount(row), 0);
  const taxRateNum = parseFloat(taxRate) || 0;
  const taxCents = Math.round(subtotalCents * taxRateNum / 100);

  const discountValueNum = parseFloat(discountValue) || 0;
  let discountCents = 0;
  if (discountType === "percentage") {
    discountCents = Math.round(subtotalCents * discountValueNum / 100);
  } else {
    discountCents = parseCents(discountValue);
  }
  const totalCents = Math.max(0, subtotalCents + taxCents - discountCents);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    let valid = true;
    setFormError(null);
    setClientError(null);
    setLineItemErrors({});

    if (!selectedClient) {
      setClientError("Select a client before saving.");
      valid = false;
    }

    if (lineItems.length === 0) {
      setFormError("At least one line item is required.");
      valid = false;
    }

    const rowErrs: Record<string, string> = {};
    lineItems.forEach((row) => {
      const qty = parseFloat(row.quantity);
      if (isNaN(qty) || qty <= 0) {
        rowErrs[row.id] = "Quantity must be greater than zero.";
        valid = false;
      } else {
        const price = parseCents(row.unitPrice);
        if (price < 0) {
          rowErrs[row.id] = "Unit price cannot be negative.";
          valid = false;
        }
      }
    });
    if (Object.keys(rowErrs).length) setLineItemErrors(rowErrs);

    return valid;
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        invoiceNumber,
        clientId: selectedClient!.id,
        issueDate,
        dueDate,
        lineItems: lineItems.map((row) => ({
          description: row.description,
          quantity: Math.round(parseFloat(row.quantity) || 1),
          unitPrice: parseCents(row.unitPrice),
          taxable: row.taxable,
        })),
        taxRate: taxRateNum,
        discountType,
        discountValue: discountType === "percentage"
          ? discountValueNum
          : parseCents(discountValue),
        notes: notes.trim() || null,
        paymentTerms: paymentTerms.trim() || null,
        currency,
      };
      const res = await requestJson<ApiEnvelope<{ id: string }>>("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast("Draft saved.");
      router.push(`/invoices/${res.data.id}`);
    } catch (err) {
      setFormError(toErrorMessage(err));
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
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
            href="/invoices"
            className="text-sm transition-colors hover:underline"
            style={{ color: "var(--text-secondary)" }}
          >
            Invoices
          </Link>
          <span style={{ color: "var(--text-muted)" }}>/</span>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
            New Invoice
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="secondary" size="md" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button size="md" loading={saving} onClick={handleSave}>
            Save as Draft
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[900px] px-6 py-8">
        {formError && (
          <div
            className="mb-6 rounded-xl border px-5 py-4 text-sm"
            style={{
              backgroundColor: "var(--danger-bg)",
              borderColor: "var(--danger-fg)",
              color: "var(--danger-fg)",
            }}
          >
            {formError}
          </div>
        )}

        {/* Card */}
        <div
          className="rounded-2xl border"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-primary)",
          }}
        >
          {/* ── Section: Invoice details ──────────────────────────────────── */}
          <div className="p-8">
            <h2
              className="mb-6 text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Invoice Details
            </h2>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              {/* Invoice Number */}
              <FormGroup>
                <Label htmlFor="inv-number">Invoice #</Label>
                {invoiceNumberLoading ? (
                  <div
                    className="h-11 animate-pulse rounded-lg"
                    style={{ backgroundColor: "var(--bg-elevated)" }}
                  />
                ) : (
                  <Input
                    id="inv-number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-001"
                  />
                )}
              </FormGroup>

              {/* Issue Date */}
              <FormGroup>
                <Label htmlFor="inv-issue-date">Issue Date</Label>
                <Input
                  id="inv-issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </FormGroup>

              {/* Due Date */}
              <FormGroup>
                <Label htmlFor="inv-due-date">Due Date</Label>
                <Input
                  id="inv-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </FormGroup>

              {/* Currency */}
              <FormGroup>
                <Label htmlFor="inv-currency">Currency</Label>
                <Select
                  id="inv-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </FormGroup>
            </div>
          </div>

          <hr style={{ borderColor: "var(--border-primary)" }} />

          {/* ── Section: Client ───────────────────────────────────────────── */}
          <div className="p-8">
            <h2
              className="mb-6 text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Client
            </h2>

            {selectedClient ? (
              <ClientCard client={selectedClient} onClear={() => setSelectedClient(null)} />
            ) : (
              <>
                {/* Client search */}
                <div ref={clientSearchRef} className="relative">
                  <div className="relative">
                    <Search
                      size={16}
                      strokeWidth={1.5}
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <input
                      type="search"
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => handleClientSearchChange(e.target.value)}
                      onFocus={() => {
                        if (clientSearch.trim()) setShowClientDropdown(true);
                      }}
                      className="block w-full rounded-lg border py-3 pl-9 pr-4 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        borderColor: clientError ? "var(--danger-fg)" : "var(--border-primary)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  {/* Dropdown */}
                  {showClientDropdown && (clientSearch.trim().length > 0) && (
                    <div
                      className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border py-1 shadow-xl"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        borderColor: "var(--border-primary)",
                      }}
                    >
                      {clientSearching ? (
                        <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                          Searching...
                        </div>
                      ) : clientResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                          No clients found.
                        </div>
                      ) : (
                        clientResults.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                          >
                            <div
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: "var(--bg-hover)" }}
                            >
                              <User size={14} strokeWidth={1.5} style={{ color: "var(--text-secondary)" }} />
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                {client.name}
                              </p>
                              {client.company && (
                                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                  {client.company}
                                </p>
                              )}
                              {client.email && (
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                  {client.email}
                                </p>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {clientError && <FieldError message={clientError} />}

                <button
                  type="button"
                  onClick={() => setShowAddClientModal(true)}
                  className="mt-3 text-sm transition-colors hover:underline"
                  style={{ color: "var(--accent-primary)" }}
                >
                  + Add new client
                </button>
              </>
            )}

            {selectedClient && clientError && <FieldError message={clientError} />}
          </div>

          <hr style={{ borderColor: "var(--border-primary)" }} />

          {/* ── Section: Line Items ───────────────────────────────────────── */}
          <div className="p-8">
            <h2
              className="mb-6 text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Line Items
            </h2>

            {/* Table header */}
            <div
              className="mb-2 grid items-center gap-2 px-2 text-xs font-medium uppercase tracking-wider"
              style={{
                color: "var(--text-muted)",
                gridTemplateColumns: "1fr 72px 100px 56px 88px 64px 56px",
              }}
            >
              <span>Description</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-center">Tax</span>
              <span className="text-right">Amount</span>
              <span></span>
              <span></span>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {lineItems.map((row, idx) => (
                <div key={row.id}>
                  <div
                    className="grid items-center gap-2 rounded-xl border px-2 py-2"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: lineItemErrors[row.id] ? "var(--danger-fg)" : "var(--border-primary)",
                      gridTemplateColumns: "1fr 72px 100px 56px 88px 64px 56px",
                    }}
                  >
                    {/* Description + catalog suggestions */}
                    <div
                      className="relative"
                      ref={(el) => { lineItemDropdownRefs.current[row.id] = el; }}
                    >
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => handleDescriptionChange(row.id, e.target.value)}
                        placeholder="Item description..."
                        className="block w-full rounded-lg border-0 bg-transparent px-2 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                        style={{ color: "var(--text-primary)" }}
                      />
                      {row.showSuggestions && row.catalogSuggestions.length > 0 && (
                        <div
                          className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border py-1 shadow-xl"
                          style={{
                            backgroundColor: "var(--bg-elevated)",
                            borderColor: "var(--border-primary)",
                          }}
                        >
                          {row.catalogSuggestions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectCatalogItem(row.id, item);
                              }}
                              className="flex w-full items-start justify-between px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
                            >
                              <div>
                                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                  {item.name}
                                </p>
                                {item.description && (
                                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <span className="ml-4 flex-shrink-0 text-xs font-medium" style={{ color: "var(--accent-primary)" }}>
                                {centsToDisplay(item.unitPrice)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Qty */}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.quantity}
                      onChange={(e) => updateLineItem(row.id, { quantity: e.target.value })}
                      className="block w-full rounded-lg border-0 bg-transparent px-2 py-2 text-center text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                      style={{ color: "var(--text-primary)" }}
                    />

                    {/* Unit Price */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.unitPrice}
                      onChange={(e) => updateLineItem(row.id, { unitPrice: e.target.value })}
                      className="block w-full rounded-lg border-0 bg-transparent px-2 py-2 text-right text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                      style={{ color: "var(--text-primary)" }}
                    />

                    {/* Taxable */}
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={row.taxable}
                        onChange={(e) => updateLineItem(row.id, { taxable: e.target.checked })}
                        className="h-4 w-4 rounded cursor-pointer accent-[var(--accent-primary)]"
                      />
                    </div>

                    {/* Amount */}
                    <span
                      className="block text-right text-sm font-medium tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatDisplayAmount(calcRowAmount(row))}
                    </span>

                    {/* Reorder */}
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => moveLineItem(row.id, "up")}
                        disabled={idx === 0}
                        className="rounded p-0.5 transition-colors disabled:opacity-20"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { if (idx !== 0) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                        aria-label="Move up"
                      >
                        <ChevronUp size={14} strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLineItem(row.id, "down")}
                        disabled={idx === lineItems.length - 1}
                        className="rounded p-0.5 transition-colors disabled:opacity-20"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { if (idx !== lineItems.length - 1) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                        aria-label="Move down"
                      >
                        <ChevronDown size={14} strokeWidth={1.5} />
                      </button>
                    </div>

                    {/* Remove */}
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(row.id)}
                        className="rounded p-1 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger-fg)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                        aria-label="Remove line item"
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {lineItemErrors[row.id] && (
                    <p className="mt-1 px-3 text-xs" style={{ color: "var(--danger-fg)" }}>
                      {lineItemErrors[row.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Add line item */}
            <button
              type="button"
              onClick={addLineItem}
              className="mt-4 flex items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              <Plus size={14} strokeWidth={1.5} />
              Add line item
            </button>

            {/* Totals */}
            <div className="mt-8 flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                  <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {formatDisplayAmount(subtotalCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Tax ({taxRateNum}%)</span>
                  <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {formatDisplayAmount(taxCents)}
                  </span>
                </div>
                {discountCents > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Discount{discountType === "percentage" ? ` (${discountValueNum}%)` : ""}
                    </span>
                    <span className="tabular-nums" style={{ color: "var(--danger-fg)" }}>
                      -{formatDisplayAmount(discountCents)}
                    </span>
                  </div>
                )}
                <div
                  className="flex items-center justify-between border-t pt-3"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
                  <span className="text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {currency} {formatDisplayAmount(totalCents)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <hr style={{ borderColor: "var(--border-primary)" }} />

          {/* ── Section: Additional Details ───────────────────────────────── */}
          <div className="p-8">
            <h2
              className="mb-6 text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Additional Details
            </h2>

            <div className="grid grid-cols-2 gap-x-6 gap-y-0">
              {/* Tax Rate */}
              <FormGroup>
                <Label htmlFor="inv-tax-rate">Tax Rate (%)</Label>
                <Input
                  id="inv-tax-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="0"
                />
              </FormGroup>

              {/* Discount */}
              <FormGroup>
                <Label htmlFor="inv-discount">Discount</Label>
                <div className="flex gap-2">
                  <Input
                    id="inv-discount"
                    type="number"
                    min="0"
                    step={discountType === "percentage" ? "0.01" : "0.01"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                    className="flex-1"
                  />
                  {/* Discount type toggle */}
                  <div
                    className="flex rounded-lg border overflow-hidden flex-shrink-0"
                    style={{ borderColor: "var(--border-primary)" }}
                  >
                    <button
                      type="button"
                      onClick={() => setDiscountType("percentage")}
                      className="px-3 py-2 text-sm transition-colors"
                      style={{
                        backgroundColor: discountType === "percentage" ? "var(--accent-primary)" : "var(--bg-elevated)",
                        color: discountType === "percentage" ? "#fff" : "var(--text-secondary)",
                      }}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className="px-3 py-2 text-sm transition-colors"
                      style={{
                        backgroundColor: discountType === "fixed" ? "var(--accent-primary)" : "var(--bg-elevated)",
                        color: discountType === "fixed" ? "#fff" : "var(--text-secondary)",
                      }}
                    >
                      $
                    </button>
                  </div>
                </div>
              </FormGroup>

              {/* Payment Terms */}
              <FormGroup>
                <Label htmlFor="inv-payment-terms">Payment Terms</Label>
                <Input
                  id="inv-payment-terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Payment due within 30 days"
                />
              </FormGroup>
            </div>

            {/* Notes */}
            <FormGroup>
              <Label htmlFor="inv-notes">Notes</Label>
              <Textarea
                id="inv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add payment instructions, thank-you notes, or other details"
              />
            </FormGroup>
          </div>

          {/* ── Footer actions ────────────────────────────────────────────── */}
          <div
            className="flex justify-end gap-3 rounded-b-2xl px-8 py-5"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderTop: "1px solid var(--border-primary)",
            }}
          >
            <Link href="/invoices">
              <Button variant="secondary" size="md" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button size="md" loading={saving} onClick={handleSave}>
              Save as Draft
            </Button>
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        open={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onSuccess={handleClientAdded}
      />
    </>
  );
}
