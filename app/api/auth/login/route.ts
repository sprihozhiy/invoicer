import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { apiError, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/api";
import { sanitizeUser, verifyPassword, issueSession, setSessionCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { LoginSchema } from "@/lib/validators";

const DUMMY_PASSWORD_HASH =
  "da8e2ece4f4f3849bbf0d5d3b306dc9d5add4f13d4f4f9f782f41f3ee3bf2cd8e5af5ea5d90585f6729e2f6fd4e3156c46eda86a9d3801473fd5da39f5d9efc4";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(LoginSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .get();

    const matched = verifyPassword(
      parsed.data.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !matched) {
      apiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const response = successResponse(sanitizeUser(user), 200);
    setSessionCookies(response, issueSession(user.id));
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
