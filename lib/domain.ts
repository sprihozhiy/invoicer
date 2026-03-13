import { apiError } from "@/lib/api";
import { ensureCountryCode, ensureCurrency, ensureDate, ensureEmail, ensureInteger, ensureInvoicePrefix, ensureNumber, ensureOptionalString, ensureString, ensureUuid } from "@/lib/validate";
import { Address, BusinessProfile, Client, StoredInvoice, StoredUser } from "@/lib/models";
import { nowIso, todayUtc } from "@/lib/time";
import { uuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { and, eq, isNull } from "drizzle-orm";
import { businessProfiles, clients, invoices } from "@/lib/schema";

type FlatAddressColumns = {
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
};

export function flatToAddress(row: FlatAddressColumns): Address | null {
  if (row.addressLine1 === null) {
    return null;
  }
  return {
    line1: row.addressLine1,
    line2: row.addressLine2 ?? null,
    city: row.addressCity ?? "",
    state: row.addressState ?? null,
    postalCode: row.addressPostalCode ?? null,
    country: row.addressCountry ?? "",
  };
}

export function addressToFlat(address: Address | null | undefined): FlatAddressColumns {
  if (!address) {
    return {
      addressLine1: null,
      addressLine2: null,
      addressCity: null,
      addressState: null,
      addressPostalCode: null,
      addressCountry: null,
    };
  }
  return {
    addressLine1: address.line1,
    addressLine2: address.line2,
    addressCity: address.city,
    addressState: address.state,
    addressPostalCode: address.postalCode,
    addressCountry: address.country,
  };
}

export function getProfileOrFail(userId: string, profileId?: string): BusinessProfile {
  const row = profileId
    ? db
        .select()
        .from(businessProfiles)
        .where(and(eq(businessProfiles.userId, userId), eq(businessProfiles.id, profileId)))
        .get()
    : db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).get();
  if (!row) {
    apiError(404, "NOT_FOUND", "Business profile not found.");
  }

  return {
    id: row.id,
    userId: row.userId,
    businessName: row.businessName,
    logoUrl: row.logoUrl ?? null,
    address: flatToAddress(row),
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    taxId: row.taxId ?? null,
    defaultCurrency: row.defaultCurrency,
    defaultPaymentTermsDays: row.defaultPaymentTermsDays,
    defaultTaxRate: row.defaultTaxRate ?? null,
    defaultNotes: row.defaultNotes ?? null,
    defaultTerms: row.defaultTerms ?? null,
    invoicePrefix: row.invoicePrefix,
    nextInvoiceNumber: row.nextInvoiceNumber,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getBusinessProfile(userId: string): BusinessProfile {
  return getProfileOrFail(userId);
}

export function createDefaultBusinessProfile(userId: string): BusinessProfile {
  const now = nowIso();
  return {
    id: uuid(),
    userId,
    businessName: "",
    logoUrl: null,
    address: null,
    phone: null,
    email: null,
    website: null,
    taxId: null,
    defaultCurrency: "USD",
    defaultPaymentTermsDays: 30,
    defaultTaxRate: null,
    defaultNotes: null,
    defaultTerms: null,
    invoicePrefix: "INV",
    nextInvoiceNumber: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function parseAddress(value: unknown, fieldPrefix = "address"): Address | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    apiError(400, "VALIDATION_ERROR", "address must be an object or null.", fieldPrefix);
  }
  const obj = value as Record<string, unknown>;
  return {
    line1: ensureString(obj.line1, `${fieldPrefix}.line1`, 1, 200),
    line2: ensureOptionalString(obj.line2, `${fieldPrefix}.line2`, 200) ?? null,
    city: ensureString(obj.city, `${fieldPrefix}.city`, 1, 100),
    state: ensureOptionalString(obj.state, `${fieldPrefix}.state`, 100) ?? null,
    postalCode: ensureOptionalString(obj.postalCode, `${fieldPrefix}.postalCode`, 40) ?? null,
    country: ensureCountryCode(obj.country, `${fieldPrefix}.country`),
  };
}

export function applyProfilePatch(profile: BusinessProfile, body: Record<string, unknown>): BusinessProfile {
  if ("businessName" in body) {
    const name = ensureString(body.businessName, "businessName", 1, 200);
    if (!name.trim()) {
      apiError(400, "VALIDATION_ERROR", "businessName cannot be empty.", "businessName");
    }
    profile.businessName = name;
  }

  const address = parseAddress(body.address);
  if (address !== undefined) {
    profile.address = address;
  }

  if ("phone" in body) {
    profile.phone = ensureOptionalString(body.phone, "phone", 50) ?? null;
  }
  if ("email" in body) {
    profile.email = body.email === null ? null : ensureEmail(body.email, "email");
  }
  if ("website" in body) {
    profile.website = ensureOptionalString(body.website, "website", 500) ?? null;
  }
  if ("taxId" in body) {
    profile.taxId = ensureOptionalString(body.taxId, "taxId", 100) ?? null;
  }
  if ("defaultCurrency" in body) {
    profile.defaultCurrency = ensureCurrency(body.defaultCurrency, "defaultCurrency");
  }
  if ("defaultPaymentTermsDays" in body) {
    profile.defaultPaymentTermsDays = ensureInteger(body.defaultPaymentTermsDays, "defaultPaymentTermsDays", 0);
  }
  if ("defaultTaxRate" in body) {
    if (body.defaultTaxRate === null) {
      profile.defaultTaxRate = null;
    } else {
      profile.defaultTaxRate = ensureNumber(body.defaultTaxRate, "defaultTaxRate", 0);
    }
  }
  if ("defaultNotes" in body) {
    profile.defaultNotes = ensureOptionalString(body.defaultNotes, "defaultNotes", 5000) ?? null;
  }
  if ("defaultTerms" in body) {
    profile.defaultTerms = ensureOptionalString(body.defaultTerms, "defaultTerms", 5000) ?? null;
  }
  if ("invoicePrefix" in body) {
    profile.invoicePrefix = ensureInvoicePrefix(body.invoicePrefix, "invoicePrefix");
  }
  if ("nextInvoiceNumber" in body) {
    profile.nextInvoiceNumber = ensureInteger(body.nextInvoiceNumber, "nextInvoiceNumber", 1);
  }

  profile.updatedAt = nowIso();
  return profile;
}

export function parseClientCreate(body: Record<string, unknown>, user: StoredUser): Omit<Client, "id" | "createdAt" | "updatedAt"> {
  const name = ensureString(body.name, "name", 1, 200);
  if (!name.trim()) {
    apiError(400, "VALIDATION_ERROR", "name is required.", "name");
  }

  const profile = getProfileOrFail(user.id);

  return {
    userId: user.id,
    name,
    email: body.email === undefined || body.email === null ? null : ensureEmail(body.email, "email"),
    phone: ensureOptionalString(body.phone, "phone", 50) ?? null,
    company: ensureOptionalString(body.company, "company", 200) ?? null,
    address: parseAddress(body.address) ?? null,
    currency: body.currency === undefined ? profile.defaultCurrency : ensureCurrency(body.currency, "currency"),
    notes: ensureOptionalString(body.notes, "notes", 5000) ?? null,
  };
}

export function applyClientPatch(client: Client, body: Record<string, unknown>): Client {
  if ("name" in body) {
    const name = ensureString(body.name, "name", 1, 200);
    if (!name.trim()) {
      apiError(400, "VALIDATION_ERROR", "name cannot be empty.", "name");
    }
    client.name = name;
  }
  if ("email" in body) {
    client.email = body.email === null ? null : ensureEmail(body.email, "email");
  }
  if ("phone" in body) {
    client.phone = ensureOptionalString(body.phone, "phone", 50) ?? null;
  }
  if ("company" in body) {
    client.company = ensureOptionalString(body.company, "company", 200) ?? null;
  }
  const address = parseAddress(body.address);
  if (address !== undefined) {
    client.address = address;
  }
  if ("currency" in body) {
    client.currency = ensureCurrency(body.currency, "currency");
  }
  if ("notes" in body) {
    client.notes = ensureOptionalString(body.notes, "notes", 5000) ?? null;
  }
  client.updatedAt = nowIso();
  return client;
}

export function parseInvoiceStatusFilter(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const allowed = ["draft", "sent", "partial", "paid", "overdue", "void"];
  if (!allowed.includes(value)) {
    apiError(400, "VALIDATION_ERROR", "Invalid status filter.", "status");
  }
  return value;
}

export function parseInvoiceSortBy(value: string | null): "dueDate" | "createdAt" | "total" | "invoiceNumber" {
  if (!value) {
    return "createdAt";
  }
  const allowed = ["dueDate", "createdAt", "total", "invoiceNumber"] as const;
  if (!(allowed as readonly string[]).includes(value)) {
    apiError(400, "VALIDATION_ERROR", "Invalid sortBy value.", "sortBy");
  }
  return value as "dueDate" | "createdAt" | "total" | "invoiceNumber";
}

export function parseSortDir(value: string | null): "asc" | "desc" {
  if (!value) {
    return "desc";
  }
  if (value !== "asc" && value !== "desc") {
    apiError(400, "VALIDATION_ERROR", "Invalid sortDir value.", "sortDir");
  }
  return value;
}

export function parsePaymentMethod(value: unknown): "cash" | "bank_transfer" | "check" | "credit_card" | "other" {
  const method = ensureString(value, "method", 1, 30) as "cash" | "bank_transfer" | "check" | "credit_card" | "other";
  const allowed = ["cash", "bank_transfer", "check", "credit_card", "other"];
  if (!allowed.includes(method)) {
    apiError(400, "VALIDATION_ERROR", "Invalid payment method.", "method");
  }
  return method;
}

export function requireClientOwned(userId: string, clientId: unknown): Client {
  const id = ensureUuid(clientId, "clientId");
  return getClientOrFail(userId, id);
}

export function getClientOrFail(userId: string, clientId: string): Client {
  const row = db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .get();
  if (!row) {
    apiError(404, "NOT_FOUND", "Client not found.");
  }

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    company: row.company ?? null,
    address: flatToAddress(row),
    currency: row.currency,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function requireInvoiceOwned(userId: string, invoiceId: string): StoredInvoice {
  return getInvoiceOrFail(userId, invoiceId);
}

export function getInvoiceOrFail(userId: string, id: string): StoredInvoice {
  const row = db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId), isNull(invoices.deletedAt)))
    .get();
  if (!row) {
    apiError(404, "NOT_FOUND", "Invoice not found.");
  }
  return {
    id: row.id,
    userId: row.userId,
    clientId: row.clientId,
    invoiceNumber: row.invoiceNumber,
    status: row.status as StoredInvoice["status"],
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currency: row.currency,
    lineItems: row.lineItems as StoredInvoice["lineItems"],
    subtotal: row.subtotal,
    taxRate: row.taxRate ?? null,
    taxAmount: row.taxAmount,
    discountType: (row.discountType ?? null) as StoredInvoice["discountType"],
    discountValue: row.discountValue,
    discountAmount: row.discountAmount,
    total: row.total,
    amountPaid: row.amountPaid,
    amountDue: row.amountDue,
    notes: row.notes ?? null,
    terms: row.terms ?? null,
    sentAt: row.sentAt ?? null,
    paidAt: row.paidAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

export function ensureDueDateAfterIssue(issueDate: string, dueDate: string): void {
  ensureDate(issueDate, "issueDate");
  ensureDate(dueDate, "dueDate");
  if (dueDate < issueDate) {
    apiError(400, "VALIDATION_ERROR", "dueDate must be greater than or equal to issueDate.", "dueDate");
  }
}

export function todayDate(): string {
  return todayUtc();
}
