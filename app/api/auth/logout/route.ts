import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { actionResponse, handleRouteError } from "@/lib/api";
import { clearSessionCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/ids";
import { accessTokens, refreshTokens } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("invoicer_refresh")?.value;
    if (refreshToken) {
      db.delete(refreshTokens)
        .where(eq(refreshTokens.tokenHash, sha256(refreshToken)))
        .run();
    }
    const accessToken = req.cookies.get("invoicer_access")?.value;
    if (accessToken) {
      db.delete(accessTokens)
        .where(eq(accessTokens.token, accessToken))
        .run();
    }

    const response = actionResponse(200);
    clearSessionCookies(response);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
