import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { handleRouteError, readJsonBody } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { applyProfilePatch, addressToFlat, getProfileOrFail } from "@/lib/domain";
import { db } from "@/lib/db";
import { businessProfiles } from "@/lib/schema";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;
    return Response.json(getProfileOrFail(user.id, id), { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;

    const profile = getProfileOrFail(user.id, id);
    const body = await readJsonBody<Record<string, unknown>>(req);
    const updatedProfile = applyProfilePatch(profile, body);

    db.update(businessProfiles)
      .set({
        businessName: updatedProfile.businessName,
        logoUrl: updatedProfile.logoUrl,
        ...addressToFlat(updatedProfile.address),
        phone: updatedProfile.phone,
        email: updatedProfile.email,
        website: updatedProfile.website,
        taxId: updatedProfile.taxId,
        defaultCurrency: updatedProfile.defaultCurrency,
        defaultPaymentTermsDays: updatedProfile.defaultPaymentTermsDays,
        defaultTaxRate: updatedProfile.defaultTaxRate,
        defaultNotes: updatedProfile.defaultNotes,
        defaultTerms: updatedProfile.defaultTerms,
        invoicePrefix: updatedProfile.invoicePrefix,
        nextInvoiceNumber: updatedProfile.nextInvoiceNumber,
        updatedAt: updatedProfile.updatedAt,
      })
      .where(and(eq(businessProfiles.id, id), eq(businessProfiles.userId, user.id)))
      .run();

    return Response.json(updatedProfile, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req);
    const { id } = await context.params;

    getProfileOrFail(user.id, id);
    db.delete(businessProfiles)
      .where(and(eq(businessProfiles.id, id), eq(businessProfiles.userId, user.id)))
      .run();

    return Response.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
