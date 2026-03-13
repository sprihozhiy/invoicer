import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import {
  createTestDb,
  seedClient,
  seedInvoice,
  seedProfile,
  seedUser,
} from "./helpers/db";

async function loadClientRoutes() {
  const testDb = createTestDb();
  vi.resetModules();
  globalThis.__invoicer_db__ = testDb.db;

  const auth = await import("@/lib/auth");
  const clientsRoute = await import("@/app/api/clients/route");
  const clientByIdRoute = await import("@/app/api/clients/[id]/route");
  const clientInvoicesRoute = await import("@/app/api/clients/[id]/invoices/route");

  return {
    ...testDb,
    auth,
    clientsRoute,
    clientByIdRoute,
    clientInvoicesRoute,
  };
}

function authedRequest(url: string, accessToken: string): NextRequest {
  return new NextRequest(url, {
    headers: {
      cookie: `invoicer_access=${accessToken}`,
    },
  });
}

describe("F10 client route migration tests", () => {
  afterEach(() => {
    delete globalThis.__invoicer_db__;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("GET /api/clients returns paginated clients and applies search", async () => {
    const { db, sqlite, auth, clientsRoute } = await loadClientRoutes();
    try {
      const user = await seedUser(db, { email: "owner@example.com" });
      await seedProfile(db, user.id);
      const otherUser = await seedUser(db, { email: "other@example.com" });
      await seedProfile(db, otherUser.id);

      await seedClient(db, user.id, { name: "Acme Alpha", email: "alpha@acme.com" });
      await seedClient(db, user.id, { name: "Beta Studio", email: "beta@studio.com", company: null });
      await seedClient(db, otherUser.id, { name: "Hidden Client", email: "hidden@example.com" });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(
        "http://localhost/api/clients?page=1&limit=1&search=acme",
        accessToken,
      );

      const response = await clientsRoute.GET(req);
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.meta).toEqual({ total: 1, page: 1, limit: 1 });
      expect(json.data).toHaveLength(1);
      expect(json.data[0].name).toBe("Acme Alpha");
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/clients validates input and persists client with reconstructed address", async () => {
    const { db, sqlite, auth, clientsRoute } = await loadClientRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id, { defaultCurrency: "CAD" });
      const { accessToken } = auth.issueSession(user.id);

      const req = new NextRequest("http://localhost/api/clients", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          name: "  New Client  ",
          email: "BILLING@NEWCLIENT.COM",
          company: "  NewCo  ",
          address: {
            line1: " 123 Main ",
            city: " Edmonton ",
            country: "ca",
          },
        }),
      });

      const response = await clientsRoute.POST(req);
      expect(response.status).toBe(201);
      const json = await response.json();

      expect(json.data.name).toBe("New Client");
      expect(json.data.email).toBe("billing@newclient.com");
      expect(json.data.company).toBe("NewCo");
      expect(json.data.currency).toBe("USD");
      expect(json.data.address).toEqual({
        line1: "123 Main",
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

  it("GET /api/clients/[id] returns client with nested stats object", async () => {
    const { db, sqlite, auth, clientByIdRoute } = await loadClientRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id, { name: "Stats Client" });

      await seedInvoice(db, user.id, client.id, {
        status: "sent",
        issueDate: "2026-03-01",
        total: 10000,
        amountPaid: 2500,
        amountDue: 7500,
      });
      await seedInvoice(db, user.id, client.id, {
        status: "paid",
        issueDate: "2026-03-05",
        total: 5000,
        amountPaid: 5000,
        amountDue: 0,
      });
      await seedInvoice(db, user.id, client.id, {
        status: "void",
        issueDate: "2026-03-07",
        total: 9999,
        amountPaid: 0,
        amountDue: 9999,
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(`http://localhost/api/clients/${client.id}`, accessToken);
      const response = await clientByIdRoute.GET(req, { params: Promise.resolve({ id: client.id }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.name).toBe("Stats Client");
      expect(json.data.stats).toEqual({
        totalInvoiced: 15000,
        totalPaid: 7500,
        totalOutstanding: 7500,
        lastInvoiceDate: "2026-03-05",
        invoiceCount: 2,
      });
    } finally {
      sqlite.close();
    }
  });

  it("PATCH /api/clients/[id] updates client fields and address", async () => {
    const { db, sqlite, auth, clientByIdRoute } = await loadClientRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id, {
        name: "Old Name",
        currency: "USD",
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/clients/${client.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          name: "  Updated Name ",
          currency: "eur",
          address: {
            line1: "5 Ave",
            city: "Calgary",
            country: "ca",
          },
        }),
      });

      const response = await clientByIdRoute.PATCH(req, { params: Promise.resolve({ id: client.id }) });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.name).toBe("Updated Name");
      expect(json.data.currency).toBe("EUR");
      expect(json.data.address).toEqual({
        line1: "5 Ave",
        line2: null,
        city: "Calgary",
        state: null,
        postalCode: null,
        country: "CA",
      });
    } finally {
      sqlite.close();
    }
  });

  it("DELETE /api/clients/[id] blocks delete for non-void invoices and succeeds otherwise", async () => {
    const { db, sqlite, auth, clientByIdRoute } = await loadClientRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const blockedClient = await seedClient(db, user.id, { name: "Blocked Client" });
      const deletableClient = await seedClient(db, user.id, { name: "Deletable Client" });

      await seedInvoice(db, user.id, blockedClient.id, {
        status: "sent",
        amountDue: 1000,
      });
      await seedInvoice(db, user.id, deletableClient.id, {
        status: "void",
        amountDue: 0,
      });

      const { accessToken } = auth.issueSession(user.id);

      const blockedReq = new NextRequest(`http://localhost/api/clients/${blockedClient.id}`, {
        method: "DELETE",
        headers: { cookie: `invoicer_access=${accessToken}` },
      });
      const blockedResponse = await clientByIdRoute.DELETE(blockedReq, { params: Promise.resolve({ id: blockedClient.id }) });
      expect(blockedResponse.status).toBe(409);
      const blockedJson = await blockedResponse.json();
      expect(blockedJson.error?.code).toBe("CLIENT_HAS_INVOICES");

      const allowedReq = new NextRequest(`http://localhost/api/clients/${deletableClient.id}`, {
        method: "DELETE",
        headers: { cookie: `invoicer_access=${accessToken}` },
      });
      const allowedResponse = await clientByIdRoute.DELETE(allowedReq, { params: Promise.resolve({ id: deletableClient.id }) });
      expect(allowedResponse.status).toBe(200);
      const allowedJson = await allowedResponse.json();
      expect(allowedJson.success).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/clients/[id]/invoices supports overdue status and pagination", async () => {
    const { db, sqlite, auth, clientInvoicesRoute } = await loadClientRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id, { name: "Invoices Client" });

      await seedInvoice(db, user.id, client.id, {
        invoiceNumber: "INV-0100",
        status: "sent",
        dueDate: "2025-01-01",
      });
      await seedInvoice(db, user.id, client.id, {
        invoiceNumber: "INV-0101",
        status: "sent",
        dueDate: "2099-01-01",
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(
        `http://localhost/api/clients/${client.id}/invoices?page=1&limit=10&status=overdue`,
        accessToken,
      );

      const response = await clientInvoicesRoute.GET(req, { params: Promise.resolve({ id: client.id }) });
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.meta).toEqual({ total: 1, page: 1, limit: 10 });
      expect(json.data).toHaveLength(1);
      expect(json.data[0].invoiceNumber).toBe("INV-0100");
      expect(json.data[0].status).toBe("overdue");
      expect(json.data[0].clientName).toBe("Invoices Client");
    } finally {
      sqlite.close();
    }
  });
});
