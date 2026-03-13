"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MoreVertical,
  Send,
  CreditCard,
  Download,
  Copy,
  Ban,
  Loader2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { requestJson, ApiClientError, toErrorMessage } from "../../../_lib/api";
import { formatMoney, formatDate } from "../../../_lib/format";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../../../_lib/constants";
import { Button, IconButton } from "../../../_components/Button";
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

// ─── Local Types ──────────────────────────────────────────────────────────────

type ApiEnvelope<T> = { data: T };

interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
}

interface Payment {
  id: string;
  amount: number;
  paidAt: string;
  method: string;
  reference: string | null;
  notes: string | null;
}

interface ApiInvoice {
  id: string;
  invoiceNumber: string;
  status: "draft" | "sent" | "partial" | "paid" | "overdue" | "void";
  clientId: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number | null;
  taxAmount: number;
  discountType: "percentage" | "fixed" | null;
  discountValue: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes: string | null;
  terms: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface ClientWithStats {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  address: Address | null;
}

interface BusinessProfile {
  businessName: string;
  logoUrl: string | null;
  address: Address | null;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  amount: number;
  sortOrder: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: "draft" | "sent" | "partial" | "paid" | "overdue" | "void";
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  clientAddress: Address | null;
  businessName: string;
  businessAddress: Address | null;
  businessLogoUrl: string | null;
  currency: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number | null;
  taxAmount: number;
  discountType: "percentage" | "fixed" | null;
  discountValue: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes: string | null;
  terms: string | null;
  sentAt: string | null;
  paidAt: string | null;
  payments: Payment[];
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAddress(addr: Address | null): string | null {
  if (!addr) return null;
  return [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country]
    .filter(Boolean)
    .join(", ");
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ backgroundColor: "var(--bg-elevated)" }}
    />
  );
}

function PageSkeleton() {
  return (
    <div>
      {/* header skeleton */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-8 py-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      {/* content skeleton */}
      <div className="mx-auto max-w-[900px] px-8 py-8 space-y-6">
        <div
          className="rounded-2xl border p-8 space-y-6"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-primary)" }}
        >
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-16 w-32" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── More Actions Dropdown ────────────────────────────────────────────────────

interface MoreActionsProps {
  invoice: Invoice;
  onDuplicate: () => void;
  onVoid: () => void;
}

function MoreActionsMenu({ invoice, onDuplicate, onVoid }: MoreActionsProps) {
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

  const canVoid = ["draft", "sent", "partial"].includes(invoice.status);

  return (
    <div ref={ref} className="relative">
      <IconButton
        onClick={() => setOpen((p) => !p)}
        aria-label="More actions"
        title="More actions"
      >
        <MoreVertical size={16} strokeWidth={1.5} />
      </IconButton>
      {open && (
        <div
          className="absolute right-0 z-30 mt-1 w-52 rounded-xl border py-1 shadow-xl"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border-primary)",
          }}
        >
          <button
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-primary)" }}
            onClick={() => { setOpen(false); onDuplicate(); }}
          >
            <Copy size={14} strokeWidth={1.5} />
            Duplicate Invoice
          </button>
          {canVoid && (
            <button
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--danger-fg)" }}
              onClick={() => { setOpen(false); onVoid(); }}
            >
              <Ban size={14} strokeWidth={1.5} />
              Void Invoice
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Send Invoice Modal ───────────────────────────────────────────────────────

interface SendInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

function SendInvoiceModal({ open, onClose, invoice, onSuccess }: SendInvoiceModalProps) {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState(invoice.clientEmail ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setRecipientEmail(invoice.clientEmail ?? "");
      setMessage("");
      setError(null);
      setEmailError(null);
    }
  }, [open, invoice.clientEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    if (!recipientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await requestJson(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: recipientEmail.trim(), message: message.trim() || undefined }),
      });
      onClose();
      toast("Invoice sent.");
      onSuccess();
    } catch (err) {
      if (err instanceof ApiClientError && err.field === "recipientEmail") {
        setEmailError(err.message);
      } else {
        setError(toErrorMessage(err) || "Failed to send. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Send Invoice">
      <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
        The invoice PDF will be attached if email delivery is configured. Otherwise, the invoice
        will be marked as sent.
      </p>
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="send-email" required>Recipient Email</Label>
          <Input
            id="send-email"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="client@example.com"
            error={emailError ?? undefined}
            autoComplete="email"
          />
          <FieldError message={emailError ?? undefined} />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="send-message">Message (optional)</Label>
          <Textarea
            id="send-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note to your client..."
            rows={4}
            maxLength={1000}
          />
        </FormGroup>
        {error && (
          <div
            className="mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            <AlertCircle size={14} strokeWidth={1.5} className="flex-shrink-0" />
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Send size={14} strokeWidth={1.5} />
            {loading ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

function RecordPaymentModal({ open, onClose, invoice, onSuccess }: RecordPaymentModalProps) {
  const { toast } = useToast();
  const [amountStr, setAmountStr] = useState("");
  const [paidAt, setPaidAt] = useState(todayString());
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setAmountStr((invoice.amountDue / 100).toFixed(2));
      setPaidAt(todayString());
      setMethod("cash");
      setReference("");
      setNote("");
      setErrors({});
    }
  }, [open, invoice.amountDue]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const cents = Math.round(parseFloat(amountStr) * 100);

    if (!amountStr || isNaN(parseFloat(amountStr)) || cents <= 0) {
      errs.amount = "Enter a valid payment amount.";
    } else if (cents > invoice.amountDue) {
      errs.amount = "Payment exceeds the amount due.";
    }

    if (!paidAt) {
      errs.paidAt = "Payment date is required.";
    } else if (paidAt > todayString()) {
      errs.paidAt = "Payment date cannot be in the future.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cents = Math.round(parseFloat(amountStr) * 100);
    setLoading(true);
    try {
      await requestJson(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cents,
          paidAt,
          method,
          reference: reference.trim() || undefined,
          notes: note.trim() || undefined,
        }),
      });
      onClose();
      toast("Payment recorded.");
      onSuccess();
    } catch (err) {
      setErrors({ form: toErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="pay-amount" required>Amount</Label>
          <Input
            id="pay-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            error={errors.amount}
          />
          <FieldError message={errors.amount} />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="pay-date" required>Payment Date</Label>
          <Input
            id="pay-date"
            type="date"
            value={paidAt}
            max={todayString()}
            onChange={(e) => setPaidAt(e.target.value)}
            error={errors.paidAt}
          />
          <FieldError message={errors.paidAt} />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="pay-method">Payment Method</Label>
          <Select
            id="pay-method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup>
          <Label htmlFor="pay-reference">Reference (optional)</Label>
          <Input
            id="pay-reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transaction ID, cheque number..."
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="pay-note">Note (optional)</Label>
          <Input
            id="pay-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Additional details..."
          />
        </FormGroup>
        {errors.form && (
          <div
            className="mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            <AlertCircle size={14} strokeWidth={1.5} className="flex-shrink-0" />
            {errors.form}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <CreditCard size={14} strokeWidth={1.5} />
            {loading ? "Saving..." : "Save Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Void Confirm Modal ───────────────────────────────────────────────────────

interface VoidConfirmModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

function VoidConfirmModal({ open, onClose, invoice, onSuccess }: VoidConfirmModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleVoid = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestJson(`/api/invoices/${invoice.id}/void`, { method: "POST" });
      onClose();
      toast("Invoice voided.");
      onSuccess();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Void this invoice?">
      <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
        Voiding this invoice is permanent and cannot be undone. The invoice number will be retired.
      </p>
      {error && (
        <div
          className="mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          <AlertCircle size={14} strokeWidth={1.5} className="flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="button" variant="danger" loading={loading} onClick={handleVoid}>
          <Ban size={14} strokeWidth={1.5} />
          {loading ? "Voiding..." : "Void Invoice"}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Invoice Preview Card ─────────────────────────────────────────────────────

function InvoicePreviewCard({ invoice }: { invoice: Invoice }) {
  const currency = invoice.currency;
  const sortedLineItems = [...invoice.lineItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const clientAddr = formatAddress(invoice.clientAddress);
  const businessAddr = formatAddress(invoice.businessAddress);

  return (
    <div
      className="rounded-2xl border p-8"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-primary)",
      }}
    >
      {/* Header: client (left) + business (right) */}
      <div className="flex flex-col-reverse gap-8 sm:flex-row sm:justify-between sm:items-start mb-8">
        {/* Client */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Bill To
          </p>
          <p className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
            {invoice.clientName}
          </p>
          {invoice.clientCompany && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {invoice.clientCompany}
            </p>
          )}
          {clientAddr && (
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {clientAddr}
            </p>
          )}
          {invoice.clientEmail && (
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              {invoice.clientEmail}
            </p>
          )}
        </div>

        {/* Business */}
        <div className="text-right">
          {invoice.businessLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={invoice.businessLogoUrl}
              alt={invoice.businessName}
              className="mb-2 ml-auto h-12 max-w-[160px] object-contain"
            />
          )}
          <p className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
            {invoice.businessName}
          </p>
          {businessAddr && (
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {businessAddr}
            </p>
          )}
        </div>
      </div>

      {/* Invoice metadata */}
      <div
        className="mb-8 grid grid-cols-3 gap-4 rounded-xl p-4"
        style={{ backgroundColor: "var(--bg-elevated)" }}
      >
        <div>
          <p className="mb-1 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Invoice Number
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {invoice.invoiceNumber}
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Issue Date
          </p>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {formatDate(invoice.issueDate)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Due Date
          </p>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {formatDate(invoice.dueDate)}
          </p>
        </div>
      </div>

      {/* Line items table */}
      <div className="mb-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
              <th
                className="pb-3 text-left font-medium"
                style={{ color: "var(--text-muted)", width: "45%" }}
              >
                Description
              </th>
              <th
                className="pb-3 text-right font-medium"
                style={{ color: "var(--text-muted)", width: "10%" }}
              >
                Qty
              </th>
              <th
                className="pb-3 text-right font-medium"
                style={{ color: "var(--text-muted)", width: "18%" }}
              >
                Unit Price
              </th>
              <th
                className="pb-3 text-center font-medium"
                style={{ color: "var(--text-muted)", width: "10%" }}
              >
                Tax
              </th>
              <th
                className="pb-3 text-right font-medium"
                style={{ color: "var(--text-muted)", width: "17%" }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLineItems.map((item) => (
              <tr
                key={item.id}
                style={{ borderBottom: "1px solid var(--border-primary)" }}
              >
                <td
                  className="py-3 pr-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.description}
                </td>
                <td
                  className="py-3 text-right"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.quantity}
                </td>
                <td
                  className="py-3 text-right"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatMoney(item.unitPrice, currency)}
                </td>
                <td
                  className="py-3 text-center"
                  style={{ color: item.taxable ? "var(--success-fg)" : "var(--text-muted)" }}
                >
                  {item.taxable ? "✓" : "—"}
                </td>
                <td
                  className="py-3 text-right font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatMoney(item.amount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
            <span style={{ color: "var(--text-primary)" }}>{formatMoney(invoice.subtotal, currency)}</span>
          </div>
          {((invoice.taxRate ?? 0) > 0 || invoice.taxAmount > 0) && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>
                Tax ({invoice.taxRate ?? 0}%)
              </span>
              <span style={{ color: "var(--text-primary)" }}>{formatMoney(invoice.taxAmount, currency)}</span>
            </div>
          )}
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>
                Discount
                {invoice.discountType === "percentage" ? ` (${invoice.discountValue}%)` : ""}
              </span>
              <span style={{ color: "var(--text-primary)" }}>
                &minus;{formatMoney(invoice.discountAmount, currency)}
              </span>
            </div>
          )}
          <div
            className="flex justify-between border-t pt-2 text-sm font-semibold"
            style={{ borderColor: "var(--border-primary)" }}
          >
            <span style={{ color: "var(--text-primary)" }}>Total</span>
            <span style={{ color: "var(--text-primary)" }}>{formatMoney(invoice.total, currency)}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Amount Paid</span>
              <span style={{ color: "var(--success-fg)" }}>
                &minus;{formatMoney(invoice.amountPaid, currency)}
              </span>
            </div>
          )}
          {/* Amount Due — most prominent */}
          <div
            className="flex justify-between items-center rounded-lg px-3 py-2 mt-1"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Amount Due
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: "var(--accent-primary)" }}
            >
              {formatMoney(invoice.amountDue, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes / payment terms */}
      {(invoice.notes || invoice.terms) && (
        <div
          className="mt-8 border-t pt-6 space-y-4"
          style={{ borderColor: "var(--border-primary)" }}
        >
          {invoice.notes && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Notes
              </p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {invoice.notes}
              </p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Payment Terms
              </p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {invoice.terms}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Payment History Card ─────────────────────────────────────────────────────

interface PaymentHistoryCardProps {
  invoice: Invoice;
  onDeletePayment: (paymentId: string) => void;
  deletingPaymentId: string | null;
}

function PaymentHistoryCard({ invoice, onDeletePayment, deletingPaymentId }: PaymentHistoryCardProps) {
  const sorted = [...invoice.payments].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );

  if (sorted.length === 0) return null;

  return (
    <div
      className="rounded-2xl border"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-primary)",
        overflow: "hidden",
      }}
    >
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Payment History
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <th
              className="px-6 py-3 text-left font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Date
            </th>
            <th
              className="px-6 py-3 text-right font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Amount
            </th>
            <th
              className="px-6 py-3 text-left font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Method
            </th>
            <th
              className="px-6 py-3 text-left font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Reference / Note
            </th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.id}
              style={{ borderBottom: "1px solid var(--border-primary)" }}
            >
              <td className="px-6 py-3" style={{ color: "var(--text-secondary)" }}>
                {formatDate(p.paidAt)}
              </td>
              <td
                className="px-6 py-3 text-right font-medium"
                style={{ color: "var(--success-fg)" }}
              >
                {formatMoney(p.amount, invoice.currency)}
              </td>
              <td className="px-6 py-3" style={{ color: "var(--text-secondary)" }}>
                {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
              </td>
              <td className="px-6 py-3" style={{ color: "var(--text-muted)" }}>
                {[p.reference, p.notes].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="px-6 py-3 text-right">
                <button
                  onClick={() => onDeletePayment(p.id)}
                  disabled={deletingPaymentId === p.id}
                  className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-[var(--danger-bg)] disabled:opacity-50"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger-fg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  title="Remove payment"
                  aria-label="Remove payment"
                >
                  {deletingPaymentId === p.id ? (
                    <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} strokeWidth={1.5} />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [showSend, setShowSend] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showVoid, setShowVoid] = useState(false);

  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const invoiceRes = await requestJson<ApiEnvelope<ApiInvoice>>(`/api/invoices/${id}`);
      const [clientRes, profileRes, paymentsRes] = await Promise.all([
        requestJson<ApiEnvelope<ClientWithStats>>(`/api/clients/${invoiceRes.data.clientId}`),
        requestJson<ApiEnvelope<BusinessProfile>>("/api/profile"),
        requestJson<ApiEnvelope<Payment[]>>(`/api/invoices/${id}/payments`),
      ]);
      setInvoice({
        ...invoiceRes.data,
        clientName: clientRes.data.name,
        clientEmail: clientRes.data.email,
        clientCompany: clientRes.data.company,
        clientAddress: clientRes.data.address,
        businessName: profileRes.data.businessName,
        businessAddress: profileRes.data.address,
        businessLogoUrl: profileRes.data.logoUrl,
        payments: paymentsRes.data,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(toErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleDuplicate = async () => {
    if (!invoice) return;
    setDuplicating(true);
    try {
      const res = await requestJson<ApiEnvelope<{ id: string; invoiceNumber: string }>>(
        `/api/invoices/${invoice.id}/duplicate`,
        { method: "POST" },
      );
      toast(`Duplicated from ${invoice.invoiceNumber}.`);
      router.push(`/invoices/${res.data.id}`);
    } catch (err) {
      toast(toErrorMessage(err), "error");
    } finally {
      setDuplicating(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!invoice) return;
    setDeletingPaymentId(paymentId);
    try {
      await requestJson(`/api/invoices/${invoice.id}/payments/${paymentId}`, {
        method: "DELETE",
      });
      toast("Payment removed.");
      fetchInvoice();
    } catch (err) {
      toast(toErrorMessage(err), "error");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  // ── Loading ──
  if (loading) return <PageSkeleton />;

  // ── Not found ──
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 px-8 text-center">
        <AlertCircle size={40} strokeWidth={1} style={{ color: "var(--text-muted)" }} />
        <div>
          <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
            Invoice not found.
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            This invoice may have been deleted or the link is incorrect.
          </p>
        </div>
        <Link href="/invoices">
          <Button variant="secondary" size="sm">
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back to Invoices
          </Button>
        </Link>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 px-8 text-center">
        <AlertCircle size={40} strokeWidth={1} style={{ color: "var(--danger-fg)" }} />
        <div>
          <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
            Failed to load invoice.
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--danger-fg)" }}>
            {error}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchInvoice}>
          Retry
        </Button>
      </div>
    );
  }

  if (!invoice) return null;

  const canSend = invoice.status === "draft";
  const canRecordPayment = ["sent", "partial", "overdue"].includes(invoice.status);
  const canDownload = invoice.status !== "void";

  return (
    <>
      {/* ── Page Header ── */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-8 py-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/invoices"
            className="inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-secondary)" }}
            title="Back to Invoices"
            aria-label="Back to Invoices"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
          </Link>
          <h1
            className="truncate text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Invoice {invoice.invoiceNumber}
          </h1>
          <StatusBadge status={invoice.status} />
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canSend && (
            <Button variant="primary" size="sm" onClick={() => setShowSend(true)}>
              <Send size={14} strokeWidth={1.5} />
              Send Invoice
            </Button>
          )}
          {canRecordPayment && (
            <Button variant="primary" size="sm" onClick={() => setShowPayment(true)}>
              <CreditCard size={14} strokeWidth={1.5} />
              Record Payment
            </Button>
          )}
          {canDownload && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")}
            >
              <Download size={14} strokeWidth={1.5} />
              Download PDF
            </Button>
          )}
          {duplicating ? (
            <div className="inline-flex items-center justify-center rounded-lg p-2">
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : (
            <MoreActionsMenu
              invoice={invoice}
              onDuplicate={handleDuplicate}
              onVoid={() => setShowVoid(true)}
            />
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-[900px] px-8 py-8 space-y-6">
        {/* Void banner */}
        {invoice.status === "void" && (
          <div
            className="flex items-center gap-3 rounded-xl px-5 py-3 text-sm"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-primary)",
              color: "var(--text-secondary)",
            }}
          >
            <Ban size={16} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
            This invoice has been voided.
          </div>
        )}

        {/* Invoice preview */}
        <InvoicePreviewCard invoice={invoice} />

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <PaymentHistoryCard
            invoice={invoice}
            onDeletePayment={handleDeletePayment}
            deletingPaymentId={deletingPaymentId}
          />
        )}
      </div>

      {/* ── Modals ── */}
      <SendInvoiceModal
        open={showSend}
        onClose={() => setShowSend(false)}
        invoice={invoice}
        onSuccess={fetchInvoice}
      />
      <RecordPaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        invoice={invoice}
        onSuccess={fetchInvoice}
      />
      <VoidConfirmModal
        open={showVoid}
        onClose={() => setShowVoid(false)}
        invoice={invoice}
        onSuccess={fetchInvoice}
      />
    </>
  );
}
