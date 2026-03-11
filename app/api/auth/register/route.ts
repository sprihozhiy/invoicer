import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { handleRouteError, readJsonBody, successResponse, apiError, parseBody } from "@/lib/api";
import { sanitizeUser, hashPassword, issueSession, setSessionCookies } from "@/lib/auth";
import { uuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { RegisterSchema } from "@/lib/validators";
import { businessProfiles, users } from "@/lib/schema";
import { nowIso } from "@/lib/time";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody<unknown>(req);
    const parsed = parseBody(RegisterSchema, body);
    if (!parsed.ok) {
      return parsed.response;
    }
    const { name, email, password } = parsed.data;

    // REVIEW: TOCTOU race — two concurrent requests with the same email can both
    // pass this SELECT check before either INSERT completes. SQLite will catch the
    // unique constraint violation on `users.email`, but handleRouteError maps
    // non-ApiError exceptions to 500 rather than 409. Fix: catch the SQLITE
    // constraint error (error.code === 'SQLITE_CONSTRAINT_UNIQUE') and re-throw as
    // apiError(409, 'EMAIL_TAKEN', ...).
    const existingUser = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .get();
    if (existingUser) {
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
    db.transaction((tx) => {
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

    const response = successResponse(sanitizeUser(user), 201);
    setSessionCookies(response, issueSession(user.id));
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
