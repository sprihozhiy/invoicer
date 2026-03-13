export type UUID = string;
export type ISODateTime = string;
export type ISODate = string;
export type CurrencyCode = string;
export type Cents = number;

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

export type StoredInvoiceStatus = "draft" | "sent" | "partial" | "paid" | "void";
export type InvoiceStatus = StoredInvoiceStatus | "overdue";
export type DiscountType = "percentage" | "fixed";

export interface LineItem {
  id: UUID;
  description: string;
  quantity: number;
  unitPrice: Cents;
  amount: Cents;
  taxable: boolean;
}

export interface Invoice {
  id: UUID;
  userId: UUID;
  clientId: UUID;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: ISODate;
  dueDate: ISODate;
  currency: CurrencyCode;
  lineItems: LineItem[];
  subtotal: Cents;
  taxRate: number | null;
  taxAmount: Cents;
  discountType: DiscountType | null;
  discountValue: number;
  discountAmount: Cents;
  total: Cents;
  amountPaid: Cents;
  amountDue: Cents;
  notes: string | null;
  terms: string | null;
  sentAt: ISODateTime | null;
  paidAt: ISODateTime | null;
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

export type PaymentMethod = "cash" | "bank_transfer" | "check" | "credit_card" | "other";

export interface Payment {
  id: UUID;
  invoiceId: UUID;
  amount: Cents;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paidAt: ISODate;
  createdAt: ISODateTime;
}

export interface CatalogItem {
  id: UUID;
  userId: UUID;
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

export interface RefreshTokenRecord {
  id: UUID;
  userId: UUID;
  tokenHash: string;
  expiresAt: ISODateTime;
  usedAt: ISODateTime | null;
  createdAt: ISODateTime;
}

export interface PasswordResetTokenRecord {
  id: UUID;
  userId: UUID;
  tokenHash: string;
  expiresAt: ISODateTime;
  usedAt: ISODateTime | null;
  createdAt: ISODateTime;
}

export interface StoredUser extends User {
  passwordHash: string;
}

export interface StoredInvoice extends Omit<Invoice, "status"> {
  status: StoredInvoiceStatus;
  deletedAt: ISODateTime | null;
}

export interface AccessTokenRecord {
  token: string;
  userId: UUID;
  expiresAt: ISODateTime;
}

export interface StoredResetToken {
  id: UUID;
  userId: UUID;
  tokenHash: string;
  rawToken: string;
  expiresAt: ISODateTime;
  usedAt: ISODateTime | null;
  createdAt: ISODateTime;
}
