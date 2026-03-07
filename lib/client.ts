"use client";

export type ApiEnvelope<T> = { data: T };
export type PaginatedEnvelope<T> = { data: T[]; meta: { total: number; page: number; limit: number } };
export type ApiErrorBody = { error: { code: string; message: string; field?: string } };

export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "void";
export type DiscountType = "percentage" | "fixed";
export type PaymentMethod = "cash" | "bank_transfer" | "check" | "credit_card" | "other";

export type Address = {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessProfile = {
  id: string;
  userId: string;
  businessName: string;
  logoUrl: string | null;
  address: Address | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  defaultCurrency: string;
  defaultPaymentTermsDays: number;
  defaultTaxRate: number | null;
  defaultNotes: string | null;
  defaultTerms: string | null;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: Address | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientWithStats = Client & {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  lastInvoiceDate: string | null;
};

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxable: boolean;
};

export type Invoice = {
  id: string;
  userId: string;
  clientId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number | null;
  taxAmount: number;
  discountType: DiscountType | null;
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
  updatedAt: string;
};

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientId: string;
  clientName: string;
  total: number;
  amountDue: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  createdAt: string;
};

export type CatalogItem = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  unitPrice: number;
  unit: string | null;
  taxable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardStats = {
  totalOutstanding: number;
  totalOverdue: number;
  paidThisMonth: number;
  currency: string;
  recentInvoices: InvoiceSummary[];
  overdueInvoices: InvoiceSummary[];
};

export class ApiClientError extends Error {
  status: number;
  code: string;
  field?: string;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? ((await response.json()) as T | ApiErrorBody) : null;

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    throw new ApiClientError(
      response.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? "Request failed.",
      body?.error?.field,
    );
  }

  return payload as T;
}

export async function apiRequest<T>(url: string, init?: RequestInit, retry = true): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
  });

  if (response.status === 401 && retry) {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      return apiRequest<T>(url, init, false);
    }

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiClientError(401, "UNAUTHORIZED", "Authentication required.");
  }

  return parseResponse<T>(response);
}

export function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(input: string): string {
  const iso = input.includes("T") ? input : `${input}T00:00:00.000Z`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatStatus(status: InvoiceStatus): string {
  return status[0].toUpperCase() + status.slice(1);
}

export function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const CURRENCY_OPTIONS = [
  "USD", "EUR", "GBP", "CAD", "AUD", "NZD", "JPY", "SGD", "HKD", "CHF", "SEK", "NOK", "DKK", "INR", "AED",
  "MXN", "BRL", "ZAR", "PLN", "CZK",
];

export const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

export function uiErrorMessage(error: unknown): string {
  if (isApiClientError(error)) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      return "Something went wrong on our end. Try again.";
    }
    return error.message;
  }
  return "Connection lost. Check your internet and try again.";
}
