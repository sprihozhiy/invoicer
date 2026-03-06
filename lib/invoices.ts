import { apiError } from "@/lib/api";
import { todayUtc } from "@/lib/time";
import { Invoice, InvoiceSummary, LineItem, StoredInvoice, StoredInvoiceStatus } from "@/lib/models";
import { uuid } from "@/lib/ids";

export function computeInvoiceNumber(prefix: string, nextInvoiceNumber: number): string {
  const n = `${nextInvoiceNumber}`;
  const padded = nextInvoiceNumber < 10000 ? n.padStart(4, "0") : n;
  return `${prefix}-${padded}`;
}

export function computeLineItems(
  items: Array<{ id?: string; description: string; quantity: number; unitPrice: number; taxable?: boolean }>,
): LineItem[] {
  return items.map((item) => {
    const amount = Math.round(item.quantity * item.unitPrice);
    return {
      id: item.id ?? uuid(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount,
      taxable: item.taxable ?? false,
    };
  });
}

export function computeTotals(input: {
  lineItems: LineItem[];
  taxRate: number | null;
  discountType: "percentage" | "fixed" | null;
  discountValue: number;
  amountPaid?: number;
}) {
  const subtotal = input.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxableSubtotal = input.lineItems.filter((item) => item.taxable).reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = input.taxRate && input.taxRate > 0 ? Math.round((taxableSubtotal * input.taxRate) / 100) : 0;

  let discountAmount = 0;
  if (input.discountType === "percentage" && input.discountValue > 0) {
    discountAmount = Math.round((subtotal * input.discountValue) / 100);
  }
  if (input.discountType === "fixed" && input.discountValue > 0) {
    discountAmount = Math.round(input.discountValue);
  }
  if (discountAmount < 0) {
    discountAmount = 0;
  }

  const total = Math.max(0, subtotal + taxAmount - discountAmount);
  const amountPaid = input.amountPaid ?? 0;
  const amountDue = Math.max(0, total - amountPaid);

  return {
    subtotal,
    taxAmount,
    discountAmount,
    total,
    amountPaid,
    amountDue,
  };
}

export function withComputedStatus(invoice: StoredInvoice): Invoice {
  const status =
    (invoice.status === "sent" || invoice.status === "partial") && invoice.dueDate < todayUtc() ? "overdue" : invoice.status;
  return {
    ...invoice,
    status,
  };
}

export function toSummary(invoice: StoredInvoice, clientName: string): InvoiceSummary {
  const withStatus = withComputedStatus(invoice);
  return {
    id: withStatus.id,
    invoiceNumber: withStatus.invoiceNumber,
    status: withStatus.status,
    clientId: withStatus.clientId,
    clientName,
    total: withStatus.total,
    amountDue: withStatus.amountDue,
    currency: withStatus.currency,
    issueDate: withStatus.issueDate,
    dueDate: withStatus.dueDate,
    createdAt: withStatus.createdAt,
  };
}

export function ensureEditable(invoice: StoredInvoice): void {
  if (invoice.status !== "draft") {
    apiError(400, "INVOICE_NOT_EDITABLE", "Only draft invoices are editable.");
  }
}

export function ensureCanSend(invoice: StoredInvoice): void {
  if (invoice.status !== "draft") {
    apiError(400, "INVALID_STATUS_TRANSITION", "Invoice cannot be sent from its current status.");
  }
}

export function ensureCanVoid(invoice: StoredInvoice): void {
  if (invoice.status === "paid" || invoice.status === "void") {
    apiError(400, "INVALID_STATUS_TRANSITION", "Invoice cannot be voided from its current status.");
  }
}

export function ensureCanRecordPayment(invoice: StoredInvoice): void {
  if (invoice.status === "draft" || invoice.status === "paid" || invoice.status === "void") {
    apiError(400, "INVALID_STATUS_TRANSITION", "Invoice cannot accept payments in its current status.");
  }
}

export function updateStatusFromPayment(invoice: StoredInvoice, totalPaid: number, paidAtDate: string): void {
  invoice.amountPaid = totalPaid;
  invoice.amountDue = Math.max(0, invoice.total - totalPaid);

  if (invoice.amountPaid >= invoice.total) {
    invoice.status = "paid" as StoredInvoiceStatus;
    invoice.paidAt = `${paidAtDate}T00:00:00.000Z`;
  } else if (invoice.amountPaid > 0) {
    invoice.status = "partial" as StoredInvoiceStatus;
    invoice.paidAt = null;
  } else {
    invoice.status = "sent" as StoredInvoiceStatus;
    invoice.paidAt = null;
  }
}
