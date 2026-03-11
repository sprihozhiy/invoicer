import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { actionResponse, handleRouteError, readJsonBody, parseBody } from "@/lib/api";
import { randomToken, sha256, uuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { ForgotPasswordSchema } from "@/lib/validators";
import { resetTokens, users } from "@/lib/schema";
import { nowIso } from "@/lib/time";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(ForgotPasswordSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }
    const { email } = parsed.data;

    const user = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .get();
    if (user) {
      const rawToken = `rst_${randomToken(32)}`;
      const now = nowIso();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      db.insert(resetTokens).values({
        id: uuid(),
        userId: user.id,
        rawToken,
        tokenHash: sha256(rawToken),
        expiresAt,
        usedAt: null,
        createdAt: now,
      }).run();
    }

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
