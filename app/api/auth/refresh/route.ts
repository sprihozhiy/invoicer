import { NextRequest } from "next/server";

import { actionResponse, handleRouteError } from "@/lib/api";
import { getRefreshCookie, rotateRefreshToken, setSessionCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const raw = getRefreshCookie(req);
    const { tokens } = rotateRefreshToken(raw);
    const response = actionResponse(200);
    setSessionCookies(response, tokens);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
