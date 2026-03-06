import { NextRequest } from "next/server";

import { handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/domain";
import { computeInvoiceNumber } from "@/lib/invoices";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const profile = getBusinessProfile(user.id);
    return successResponse({ invoiceNumber: computeInvoiceNumber(profile.invoicePrefix, profile.nextInvoiceNumber) }, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}
