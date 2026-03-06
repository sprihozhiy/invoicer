import { NextRequest } from "next/server";

import { actionResponse, handleRouteError, readJsonBody, successResponse, apiError } from "@/lib/api";
import { createDefaultBusinessProfile } from "@/lib/domain";
import { sanitizeUser, hashPassword, issueSession, setSessionCookies } from "@/lib/auth";
import { ensureEmail, ensurePassword, ensureString } from "@/lib/validate";
import { uuid } from "@/lib/ids";
import { nowIso } from "@/lib/time";
import { store } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(req);
    const name = ensureString(body.name, "name", 1, 100);
    const email = ensureEmail(body.email, "email");
    const password = ensurePassword(body.password, "password");

    if (store.users.some((user) => user.email === email)) {
      apiError(409, "EMAIL_TAKEN", "Email is already registered.");
    }

    const now = nowIso();
    const user = {
      id: uuid(),
      name,
      email,
      passwordHash: hashPassword(password),
      createdAt: now,
      updatedAt: now,
    };
    store.users.push(user);
    store.businessProfiles.push(createDefaultBusinessProfile(user.id));

    const response = successResponse(sanitizeUser(user), 200);
    setSessionCookies(response, issueSession(user.id));
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}

export function GET() {
  return actionResponse(405);
}
