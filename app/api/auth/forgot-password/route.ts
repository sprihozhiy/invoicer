import { NextRequest } from "next/server";

import { actionResponse, handleRouteError, readJsonBody } from "@/lib/api";
import { ensureEmail } from "@/lib/validate";
import { randomToken, sha256, uuid } from "@/lib/ids";
import { store } from "@/lib/store";
import { nowIso } from "@/lib/time";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(req);
    const email = ensureEmail(body.email, "email");

    const user = store.users.find((item) => item.email === email);
    if (user) {
      const rawToken = randomToken(32);
      const now = nowIso();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      store.passwordResetTokens.push({
        id: uuid(),
        userId: user.id,
        rawToken,
        tokenHash: sha256(rawToken),
        expiresAt,
        usedAt: null,
        createdAt: now,
      });
    }

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
