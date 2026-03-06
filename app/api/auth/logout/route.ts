import { NextRequest } from "next/server";

import { actionResponse, handleRouteError } from "@/lib/api";
import { clearSessionCookies, invalidateRefreshToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("invoicer_refresh")?.value;
    invalidateRefreshToken(refreshToken);
    const response = actionResponse(200);
    clearSessionCookies(response);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
