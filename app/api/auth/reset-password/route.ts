import { NextRequest } from "next/server";

import { actionResponse, apiError, handleRouteError, readJsonBody } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { sha256 } from "@/lib/ids";
import { store } from "@/lib/store";
import { ensurePassword, ensureString } from "@/lib/validate";
import { nowIso } from "@/lib/time";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(req);
    const token = ensureString(body.token, "token", 1, 500);
    const newPassword = ensurePassword(body.newPassword, "newPassword");

    const record = store.passwordResetTokens.find((item) => item.tokenHash === sha256(token));
    if (!record) {
      apiError(400, "TOKEN_INVALID", "Token is invalid.");
    }
    if (record.usedAt) {
      apiError(400, "TOKEN_USED", "Token already used.");
    }
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      apiError(400, "TOKEN_INVALID", "Token is invalid.");
    }

    const user = store.users.find((item) => item.id === record.userId);
    if (!user) {
      apiError(400, "TOKEN_INVALID", "Token is invalid.");
    }

    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = nowIso();
    record.usedAt = nowIso();

    return actionResponse(200);
  } catch (error) {
    return handleRouteError(error);
  }
}
