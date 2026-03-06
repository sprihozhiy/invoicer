import { NextRequest } from "next/server";

import { handleRouteError, readJsonBody, successResponse, apiError } from "@/lib/api";
import { sanitizeUser, verifyPassword, issueSession, setSessionCookies } from "@/lib/auth";
import { ensureEmail, ensureString } from "@/lib/validate";
import { store } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(req);
    const email = ensureEmail(body.email, "email");
    const password = ensureString(body.password, "password", 1, 128);

    const user = store.users.find((item) => item.email === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      apiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const response = successResponse(sanitizeUser(user), 200);
    setSessionCookies(response, issueSession(user.id));
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
