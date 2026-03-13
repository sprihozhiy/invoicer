import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { flatToAddress } from "@/lib/domain";
import { db } from "@/lib/db";
import { businessProfiles } from "@/lib/schema";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rows = db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, user.id))
      .all();

    const profiles = rows.map((row) => ({
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
    }));

    // REVIEW: spec defines GET /api/profile as returning { data: BusinessProfile } (single
    // profile). This implementation returns a list under { data: profiles[] } because the task
    // introduced per-profile [id] routes. The frontend currently calls GET /api/profile and
    // expects a single object. Confirm with product whether to keep this list shape or revert to
    // the single-profile shape from the spec before wiring up the frontend.
    return successResponse(profiles, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}
