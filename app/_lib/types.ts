export type UUID = string;
export type ISODateTime = string;
export type ISODate = string;
export type CurrencyCode = string;
export type Cents = number;

export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "void";

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
}

export interface User {
  id: UUID;
  email: string;
  name: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface BusinessProfile {
  id: UUID;
  userId: UUID;
  businessName: string;
  logoUrl: string | null;
  address: Address | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  defaultCurrency: CurrencyCode;
  defaultPaymentTermsDays: number;
  defaultTaxRate: number | null;
  defaultNotes: string | null;
  defaultTerms: string | null;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Client {
  id: UUID;
  userId: UUID;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: Address | null;
  currency: CurrencyCode;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ClientWithStats extends Client {
  totalInvoiced: Cents;
  totalPaid: Cents;
  totalOutstanding: Cents;
  lastInvoiceDate: ISODate | null;
}

export interface LineItem {
  id: UUID;
  description: string;
  quantity: number;
  unitPrice: Cents;
  taxable: boolean;
  amount: Cents;
  sortOrder: number;
}

export interface Payment {
  id: UUID;
  amount: Cents;
  paidAt: ISODate;
  method: "cash" | "bank_transfer" | "check" | "credit_card" | "other";
  reference: string | null;
  note: string | null;
  createdAt: ISODateTime;
}

export interface Invoice {
  id: UUID;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientId: UUID;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  clientAddress: Address | null;
  businessName: string;
  businessAddress: Address | null;
  businessLogoUrl: string | null;
  currency: CurrencyCode;
  issueDate: ISODate;
  dueDate: ISODate;
  lineItems: LineItem[];
  subtotal: Cents;
  taxRate: number;
  taxAmount: Cents;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: Cents;
  total: Cents;
  amountPaid: Cents;
  amountDue: Cents;
  notes: string | null;
  paymentTerms: string | null;
  sentAt: ISODateTime | null;
  paidAt: ISODateTime | null;
  payments: Payment[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface InvoiceSummary {
  id: UUID;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientId: UUID;
  clientName: string;
  total: Cents;
  amountDue: Cents;
  currency: CurrencyCode;
  issueDate: ISODate;
  dueDate: ISODate;
  createdAt: ISODateTime;
}

export interface CatalogItem {
  id: UUID;
  name: string;
  description: string | null;
  unitPrice: Cents;
  unit: string | null;
  taxable: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface DashboardStats {
  totalOutstanding: Cents;
  totalOverdue: Cents;
  paidThisMonth: Cents;
  currency: CurrencyCode;
  recentInvoices: InvoiceSummary[];
  overdueInvoices: InvoiceSummary[];
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface PaginatedEnvelope<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
}

export type AsyncState<T> = {
  loading: boolean;
  data: T | null;
  error: string | null;
};

export function initialState<T>(): AsyncState<T> {
  return { loading: true, data: null, error: null };
}
