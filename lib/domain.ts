import { apiError } from "@/lib/api";
import { ensureCountryCode, ensureCurrency, ensureDate, ensureEmail, ensureInteger, ensureInvoicePrefix, ensureNumber, ensureOptionalString, ensureString, ensureUuid } from "@/lib/validate";
import { Address, BusinessProfile, Client, StoredInvoice, StoredUser } from "@/lib/models";
import { nowIso, todayUtc } from "@/lib/time";
import { store } from "@/lib/store";
import { uuid } from "@/lib/ids";

export function getBusinessProfile(userId: string): BusinessProfile {
  const profile = store.businessProfiles.find((item) => item.userId === userId);
  if (!profile) {
    apiError(500, "INTERNAL_SERVER_ERROR", "Business profile not found.");
  }
  return profile;
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

  const profile = getBusinessProfile(user.id);

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
  const client = store.clients.find((item) => item.id === id && item.userId === userId);
  if (!client) {
    apiError(404, "NOT_FOUND", "Client not found.");
  }
  return client;
}

export function requireInvoiceOwned(userId: string, invoiceId: string): StoredInvoice {
  const invoice = store.invoices.find((item) => item.id === invoiceId && item.userId === userId && item.deletedAt === null);
  if (!invoice) {
    apiError(404, "NOT_FOUND", "Invoice not found.");
  }
  return invoice;
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
