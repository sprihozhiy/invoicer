import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { actionResponse, handleRouteError, readJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { ensureEmail } from "@/lib/validate";
import { randomToken, sha256, uuid } from "@/lib/ids";
import { resetTokens, users } from "@/lib/schema";
import { nowIso } from "@/lib/time";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(req);
    const email = ensureEmail(body.email, "email");

    const user = db.select().from(users).where(eq(users.email, email)).get();
    if (user) {
      const rawToken = randomToken(32);
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
