import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";

import { actionResponse, apiError, handleRouteError, readJsonBody, parseBody } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/ids";
import { ResetPasswordSchema } from "@/lib/validators";
import { resetTokens, users } from "@/lib/schema";
import { nowIso } from "@/lib/time";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(ResetPasswordSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }
    const { token, password } = parsed.data;
    const now = nowIso();

    const record = db
      .select()
      .from(resetTokens)
      .where(
        and(
          eq(resetTokens.tokenHash, sha256(token)),
          isNull(resetTokens.usedAt),
          gt(resetTokens.expiresAt, now),
        ),
      )
      .get();
    if (!record) {
      apiError(400, "INVALID_TOKEN", "Token is invalid or expired.");
    }

    db.transaction((tx) => {
      const updateUserResult = tx.update(users)
        .set({
          passwordHash: hashPassword(password),
          updatedAt: nowIso(),
        })
        .where(eq(users.id, record.userId))
        .run();
      if (updateUserResult.changes === 0) {
        apiError(400, "INVALID_TOKEN", "Token is invalid or expired.");
      }

      tx.update(resetTokens)
        .set({ usedAt: nowIso() })
        .where(eq(resetTokens.id, record.id))
        .run();
    });

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
