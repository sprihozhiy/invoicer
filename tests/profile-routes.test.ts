import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import * as schema from "@/lib/schema";
import { createTestDb, seedProfile, seedUser } from "./helpers/db";

async function loadProfileRoutes() {
  const testDb = createTestDb();
  vi.resetModules();
  globalThis.__invoicer_db__ = testDb.db;

  const auth = await import("@/lib/auth");
  const profileRoute = await import("@/app/api/profile/route");
  const profileByIdRoute = await import("@/app/api/profile/[id]/route");

  return {
    ...testDb,
    auth,
    profileRoute,
    profileByIdRoute,
  };
}

function authedRequest(url: string, accessToken: string, options?: RequestInit): NextRequest {
  return new NextRequest(url, {
    ...options,
    headers: {
      ...(options?.headers as Record<string, string> | undefined),
      cookie: `invoicer_access=${accessToken}`,
    },
  });
}

describe("profile route migration tests", () => {
  afterEach(() => {
    delete globalThis.__invoicer_db__;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("GET /api/profile returns all profiles for the authed user", async () => {
    const { db, sqlite, auth, profileRoute } = await loadProfileRoutes();
    try {
      const user = await seedUser(db, { email: "owner@example.com" });
      const other = await seedUser(db, { email: "other@example.com" });

      const owned = await seedProfile(db, user.id, {
        businessName: "Owned Business",
        addressLine1: "123 Main St",
        addressCity: "Edmonton",
        addressCountry: "CA",
      });
      await seedProfile(db, other.id, {
        businessName: "Other Business",
      });

      const { accessToken } = auth.issueSession(user.id);
      const response = await profileRoute.GET(authedRequest("http://localhost/api/profile", accessToken));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.profiles).toHaveLength(1);
      expect(json.profiles[0].id).toBe(owned.id);
      expect(json.profiles[0].businessName).toBe("Owned Business");
      expect(json.profiles[0].address).toEqual({
        line1: "123 Main St",
        line2: null,
        city: "Edmonton",
        state: null,
        postalCode: null,
        country: "CA",
      });
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/profile/[id] returns full profile", async () => {
    const { db, sqlite, auth, profileByIdRoute } = await loadProfileRoutes();
    try {
      const user = await seedUser(db);
      const profile = await seedProfile(db, user.id, {
        businessName: "Northwind",
      });

      const { accessToken } = auth.issueSession(user.id);
      const response = await profileByIdRoute.GET(
        authedRequest(`http://localhost/api/profile/${profile.id}`, accessToken),
        { params: Promise.resolve({ id: profile.id }) },
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.id).toBe(profile.id);
      expect(json.userId).toBe(user.id);
      expect(json.businessName).toBe("Northwind");
    } finally {
      sqlite.close();
    }
  });

  it("PATCH /api/profile/[id] applies profile patch and returns updated profile", async () => {
    const { db, sqlite, auth, profileByIdRoute } = await loadProfileRoutes();
    try {
      const user = await seedUser(db);
      const profile = await seedProfile(db, user.id, {
        businessName: "Old Name",
      });

      const { accessToken } = auth.issueSession(user.id);
      const response = await profileByIdRoute.PATCH(
        authedRequest(`http://localhost/api/profile/${profile.id}`, accessToken, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            businessName: "New Name",
            address: {
              line1: "88 Jasper Ave",
              city: "Edmonton",
              country: "CA",
            },
            defaultCurrency: "CAD",
          }),
        }),
        { params: Promise.resolve({ id: profile.id }) },
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.id).toBe(profile.id);
      expect(json.businessName).toBe("New Name");
      expect(json.defaultCurrency).toBe("CAD");
      expect(json.address).toEqual({
        line1: "88 Jasper Ave",
        line2: null,
        city: "Edmonton",
        state: null,
        postalCode: null,
        country: "CA",
      });
    } finally {
      sqlite.close();
    }
  });

  it("DELETE /api/profile/[id] returns { deleted: true }", async () => {
    const { db, sqlite, auth, profileByIdRoute } = await loadProfileRoutes();
    try {
      const user = await seedUser(db);
      const profile = await seedProfile(db, user.id);

      const { accessToken } = auth.issueSession(user.id);
      const response = await profileByIdRoute.DELETE(
        authedRequest(`http://localhost/api/profile/${profile.id}`, accessToken, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: profile.id }) },
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ deleted: true });

      const row = await db.query.businessProfiles.findFirst({
        where: and(
          eq(schema.businessProfiles.userId, user.id),
          eq(schema.businessProfiles.id, profile.id),
        ),
      });
      expect(row).toBeUndefined();
    } finally {
      sqlite.close();
    }
  });
});
