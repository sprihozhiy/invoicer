import { NextRequest } from "next/server";

import { handleRouteError, readJsonBody, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { applyProfilePatch, getBusinessProfile } from "@/lib/domain";

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
    return successResponse(profile, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}
