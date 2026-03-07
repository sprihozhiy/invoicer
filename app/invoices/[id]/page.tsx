"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Download, MoreVertical, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { EmptyState, Modal, PageError, PageLoader, StatusBadge } from "@/components/ui";
import {
  ApiClientError,
  ApiEnvelope,
  BusinessProfile,
  Client,
  Invoice,
  Payment,
  PaymentMethod,
  apiRequest,
  formatCurrency,
  formatDate,
  uiErrorMessage,
} from "@/lib/client";

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Cheque" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function toCents(value: string): number {
  return Math.round(Number(value || "0") * 100);
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [sendOpen, setSendOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendLoading, setSendLoading] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("0.00");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const invoiceRes = await apiRequest<ApiEnvelope<Invoice>>(`/api/invoices/${params.id}`);
      const [paymentsRes, profileRes] = await Promise.all([
        apiRequest<ApiEnvelope<Payment[]>>(`/api/invoices/${params.id}/payments`),
        apiRequest<ApiEnvelope<BusinessProfile>>("/api/profile"),
      ]);

      const clientRes = await apiRequest<ApiEnvelope<Client>>(`/api/clients/${invoiceRes.data.clientId}`);
      setInvoice(invoiceRes.data);
      setPayments(paymentsRes.data);
      setProfile(profileRes.data);
      setClient(clientRes.data);
      setRecipientEmail(clientRes.data.email ?? "");
      setPaymentAmount(fromCents(invoiceRes.data.amountDue));
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setError("Invoice not found.");
      } else {
        setError(uiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const showSend = invoice?.status === "draft";
  const showRecordPayment = invoice && ["sent", "partial", "overdue"].includes(invoice.status);
  const showDownload = invoice && invoice.status !== "void";
  const canVoid = invoice && ["draft", "sent", "partial"].includes(invoice.status);

  async function sendInvoice(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    setSendLoading(true);
    try {
      const res = await apiRequest<ApiEnvelope<Invoice>>(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail, message: sendMessage || null }),
      });
      setInvoice(res.data);
      setSendOpen(false);
      pushToast("Invoice sent.");
    } catch {
      pushToast("Failed to send. Try again.", "error");
    } finally {
      setSendLoading(false);
    }
  }

  async function savePayment(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    const amount = toCents(paymentAmount);
    if (amount <= 0) {
      pushToast("Enter a valid payment amount.", "error");
      return;
    }
    if (amount > invoice.amountDue) {
      pushToast("Payment exceeds the amount due.", "error");
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await apiRequest<ApiEnvelope<{ payment: Payment; invoice: Invoice }>>(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          paidAt: paymentDate,
          method: paymentMethod,
          reference: paymentReference || null,
          notes: paymentNote || null,
        }),
      });
      setInvoice(res.data.invoice);
      setPayments((prev) => [res.data.payment, ...prev]);
      setPaymentOpen(false);
      pushToast("Payment recorded.");
    } catch {
      pushToast("Something went wrong. Try again.", "error");
    } finally {
      setPaymentLoading(false);
    }
  }

  async function deletePayment(paymentId: string) {
    if (!invoice) return;
    try {
      const res = await apiRequest<ApiEnvelope<{ invoice: Invoice }>>(`/api/invoices/${invoice.id}/payments/${paymentId}`, { method: "DELETE" });
      setPayments((prev) => prev.filter((item) => item.id !== paymentId));
      setInvoice(res.data.invoice);
      pushToast("Payment removed.");
    } catch {
      pushToast("Something went wrong. Try again.", "error");
    }
  }

  async function duplicateInvoice() {
    if (!invoice) return;
    try {
      const res = await apiRequest<ApiEnvelope<Invoice>>(`/api/invoices/${invoice.id}/duplicate`, { method: "POST" });
      pushToast(`Duplicated from ${invoice.invoiceNumber}.`);
      router.push(`/invoices/${res.data.id}`);
    } catch {
      pushToast("Something went wrong. Try again.", "error");
    }
  }

  async function voidInvoice() {
    if (!invoice) return;
    try {
      const res = await apiRequest<ApiEnvelope<Invoice>>(`/api/invoices/${invoice.id}/void`, { method: "POST" });
      setInvoice(res.data);
      setVoidOpen(false);
      pushToast("Invoice voided.");
    } catch {
      pushToast("Something went wrong. Try again.", "error");
    }
  }

  async function deleteDraft() {
    if (!invoice || invoice.status !== "draft") return;
    try {
      await apiRequest<{ success: true }>(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      pushToast("Invoice deleted.");
      router.push("/invoices");
    } catch {
      pushToast("Something went wrong. Try again.", "error");
    }
  }

  const totalsRows = useMemo(() => {
    if (!invoice) return [];
    const rows: Array<[string, number]> = [["Subtotal", invoice.subtotal]];
    if (invoice.taxAmount > 0) rows.push([`Tax (${invoice.taxRate ?? 0}%)`, invoice.taxAmount]);
    if (invoice.discountAmount > 0) rows.push(["Discount", -invoice.discountAmount]);
    rows.push(["Total", invoice.total]);
    if (invoice.amountPaid > 0) rows.push(["Amount Paid", invoice.amountPaid]);
    rows.push(["Amount Due", invoice.amountDue]);
    return rows;
  }, [invoice]);

  if (loading) return <AppShell title="Invoice"><PageLoader /></AppShell>;
  if (error) return <AppShell title="Invoice"><PageError message={error} onRetry={load} /></AppShell>;
  if (!invoice || !client || !profile) return null;

  return (
    <AppShell
      title={`Invoice ${invoice.invoiceNumber}`}
      action={
        <div className="relative flex items-center gap-2">
          {showSend ? <button className="rounded-lg border border-[#2E2E2E] bg-[#242424] px-4 py-2 text-sm" onClick={() => setSendOpen(true)}>Send Invoice</button> : null}
          {showRecordPayment ? <button className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium" onClick={() => setPaymentOpen(true)}>Record Payment</button> : null}
          {showDownload ? <a href={`/api/invoices/${invoice.id}/pdf`} className="rounded-lg border border-[#2E2E2E] bg-[#242424] p-2" title="Download PDF"><Download size={16} /></a> : null}
          <button type="button" className="rounded-lg border border-[#2E2E2E] bg-[#242424] p-2" onClick={() => setMenuOpen((prev) => !prev)}><MoreVertical size={16} /></button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-30 w-48 rounded-lg border border-[#2E2E2E] bg-[#242424] py-1 text-sm">
              <button className="block w-full px-3 py-2 text-left hover:bg-[#2E2E2E]" onClick={duplicateInvoice}>Duplicate Invoice</button>
              {invoice.status === "draft" ? <button className="block w-full px-3 py-2 text-left text-[#EF4444] hover:bg-[#2E2E2E]" onClick={deleteDraft}>Delete Draft</button> : null}
              {canVoid ? <button className="block w-full px-3 py-2 text-left text-[#EF4444] hover:bg-[#2E2E2E]" onClick={() => setVoidOpen(true)}>Void Invoice</button> : null}
            </div>
          ) : null}
        </div>
      }
    >
      {invoice.status === "void" ? <div className="mb-6 rounded-xl border border-[#2E2E2E] bg-[#171717] p-4 text-sm text-[#A0A0A0]">This invoice has been voided.</div> : null}
      <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold">{invoice.invoiceNumber}</p>
            <div className="mt-2"><StatusBadge status={invoice.status} /></div>
            <p className="mt-3 text-sm text-[#A0A0A0]">Issue date {formatDate(invoice.issueDate)} · Due date {formatDate(invoice.dueDate)}</p>
            <p className="mt-4 text-sm text-[#F5F5F5]">{client.name}</p>
            <p className="text-sm text-[#A0A0A0]">{client.company || ""} {client.email ? `· ${client.email}` : ""}</p>
          </div>
          <div className="text-right text-sm text-[#A0A0A0]">
            <p className="text-base text-[#F5F5F5]">{profile.businessName || "—"}</p>
            <p>{profile.address?.line1 || ""}</p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-[#2E2E2E] text-left text-xs uppercase text-[#A0A0A0]">
                <th className="py-3">Description</th><th className="py-3">Qty</th><th className="py-3">Unit Price</th><th className="py-3">Tax</th><th className="py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-[#2E2E2E] text-sm">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3">{item.quantity}</td>
                  <td className="py-3">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                  <td className="py-3">{item.taxable ? "Yes" : "No"}</td>
                  <td className="py-3">{formatCurrency(item.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-[320px] space-y-2">
            {totalsRows.map(([label, value]) => (
              <div key={label} className={`flex justify-between text-sm ${label === "Amount Due" ? "text-lg font-semibold text-[#F5F5F5]" : "text-[#A0A0A0]"}`}>
                <span>{label}</span>
                <span>{label === "Discount" ? `-${formatCurrency(Math.abs(value), invoice.currency)}` : formatCurrency(value, invoice.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {payments.length > 0 ? (
        <section className="mt-8 rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
          <h2 className="text-2xl font-semibold">Payment History</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-[#2E2E2E] text-left text-xs uppercase text-[#A0A0A0]">
                  <th className="py-3">Date</th><th className="py-3">Amount</th><th className="py-3">Method</th><th className="py-3">Reference / Note</th><th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[#2E2E2E] text-sm">
                    <td className="py-3">{formatDate(payment.paidAt)}</td>
                    <td className="py-3">{formatCurrency(payment.amount, invoice.currency)}</td>
                    <td className="py-3">{payment.method.replace("_", " ")}</td>
                    <td className="py-3">{payment.reference || payment.notes || "—"}</td>
                    <td className="py-3">
                      <button className="rounded-md border border-[#2E2E2E] p-1 text-[#A0A0A0]" title="Remove this payment" onClick={() => deletePayment(payment.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {invoice.notes || invoice.terms ? (
        <section className="mt-8 rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
          {invoice.notes ? <><h3 className="text-base font-medium">Notes</h3><p className="mt-2 text-sm text-[#A0A0A0]">{invoice.notes}</p></> : null}
          {invoice.terms ? <><h3 className="mt-5 text-base font-medium">Payment Terms</h3><p className="mt-2 text-sm text-[#A0A0A0]">{invoice.terms}</p></> : null}
        </section>
      ) : null}

      <Modal open={sendOpen} onClose={() => setSendOpen(false)} title="Send Invoice">
        <p className="mb-4 text-sm text-[#A0A0A0]">The invoice PDF will be attached if email delivery is configured. Otherwise, the invoice will be marked as sent.</p>
        <form className="space-y-4" onSubmit={sendInvoice}>
          <label className="block text-xs font-medium text-[#A0A0A0]">Recipient Email
            <input type="email" className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="client@company.com" required />
          </label>
          <label className="block text-xs font-medium text-[#A0A0A0]">Message (optional)
            <textarea className="mt-2 min-h-[100px] w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" value={sendMessage} onChange={(event) => setSendMessage(event.target.value)} placeholder="Add a note to your client..." />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg border border-[#2E2E2E] px-4 py-2 text-sm" onClick={() => setSendOpen(false)}>Cancel</button>
            <button className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium" disabled={sendLoading}>{sendLoading ? "Sending..." : "Send"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record Payment">
        <form className="space-y-4" onSubmit={savePayment}>
          <label className="block text-xs font-medium text-[#A0A0A0]">Amount
            <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
          </label>
          <label className="block text-xs font-medium text-[#A0A0A0]">Payment Date
            <input type="date" className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </label>
          <label className="block text-xs font-medium text-[#A0A0A0]">Payment Method
            <select className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#A0A0A0]">Reference (optional)
            <input className="mt-2 w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="Cheque number, bank reference..." value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
          </label>
          <label className="block text-xs font-medium text-[#A0A0A0]">Note (optional)
            <textarea className="mt-2 min-h-[90px] w-full rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-3 text-sm" placeholder="Any notes about this payment" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg border border-[#2E2E2E] px-4 py-2 text-sm" onClick={() => setPaymentOpen(false)}>Cancel</button>
            <button className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium" disabled={paymentLoading}>{paymentLoading ? "Saving..." : "Save Payment"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={voidOpen} onClose={() => setVoidOpen(false)} title="Void this invoice?">
        <p className="text-sm text-[#A0A0A0]">Voiding this invoice is permanent and cannot be undone. The invoice number will be retired.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-[#2E2E2E] px-4 py-2 text-sm" onClick={() => setVoidOpen(false)}>Cancel</button>
          <button type="button" className="rounded-lg border border-[#EF4444] px-4 py-2 text-sm text-[#EF4444] hover:bg-[#450A0A]" onClick={voidInvoice}>Void Invoice</button>
        </div>
      </Modal>

      {!invoice ? <EmptyState title="Invoice not found." action={<Link href="/invoices" className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm">Back to invoices</Link>} /> : null}
    </AppShell>
  );
}
