import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { apiError, handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeInvoiceNumber } from "@/lib/invoices";
import { businessProfiles } from "@/lib/schema";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const profile = db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, user.id))
      .get();
    if (!profile) {
      apiError(500, "INTERNAL_SERVER_ERROR", "Business profile not found.");
    }
    return successResponse(
      { invoiceNumber: computeInvoiceNumber(profile.invoicePrefix, profile.nextInvoiceNumber) },
      200,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
