import { apiError } from "@/lib/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;
const INVOICE_PREFIX_REGEX = /^[A-Za-z0-9-]{1,10}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T/;
const COUNTRY_REGEX = /^[A-Z]{2}$/;

export function ensureString(value: unknown, field: string, min = 0, max = 10_000): string {
  if (typeof value !== "string") {
    apiError(400, "VALIDATION_ERROR", `${field} must be a string.`, field);
  }
  if (value.length < min || value.length > max) {
    apiError(400, "VALIDATION_ERROR", `${field} length is invalid.`, field);
  }
  return value;
}

export function ensureOptionalString(value: unknown, field: string, max = 10_000): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    apiError(400, "VALIDATION_ERROR", `${field} must be a string or null.`, field);
  }
  if (value.length > max) {
    apiError(400, "VALIDATION_ERROR", `${field} length is invalid.`, field);
  }
  return value;
}

export function ensureEmail(value: unknown, field: string): string {
  const email = ensureString(value, field, 3, 320).toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    apiError(400, "VALIDATION_ERROR", `${field} must be a valid email address.`, field);
  }
  return email;
}

export function ensurePassword(value: unknown, field = "password"): string {
  const password = ensureString(value, field, 8, 128);
  if (!PASSWORD_REGEX.test(password)) {
    apiError(400, "VALIDATION_ERROR", "Password must have at least 8 chars, one uppercase, and one digit.", field);
  }
  return password;
}

export function ensureCurrency(value: unknown, field: string): string {
  const currency = ensureString(value, field, 3, 3).toUpperCase();
  if (!CURRENCY_REGEX.test(currency)) {
    apiError(400, "VALIDATION_ERROR", `${field} must be an ISO 4217 currency code.`, field);
  }
  return currency;
}

export function ensureInteger(value: unknown, field: string, min?: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    apiError(400, "VALIDATION_ERROR", `${field} must be an integer.`, field);
  }
  if (min !== undefined && value < min) {
    apiError(400, "VALIDATION_ERROR", `${field} is too small.`, field);
  }
  return value;
}

export function ensureNumber(value: unknown, field: string, min?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    apiError(400, "VALIDATION_ERROR", `${field} must be a number.`, field);
  }
  if (min !== undefined && value < min) {
    apiError(400, "VALIDATION_ERROR", `${field} is too small.`, field);
  }
  return value;
}

export function ensureDate(value: unknown, field: string): string {
  const date = ensureString(value, field, 10, 10);
  if (!DATE_REGEX.test(date)) {
    apiError(400, "VALIDATION_ERROR", `${field} must be ISO date YYYY-MM-DD.`, field);
  }
  return date;
}

export function ensureIsoDateTime(value: unknown, field: string): string {
  const iso = ensureString(value, field, 20, 40);
  if (!ISO_DATETIME_REGEX.test(iso)) {
    apiError(400, "VALIDATION_ERROR", `${field} must be ISO datetime.`, field);
  }
  return iso;
}

export function ensureInvoicePrefix(value: unknown, field: string): string {
  const prefix = ensureString(value, field, 1, 10);
  if (!INVOICE_PREFIX_REGEX.test(prefix)) {
    apiError(400, "VALIDATION_ERROR", `${field} format is invalid.`, field);
  }
  return prefix;
}

export function ensureUuid(value: unknown, field: string): string {
  const id = ensureString(value, field, 1, 64);
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    apiError(400, "VALIDATION_ERROR", `${field} must be a UUID.`, field);
  }
  return id;
}

export function ensureCountryCode(value: unknown, field: string): string {
  const country = ensureString(value, field, 2, 2).toUpperCase();
  if (!COUNTRY_REGEX.test(country)) {
    apiError(400, "VALIDATION_ERROR", `${field} must be ISO alpha-2.`, field);
  }
  return country;
}
