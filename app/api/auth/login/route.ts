import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { handleRouteError, readJsonBody, successResponse, apiError, parseBody } from "@/lib/api";
import { sanitizeUser, verifyPassword, issueSession, setSessionCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { LoginSchema } from "@/lib/validators";
import { users } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(LoginSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }
    const { email, password } = parsed.data;

    const user = db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();
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
