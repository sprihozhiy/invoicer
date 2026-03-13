import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { handleRouteError } from "@/lib/api";
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

    return Response.json({ profiles }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
