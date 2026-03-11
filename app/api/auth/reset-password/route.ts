import { NextRequest } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";

import { actionResponse, apiError, handleRouteError, parseBody, readJsonBody } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Db } from "@/lib/db";
import { sha256 } from "@/lib/ids";
import { resetTokens, users } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { ResetPasswordSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(ResetPasswordSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }

    const tokenHash = sha256(parsed.data.token);
    const now = nowIso();

    const activeToken = db
      .select()
      .from(resetTokens)
      .where(
        and(
          eq(resetTokens.tokenHash, tokenHash),
          isNull(resetTokens.usedAt),
          gt(resetTokens.expiresAt, now),
        ),
      )
      .get();

    if (!activeToken) {
      const tokenRecord = db
        .select()
        .from(resetTokens)
        .where(eq(resetTokens.tokenHash, tokenHash))
        .get();
      if (tokenRecord?.usedAt) {
        apiError(400, "TOKEN_USED", "Token already used.");
      }
      apiError(400, "INVALID_TOKEN", "Token is invalid.");
    }

    const updatedPasswordHash = hashPassword(parsed.data.password);
    db.transaction((tx: Db) => {
      const updatedUsers = tx
        .update(users)
        .set({
          passwordHash: updatedPasswordHash,
          updatedAt: nowIso(),
        })
        .where(eq(users.id, activeToken.userId))
        .run();
      if (!updatedUsers.changes) {
        apiError(400, "INVALID_TOKEN", "Token is invalid.");
      }

      tx.update(resetTokens)
        .set({ usedAt: nowIso() })
        .where(eq(resetTokens.id, activeToken.id))
        .run();
    });

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
