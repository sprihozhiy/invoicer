"use client";

export type ApiEnvelope<T> = { data: T };
export type PaginatedEnvelope<T> = { data: T[]; meta: { total: number; page: number; limit: number } };
export type ApiErrorBody = { error: { code: string; message: string; field?: string } };

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

export async function requestJson<T>(url: string, init?: RequestInit, retry = true): Promise<T> {
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
      return requestJson<T>(url, init, false);
    }
  }

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

export function toMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(date: string): string {
  const iso = date.includes("T") ? date : `${date}T00:00:00.000Z`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}
