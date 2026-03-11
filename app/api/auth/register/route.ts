import { NextRequest } from "next/server";

import { actionResponse, apiError, handleRouteError, parseBody, readJsonBody, successResponse } from "@/lib/api";
import { sanitizeUser, hashPassword, issueSession, setSessionCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Db } from "@/lib/db";
import { uuid } from "@/lib/ids";
import { businessProfiles, users } from "@/lib/schema";
import { nowIso } from "@/lib/time";
import { RegisterSchema } from "@/lib/validators";

function isSqliteUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybe = error as { code?: string; message?: string };
  return (
    maybe.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    maybe.code === "SQLITE_CONSTRAINT" ||
    maybe.message?.includes("UNIQUE constraint failed: users.email") === true
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(RegisterSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }

    const now = nowIso();
    const user = {
      id: uuid(),
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: hashPassword(parsed.data.password),
      createdAt: now,
      updatedAt: now,
    };

    try {
      db.transaction((tx: Db) => {
        tx.insert(users).values(user).run();
        tx.insert(businessProfiles).values({
          id: uuid(),
          userId: user.id,
          businessName: user.name,
          logoUrl: null,
          addressLine1: null,
          addressLine2: null,
          addressCity: null,
          addressState: null,
          addressPostalCode: null,
          addressCountry: null,
          phone: null,
          email: null,
          website: null,
          taxId: null,
          defaultCurrency: "USD",
          defaultPaymentTermsDays: 30,
          defaultTaxRate: null,
          defaultNotes: null,
          defaultTerms: null,
          invoicePrefix: "INV",
          nextInvoiceNumber: 1,
          createdAt: now,
          updatedAt: now,
        }).run();
      });
    } catch (error) {
      if (isSqliteUniqueConstraintError(error)) {
        apiError(409, "EMAIL_TAKEN", "Email is already registered.");
      }
      throw error;
    }

    const response = successResponse(sanitizeUser(user), 201);
    setSessionCookies(response, issueSession(user.id));
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}

export function GET() {
  return actionResponse(405);
}
