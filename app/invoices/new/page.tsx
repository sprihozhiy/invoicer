"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { EmptyState, PageError, PageLoader } from "@/components/ui";
import {
  ApiEnvelope,
  Client,
  CatalogItem,
  CURRENCY_OPTIONS,
  addDays,
  apiRequest,
  formatCurrency,
  todayDateInput,
  uiErrorMessage,
} from "@/lib/client";

type LineDraft = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
};

function toCents(value: string): number {
  const n = Number(value || "0");
  return Math.round(n * 100);
}

function fromCents(value: number): string {
  return (value / 100).toFixed(2);
}

export default function InvoiceNewPage() {
  const router = useRouter();
  const query = useSearchParams();
  const { pushToast } = useToast();

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(todayDateInput());
  const [dueDate, setDueDate] = useState(todayDateInput());
  const [currency, setCurrency] = useState("USD");

  const [clientQuery, setClientQuery] = useState("");
  const [clientOptions, setClientOptions] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [lineItems, setLineItems] = useState<LineDraft[]>([{ id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "0.00", taxable: false }]);
  const [catalogSuggestions, setCatalogSuggestions] = useState<Record<string, CatalogItem[]>>({});

  const [taxRate, setTaxRate] = useState("0");
  const [discountValue, setDiscountValue] = useState("0");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [nextRes, profileRes] = await Promise.all([
          apiRequest<ApiEnvelope<{ invoiceNumber: string }>>("/api/invoices/next-number"),
          apiRequest<ApiEnvelope<{ defaultPaymentTermsDays: number; defaultCurrency: string; defaultTaxRate: number | null; defaultNotes: string | null; defaultTerms: string | null }>>("/api/profile"),
        ]);

        if (!active) return;
        setInvoiceNumber(nextRes.data.invoiceNumber);
        setCurrency(profileRes.data.defaultCurrency);
        setTaxRate(String(profileRes.data.defaultTaxRate ?? 0));
        setTerms(profileRes.data.defaultTerms ?? "");
        setNotes(profileRes.data.defaultNotes ?? "");
        setDueDate(addDays(todayDateInput(), profileRes.data.defaultPaymentTermsDays));

        const clientId = query.get("clientId");
        if (clientId) {
          const clientRes = await apiRequest<ApiEnvelope<Client>>(`/api/clients/${clientId}`);
          if (!active) return;
          setSelectedClient(clientRes.data);
          setClientQuery(clientRes.data.name);
          setCurrency(clientRes.data.currency);
        }
      } catch (err) {
        if (active) setError(uiErrorMessage(err));
      } finally {
        if (active) setInitialLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!clientQuery.trim()) {
        setClientOptions([]);
        return;
      }
      try {
        const res = await apiRequest<{ data: Client[] }>(`/api/clients?search=${encodeURIComponent(clientQuery)}&limit=10&page=1`);
        setClientOptions(res.data);
      } catch {
        setClientOptions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientQuery]);

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setLineItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function searchCatalog(rowId: string, text: string) {
    if (!text.trim()) {
      setCatalogSuggestions((prev) => ({ ...prev, [rowId]: [] }));
      return;
    }

    try {
      const res = await apiRequest<ApiEnvelope<CatalogItem[]>>(`/api/catalog?search=${encodeURIComponent(text)}`);
      setCatalogSuggestions((prev) => ({ ...prev, [rowId]: res.data.slice(0, 5) }));
    } catch {
      setCatalogSuggestions((prev) => ({ ...prev, [rowId]: [] }));
    }
  }

  const totals = useMemo(() => {
    const rows = lineItems.map((item) => {
      const quantity = Number(item.quantity || "0");
      const unitPrice = toCents(item.unitPrice);
      const amount = Math.round(quantity * unitPrice);
      return { taxable: item.taxable, amount };
    });

    const subtotal = rows.reduce((sum, row) => sum + row.amount, 0);
    const taxableSubtotal = rows.filter((row) => row.taxable).reduce((sum, row) => sum + row.amount, 0);
    const taxAmount = Math.round((taxableSubtotal * Number(taxRate || "0")) / 100);
    const discount = discountType === "percentage" ? Math.round((subtotal * Number(discountValue || "0")) / 100) : toCents(discountValue);
    const total = Math.max(0, subtotal + taxAmount - discount);

    return { subtotal, taxAmount, discount, total };
  }, [discountType, discountValue, lineItems, taxRate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!selectedClient) {
      setError("Select a client before saving.");
      return;
    }

    if (lineItems.length === 0) {
      setError("At least one line item is required.");
      return;
    }

    const invalidQuantity = lineItems.some((item) => Number(item.quantity) <= 0);
    if (invalidQuantity) {
      setError("Quantity must be greater than zero.");
      return;
    }

    const invalidUnitPrice = lineItems.some((item) => toCents(item.unitPrice) < 0);
    if (invalidUnitPrice) {
      setError("Unit price cannot be negative.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<ApiEnvelope<{ id: string }>>("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          invoiceNumber,
          issueDate,
          dueDate,
          currency,
          lineItems: lineItems.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: toCents(item.unitPrice),
            taxable: item.taxable,
          })),
          taxRate: Number(taxRate || "0"),
          discountType,
          discountValue: discountType === "fixed" ? toCents(discountValue) : Number(discountValue || "0"),
          notes: notes || null,
          terms: terms || null,
        }),
      });
      pushToast("Draft saved.");
      router.push(`/invoices/${res.data.id}`);
    } catch (err) {
      if (err instanceof Error && "code" in err && (err as { code: string }).code === "DUPLICATE_INVOICE_NUMBER") {
        setError("Invoice number already in use.");
      } else {
        setError(uiErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) {
    return <AppShell title="New Invoice"><PageLoader /></AppShell>;
  }

  if (error && !invoiceNumber) {
    return <AppShell title="New Invoice"><PageError message={error} /></AppShell>;
  }

  return (
    <AppShell title="New Invoice">
      <form className="space-y-8" onSubmit={onSubmit}>
        <section className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
          <h2 className="text-2xl font-semibold">Invoice Details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-xs font-medium text-[#A0A0A0]">Invoice Number
              <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="INV-0001" />
            </label>
            <label className="text-xs font-medium text-[#A0A0A0]">Issue Date
              <input type="date" className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
            </label>
            <label className="text-xs font-medium text-[#A0A0A0]">Due Date
              <input type="date" className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
          <h2 className="text-2xl font-semibold">Client</h2>
          <div className="relative mt-4">
            <input
              className="w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm"
              placeholder="Search clients..."
              value={clientQuery}
              onChange={(event) => {
                setClientQuery(event.target.value);
                setSelectedClient(null);
              }}
            />
            {clientOptions.length > 0 ? (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#2E2E2E] bg-[#242424]">
                {clientOptions.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-[#2E2E2E]"
                    onClick={() => {
                      setSelectedClient(client);
                      setClientQuery(client.name);
                      setCurrency(client.currency);
                      setClientOptions([]);
                    }}
                  >
                    {client.name} {client.company ? `· ${client.company}` : ""}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-[#A0A0A0]"><Link href="/clients" className="text-[#6366F1]">Add new client</Link></p>
          {selectedClient ? <p className="mt-3 text-sm text-[#A0A0A0]">{selectedClient.name} {selectedClient.company ? `· ${selectedClient.company}` : ""} {selectedClient.email ? `· ${selectedClient.email}` : ""}</p> : null}
        </section>

        <section className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
          <h2 className="text-2xl font-semibold">Line Items</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-[#2E2E2E] text-left text-xs uppercase text-[#A0A0A0]">
                  <th className="py-3">Description</th><th className="py-3">Qty</th><th className="py-3">Unit Price</th><th className="py-3">Taxable</th><th className="py-3">Amount</th><th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-[#2E2E2E] align-top">
                    <td className="py-3">
                      <input
                        className="w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-3 py-2 text-sm"
                        placeholder="Service or product description"
                        value={item.description}
                        onChange={(event) => {
                          updateLine(item.id, { description: event.target.value });
                          searchCatalog(item.id, event.target.value);
                        }}
                      />
                      {(catalogSuggestions[item.id] ?? []).length > 0 ? (
                        <div className="mt-2 rounded-lg border border-[#2E2E2E] bg-[#242424]">
                          {(catalogSuggestions[item.id] ?? []).map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-xs hover:bg-[#2E2E2E]"
                              onClick={() => {
                                updateLine(item.id, {
                                  description: suggestion.description || suggestion.name,
                                  unitPrice: fromCents(suggestion.unitPrice),
                                  taxable: suggestion.taxable,
                                });
                                setCatalogSuggestions((prev) => ({ ...prev, [item.id]: [] }));
                              }}
                            >
                              {suggestion.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3"><input className="w-20 rounded-lg border border-[#2E2E2E] bg-[#242424] px-3 py-2 text-sm" value={item.quantity} onChange={(event) => updateLine(item.id, { quantity: event.target.value })} /></td>
                    <td className="py-3"><input className="w-28 rounded-lg border border-[#2E2E2E] bg-[#242424] px-3 py-2 text-sm" value={item.unitPrice} onChange={(event) => updateLine(item.id, { unitPrice: event.target.value })} /></td>
                    <td className="py-3"><input type="checkbox" checked={item.taxable} onChange={(event) => updateLine(item.id, { taxable: event.target.checked })} /></td>
                    <td className="py-3 text-sm">{formatCurrency(Math.round(Number(item.quantity || "0") * toCents(item.unitPrice)), currency)}</td>
                    <td className="py-3">
                      <button type="button" className="rounded-md border border-[#2E2E2E] p-2 text-[#A0A0A0]" onClick={() => setLineItems((prev) => prev.filter((row) => row.id !== item.id))} title="Remove line item">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-2 text-sm"
            onClick={() => setLineItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "0.00", taxable: false }])}
          >
            <Plus size={16} /> Add line item
          </button>

          {lineItems.length === 0 ? <EmptyState title="At least one line item is required." /> : null}

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-[320px] space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#A0A0A0]">Subtotal</span><span>{formatCurrency(totals.subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-[#A0A0A0]">Tax ({taxRate}%)</span><span>{formatCurrency(totals.taxAmount, currency)}</span></div>
              <div className="flex justify-between"><span className="text-[#A0A0A0]">Discount</span><span>{formatCurrency(totals.discount, currency)}</span></div>
              <div className="flex justify-between border-t border-[#2E2E2E] pt-2 text-base font-semibold"><span>Total</span><span>{formatCurrency(totals.total, currency)}</span></div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
          <h2 className="text-2xl font-semibold">Additional Details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-[#A0A0A0]">Tax Rate (%)
              <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} placeholder="0" />
            </label>
            <label className="text-xs font-medium text-[#A0A0A0]">Discount
              <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} placeholder="0" />
            </label>
            <label className="text-xs font-medium text-[#A0A0A0]">Discount Type
              <select className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" value={discountType} onChange={(event) => setDiscountType(event.target.value as "percentage" | "fixed") }>
                <option value="percentage">%</option>
                <option value="fixed">Fixed</option>
              </select>
            </label>
            <label className="text-xs font-medium text-[#A0A0A0]">Currency
              <select className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {CURRENCY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-xs font-medium text-[#A0A0A0]">Notes
            <textarea className="mt-2 min-h-[100px] w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" placeholder="Add payment instructions, thank-you notes, or other details" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="mt-4 block text-xs font-medium text-[#A0A0A0]">Payment Terms
            <textarea className="mt-2 min-h-[100px] w-full rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-3 text-sm" placeholder="e.g. Payment due within 30 days" value={terms} onChange={(event) => setTerms(event.target.value)} />
          </label>
        </section>

        {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}

        <div className="flex items-center gap-4">
          <button className="rounded-lg bg-[#6366F1] px-5 py-3 text-sm font-medium text-white" disabled={saving}>{saving ? "Saving..." : "Save as Draft"}</button>
          <Link href="/invoices" className="text-sm text-[#A0A0A0]">Cancel</Link>
        </div>
      </form>
    </AppShell>
  );
}
