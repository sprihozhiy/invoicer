import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { applyProfilePatch, getBusinessProfile } from "@/lib/domain";
import { db } from "@/lib/db";
import { businessProfiles } from "@/lib/schema";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    return successResponse(getBusinessProfile(user.id), 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const profile = getBusinessProfile(user.id);
    const body = await readJsonBody<Record<string, unknown>>(req);
    applyProfilePatch(profile, body);

    db.update(businessProfiles)
      .set({
        businessName: profile.businessName,
        phone: profile.phone,
        email: profile.email,
        website: profile.website,
        taxId: profile.taxId,
        defaultCurrency: profile.defaultCurrency,
        defaultPaymentTermsDays: profile.defaultPaymentTermsDays,
        defaultTaxRate: profile.defaultTaxRate,
        defaultNotes: profile.defaultNotes,
        defaultTerms: profile.defaultTerms,
        invoicePrefix: profile.invoicePrefix,
        nextInvoiceNumber: profile.nextInvoiceNumber,
        addressLine1: profile.address?.line1 ?? null,
        addressLine2: profile.address?.line2 ?? null,
        addressCity: profile.address?.city ?? null,
        addressState: profile.address?.state ?? null,
        addressPostalCode: profile.address?.postalCode ?? null,
        addressCountry: profile.address?.country ?? null,
        updatedAt: profile.updatedAt,
      })
      .where(eq(businessProfiles.userId, user.id))
      .run();

    return successResponse(profile, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}
