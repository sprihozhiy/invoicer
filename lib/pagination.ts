import { apiError } from "@/lib/api";

export function parsePagination(pageInput: string | null, limitInput: string | null): { page: number; limit: number; offset: number } {
  const page = pageInput ? Number(pageInput) : 1;
  const limit = limitInput ? Number(limitInput) : 20;

  if (!Number.isInteger(page) || page < 1) {
    apiError(400, "VALIDATION_ERROR", "page must be an integer >= 1.", "page");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    apiError(400, "VALIDATION_ERROR", "limit must be an integer between 1 and 100.", "limit");
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}
