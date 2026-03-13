import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { actionResponse, apiError, handleRouteError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/domain";
import { db } from "@/lib/db";
import { businessProfiles } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { randomToken } from "@/lib/ids";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MIME_TYPES = new Set(["image/jpeg", "image/png"]);

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const profile = getBusinessProfile(user.id);

    const form = await req.formData();
    const file = form.get("logo");
    if (!(file instanceof File)) {
      apiError(400, "VALIDATION_ERROR", "No logo file was provided.");
    }

    if (!MIME_TYPES.has(file.type)) {
      apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Only JPEG and PNG files are accepted.");
    }

    if (file.size > MAX_LOGO_BYTES) {
      apiError(413, "FILE_TOO_LARGE", "File exceeds 2 MB limit.");
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const logoUrl = `https://cdn.invoicer.local/logos/${user.id}/${randomToken(10)}.${ext}`;
    const updatedAt = nowIso();

    db.update(businessProfiles)
      .set({ logoUrl, updatedAt })
      .where(eq(businessProfiles.userId, user.id))
      .run();

    return successResponse({ logoUrl }, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = requireAuth(req);
    // Verify the profile exists before clearing
    getBusinessProfile(user.id);

    db.update(businessProfiles)
      .set({ logoUrl: null, updatedAt: nowIso() })
      .where(eq(businessProfiles.userId, user.id))
      .run();

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
