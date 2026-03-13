import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";

import { createTestDb, seedCatalogItem, seedUser } from "./helpers/db";
import { catalogItems } from "@/lib/schema";

async function loadCatalogRoutes() {
  const testDb = createTestDb();
  vi.resetModules();
  globalThis.__invoicer_db__ = testDb.db;

  const auth = await import("@/lib/auth");
  const catalogRoute = await import("@/app/api/catalog/route");
  const catalogByIdRoute = await import("@/app/api/catalog/[id]/route");

  return {
    ...testDb,
    auth,
    catalogRoute,
    catalogByIdRoute,
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

describe("F11 catalog route migration tests", () => {
  afterEach(() => {
    delete globalThis.__invoicer_db__;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("GET /api/catalog lists all catalogs for user and returns { data }", async () => {
    const { db, sqlite, auth, catalogRoute } = await loadCatalogRoutes();
    try {
      const user = await seedUser(db, { email: "owner@example.com" });
      const otherUser = await seedUser(db, { email: "other@example.com" });

      await seedCatalogItem(db, user.id, { name: "Alpha Service" });
      await seedCatalogItem(db, user.id, { name: "Beta Service" });
      await seedCatalogItem(db, otherUser.id, { name: "Hidden Service" });

      const { accessToken } = auth.issueSession(user.id);
      const response = await catalogRoute.GET(authedRequest("http://localhost/api/catalog", accessToken));
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.data.every((row: { userId: string }) => row.userId === user.id)).toBe(true);
      expect(json.catalogs).toBeUndefined();
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/catalog supports search parameter filtering by name and description", async () => {
    const { db, sqlite, auth, catalogRoute } = await loadCatalogRoutes();
    try {
      const user = await seedUser(db, { email: "searcher@example.com" });

      await seedCatalogItem(db, user.id, { name: "Design Work", description: "Hourly rate" });
      await seedCatalogItem(db, user.id, { name: "Consulting", description: "Design architecture review" });
      await seedCatalogItem(db, user.id, { name: "Photography", description: "Event coverage" });

      const { accessToken } = auth.issueSession(user.id);
      const response = await catalogRoute.GET(
        authedRequest("http://localhost/api/catalog?search=design", accessToken),
      );
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(Array.isArray(json.data)).toBe(true);
      // "Design Work" matches by name; "Consulting" matches by description
      expect(json.data).toHaveLength(2);
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/catalog/[id] returns a full catalog for the authenticated user", async () => {
    const { db, sqlite, auth, catalogByIdRoute } = await loadCatalogRoutes();
    try {
      const user = await seedUser(db);
      const item = await seedCatalogItem(db, user.id, {
        name: "Consulting",
        description: "Architecture review",
        taxable: true,
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(`http://localhost/api/catalog/${item.id}`, accessToken);
      const response = await catalogByIdRoute.GET(req, { params: Promise.resolve({ id: item.id }) });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeDefined();
      expect(json.data.id).toBe(item.id);
      expect(json.data.name).toBe("Consulting");
      expect(json.data.taxable).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/catalog inserts a new catalog row and returns created catalog", async () => {
    const { db, sqlite, auth, catalogRoute } = await loadCatalogRoutes();
    try {
      const user = await seedUser(db);
      const { accessToken } = auth.issueSession(user.id);

      const req = authedRequest("http://localhost/api/catalog", accessToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "  Retainer  ",
          unitPrice: 25000,
          description: "  Monthly package  ",
          unit: "  month  ",
          taxable: true,
        }),
      });

      const response = await catalogRoute.POST(req);
      expect(response.status).toBe(201);
      const json = await response.json();

      expect(json.data).toBeDefined();
      expect(json.data.id).toBeDefined();
      expect(json.data.userId).toBe(user.id);
      expect(json.data.name).toBe("Retainer");
      expect(json.data.description).toBe("  Monthly package  ");
      expect(json.data.unit).toBe("month");
      expect(json.data.unitPrice).toBe(25000);
      expect(json.data.taxable).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("PATCH /api/catalog/[id] updates and returns catalog", async () => {
    const { db, sqlite, auth, catalogByIdRoute } = await loadCatalogRoutes();
    try {
      const user = await seedUser(db);
      const item = await seedCatalogItem(db, user.id, {
        name: "Old Name",
        taxable: false,
        unitPrice: 1000,
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(`http://localhost/api/catalog/${item.id}`, accessToken, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
          unitPrice: 5000,
          taxable: true,
        }),
      });

      const response = await catalogByIdRoute.PATCH(req, { params: Promise.resolve({ id: item.id }) });
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.data).toBeDefined();
      expect(json.data.id).toBe(item.id);
      expect(json.data.name).toBe("Updated Name");
      expect(json.data.unitPrice).toBe(5000);
      expect(json.data.taxable).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("DELETE /api/catalog/[id] soft-deletes catalog and returns { success: true }", async () => {
    const { db, sqlite, auth, catalogRoute, catalogByIdRoute } = await loadCatalogRoutes();
    try {
      const user = await seedUser(db);
      const item = await seedCatalogItem(db, user.id, { name: "To Delete" });

      const { accessToken } = auth.issueSession(user.id);
      const deleteReq = authedRequest(`http://localhost/api/catalog/${item.id}`, accessToken, {
        method: "DELETE",
      });
      const deleteRes = await catalogByIdRoute.DELETE(deleteReq, { params: Promise.resolve({ id: item.id }) });

      expect(deleteRes.status).toBe(200);
      const deleteJson = await deleteRes.json();
      expect(deleteJson).toEqual({ success: true });

      const deletedRow = db
        .select()
        .from(catalogItems)
        .where(and(eq(catalogItems.id, item.id), isNotNull(catalogItems.deletedAt)))
        .get();
      expect(deletedRow).toBeTruthy();

      const listRes = await catalogRoute.GET(authedRequest("http://localhost/api/catalog", accessToken));
      const listJson = await listRes.json();
      expect(listJson.data.some((catalog: { id: string }) => catalog.id === item.id)).toBe(false);
    } finally {
      sqlite.close();
    }
  });
});
