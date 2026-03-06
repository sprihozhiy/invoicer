import { NextRequest, NextResponse } from "next/server";

const MAX_JSON_REQUEST_BYTES = 1024 * 1024;
const MAX_JSON_RESPONSE_BYTES = 1024 * 1024;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  status: number;
  code: string;
  field?: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, field?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
    this.details = details;
  }
}

export function apiError(status: number, code: string, message: string, field?: string, details?: unknown): never {
  throw new ApiError(status, code, message, field, details);
}

export function errorResponse(status: number, code: string, message: string, field?: string, details?: unknown): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(field ? { field } : {}),
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  );
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  const payload = { data };
  const size = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (size > MAX_JSON_RESPONSE_BYTES) {
    return errorResponse(500, "RESPONSE_TOO_LARGE", "Response exceeds size limit.");
  }
  return NextResponse.json(payload, { status });
}

export function paginatedResponse<T>(data: T[], meta: { total: number; page: number; limit: number }): NextResponse {
  const payload = { data, meta };
  const size = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (size > MAX_JSON_RESPONSE_BYTES) {
    return errorResponse(500, "RESPONSE_TOO_LARGE", "Response exceeds size limit.");
  }
  return NextResponse.json(payload, { status: 200 });
}

export function actionResponse(status = 200): NextResponse<{ success: true }> {
  return NextResponse.json({ success: true }, { status });
}

export async function readJsonBody<T>(req: NextRequest): Promise<T> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    apiError(400, "VALIDATION_ERROR", "Expected application/json body.");
  }
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_JSON_REQUEST_BYTES) {
    apiError(413, "REQUEST_TOO_LARGE", "Request body exceeds size limit.");
  }
  if (!text.trim()) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    apiError(400, "VALIDATION_ERROR", "Malformed JSON body.");
  }
}

export function toInt(value: string | null, fallback: number): number {
  if (value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    apiError(400, "VALIDATION_ERROR", "Must be an integer.");
  }
  return parsed;
}

export function handleRouteError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.code, error.message, error.field, error.details);
  }
  return errorResponse(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
}
