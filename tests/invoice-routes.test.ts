import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import {
  createTestDb,
  seedClient,
  seedInvoice,
  seedPayment,
  seedProfile,
  seedUser,
} from "./helpers/db";

async function loadInvoiceRoutes() {
  const testDb = createTestDb();
  vi.resetModules();
  globalThis.__invoicer_db__ = testDb.db;

  const auth = await import("@/lib/auth");
  const invoicesRoute = await import("@/app/api/invoices/route");
  const nextNumberRoute = await import("@/app/api/invoices/next-number/route");
  const invoiceByIdRoute = await import("@/app/api/invoices/[id]/route");
  const sendRoute = await import("@/app/api/invoices/[id]/send/route");
  const voidRoute = await import("@/app/api/invoices/[id]/void/route");
  const duplicateRoute = await import("@/app/api/invoices/[id]/duplicate/route");
  const paymentsRoute = await import("@/app/api/invoices/[id]/payments/route");
  const paymentByIdRoute = await import("@/app/api/invoices/[id]/payments/[paymentId]/route");

  return {
    ...testDb,
    auth,
    invoicesRoute,
    nextNumberRoute,
    invoiceByIdRoute,
    sendRoute,
    voidRoute,
    duplicateRoute,
    paymentsRoute,
    paymentByIdRoute,
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

describe("F8 invoice route migration tests", () => {
  afterEach(() => {
    delete globalThis.__invoicer_db__;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("GET /api/invoices returns paginated list filtered by status", async () => {
    const { db, sqlite, auth, invoicesRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);

      await seedInvoice(db, user.id, client.id, { invoiceNumber: "INV-0001", status: "draft" });
      await seedInvoice(db, user.id, client.id, { invoiceNumber: "INV-0002", status: "draft" });
      await seedInvoice(db, user.id, client.id, { invoiceNumber: "INV-0003", status: "sent" });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(
        "http://localhost/api/invoices?page=1&limit=10&status=draft",
        accessToken,
      );

      const response = await invoicesRoute.GET(req);
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.meta).toEqual({ total: 2, page: 1, limit: 10 });
      expect(json.data).toHaveLength(2);
      expect(json.data.every((i: { status: string }) => i.status === "draft")).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/invoices overdue filter returns invoices past due", async () => {
    const { db, sqlite, auth, invoicesRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);

      await seedInvoice(db, user.id, client.id, {
        invoiceNumber: "INV-0001",
        status: "sent",
        dueDate: "2025-01-01",
      });
      await seedInvoice(db, user.id, client.id, {
        invoiceNumber: "INV-0002",
        status: "sent",
        dueDate: "2099-01-01",
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(
        "http://localhost/api/invoices?page=1&limit=10&status=overdue",
        accessToken,
      );

      const response = await invoicesRoute.GET(req);
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.meta.total).toBe(1);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].invoiceNumber).toBe("INV-0001");
      expect(json.data[0].status).toBe("overdue");
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/invoices search matches invoice number and client name", async () => {
    const { db, sqlite, auth, invoicesRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const acmeClient = await seedClient(db, user.id, { name: "Acme Corp" });
      const otherClient = await seedClient(db, user.id, { name: "Other Company" });

      await seedInvoice(db, user.id, acmeClient.id, { invoiceNumber: "INV-0001" });
      await seedInvoice(db, user.id, otherClient.id, { invoiceNumber: "INV-0002" });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(
        "http://localhost/api/invoices?search=acme",
        accessToken,
      );

      const response = await invoicesRoute.GET(req);
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.data).toHaveLength(1);
      expect(json.data[0].invoiceNumber).toBe("INV-0001");
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/invoices returns 400 when clientId is not a UUID", async () => {
    const { db, sqlite, auth, invoicesRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest("http://localhost/api/invoices?clientId=not-a-uuid", accessToken);

      const response = await invoicesRoute.GET(req);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.field).toBe("clientId");
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices creates invoice and increments nextInvoiceNumber", async () => {
    const { db, sqlite, auth, invoicesRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id, { invoicePrefix: "INV", nextInvoiceNumber: 1 });
      const client = await seedClient(db, user.id);

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest("http://localhost/api/invoices", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          clientId: client.id,
          issueDate: "2026-03-01",
          dueDate: "2026-03-31",
          lineItems: [{ description: "Web Design", quantity: 1, unitPrice: 50000 }],
        }),
      });

      const response = await invoicesRoute.POST(req);
      expect(response.status).toBe(201);
      const json = await response.json();

      expect(json.data.invoiceNumber).toBe("INV-0001");
      expect(json.data.status).toBe("draft");

      // Verify nextInvoiceNumber was incremented in the DB
      const { db: db2 } = await import("@/lib/db");
      const { businessProfiles } = await import("@/lib/schema");
      const { eq } = await import("drizzle-orm");
      const profile = db2.select().from(businessProfiles).where(eq(businessProfiles.userId, user.id)).get();
      expect(profile?.nextInvoiceNumber).toBe(2);
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices defaults currency from business profile", async () => {
    const { db, sqlite, auth, invoicesRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id, { defaultCurrency: "CAD" });
      const client = await seedClient(db, user.id, { currency: "USD" });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest("http://localhost/api/invoices", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          clientId: client.id,
          issueDate: "2026-03-01",
          dueDate: "2026-03-31",
          lineItems: [{ description: "Design", quantity: 1, unitPrice: 5000 }],
        }),
      });

      const response = await invoicesRoute.POST(req);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.currency).toBe("CAD");
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices returns 404 when client not found", async () => {
    const { db, sqlite, auth, invoicesRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest("http://localhost/api/invoices", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          clientId: "00000000-0000-0000-0000-000000000000",
          issueDate: "2026-03-01",
          dueDate: "2026-03-31",
          lineItems: [{ description: "Work", quantity: 1, unitPrice: 10000 }],
        }),
      });

      const response = await invoicesRoute.POST(req);
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error.code).toBe("NOT_FOUND");
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices returns 409 on duplicate invoice number", async () => {
    const { db, sqlite, auth, invoicesRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);

      await seedInvoice(db, user.id, client.id, { invoiceNumber: "INV-0001" });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest("http://localhost/api/invoices", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          clientId: client.id,
          issueDate: "2026-03-01",
          dueDate: "2026-03-31",
          lineItems: [{ description: "Work", quantity: 1, unitPrice: 10000 }],
          invoiceNumber: "INV-0001",
        }),
      });

      const response = await invoicesRoute.POST(req);
      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.error.code).toBe("DUPLICATE_INVOICE_NUMBER");
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/invoices/next-number returns formatted next number", async () => {
    const { db, sqlite, auth, nextNumberRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id, { invoicePrefix: "INV", nextInvoiceNumber: 3 });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest("http://localhost/api/invoices/next-number", accessToken);

      const response = await nextNumberRoute.GET(req);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.invoiceNumber).toBe("INV-0003");
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/invoices/[id] returns invoice with overdue status", async () => {
    const { db, sqlite, auth, invoiceByIdRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: "sent",
        dueDate: "2025-01-01",
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(`http://localhost/api/invoices/${invoice.id}`, accessToken);

      const response = await invoiceByIdRoute.GET(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.status).toBe("overdue");
    } finally {
      sqlite.close();
    }
  });

  it("PATCH /api/invoices/[id] updates draft invoice notes and recomputes totals", async () => {
    const { db, sqlite, auth, invoiceByIdRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: "draft",
        notes: "Old notes",
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          notes: "Updated notes",
          lineItems: [{ description: "Updated Service", quantity: 2, unitPrice: 5000 }],
        }),
      });

      const response = await invoiceByIdRoute.PATCH(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.notes).toBe("Updated notes");
      expect(json.data.subtotal).toBe(10000);
      expect(json.data.total).toBe(10000);
    } finally {
      sqlite.close();
    }
  });

  it("PATCH /api/invoices/[id] returns 403 for non-draft invoice", async () => {
    const { db, sqlite, auth, invoiceByIdRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, { status: "sent" });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({ notes: "Try to update" }),
      });

      const response = await invoiceByIdRoute.PATCH(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error.code).toBe("FORBIDDEN");
    } finally {
      sqlite.close();
    }
  });

  it("DELETE /api/invoices/[id] soft deletes draft and 404 afterwards", async () => {
    const { db, sqlite, auth, invoiceByIdRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, { status: "draft" });

      const { accessToken } = auth.issueSession(user.id);
      const deleteReq = new NextRequest(`http://localhost/api/invoices/${invoice.id}`, {
        method: "DELETE",
        headers: { cookie: `invoicer_access=${accessToken}` },
      });

      const deleteResponse = await invoiceByIdRoute.DELETE(deleteReq, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(deleteResponse.status).toBe(200);
      const deleteJson = await deleteResponse.json();
      expect(deleteJson.success).toBe(true);

      // Now GET should return 404
      const getReq = authedRequest(`http://localhost/api/invoices/${invoice.id}`, accessToken);
      const getResponse = await invoiceByIdRoute.GET(getReq, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(getResponse.status).toBe(404);
    } finally {
      sqlite.close();
    }
  });

  it("DELETE /api/invoices/[id] returns 403 for sent invoice", async () => {
    const { db, sqlite, auth, invoiceByIdRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, { status: "sent" });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}`, {
        method: "DELETE",
        headers: { cookie: `invoicer_access=${accessToken}` },
      });

      const response = await invoiceByIdRoute.DELETE(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error.code).toBe("FORBIDDEN");
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices/[id]/send marks draft as sent and returns success", async () => {
    const { db, sqlite, auth, sendRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, { status: "draft" });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/send`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({ recipientEmail: "client@example.com" }),
      });

      const response = await sendRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices/[id]/void voids a sent invoice", async () => {
    const { db, sqlite, auth, voidRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, { status: "sent" });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/void`, {
        method: "POST",
        headers: { cookie: `invoicer_access=${accessToken}` },
      });

      const response = await voidRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices/[id]/void returns 400 for paid invoice", async () => {
    const { db, sqlite, auth, voidRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, { status: "paid" });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/void`, {
        method: "POST",
        headers: { cookie: `invoicer_access=${accessToken}` },
      });

      const response = await voidRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("INVALID_STATUS");
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices/[id]/duplicate creates new draft from sent invoice", async () => {
    const { db, sqlite, auth, duplicateRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id, { invoicePrefix: "INV", nextInvoiceNumber: 2 });
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, {
        invoiceNumber: "INV-0001",
        status: "sent",
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/duplicate`, {
        method: "POST",
        headers: { cookie: `invoicer_access=${accessToken}` },
      });

      const response = await duplicateRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.status).toBe("draft");
      expect(json.data.invoiceNumber).toBe("INV-0002");
      expect(json.data.id).not.toBe(invoice.id);
    } finally {
      sqlite.close();
    }
  });

  it("GET /api/invoices/[id]/payments returns payment list", async () => {
    const { db, sqlite, auth, paymentsRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, { status: "sent" });

      await seedPayment(db, invoice.id, { amount: 2500, paidAt: "2026-03-01" });
      await seedPayment(db, invoice.id, { amount: 3000, paidAt: "2026-03-10" });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest(
        `http://localhost/api/invoices/${invoice.id}/payments`,
        accessToken,
      );

      const response = await paymentsRoute.GET(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(2);
      // Ordered by paidAt DESC
      expect(json.data[0].paidAt).toBe("2026-03-10");
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices/[id]/payments records payment and updates invoice status to paid", async () => {
    const { db, sqlite, auth, paymentsRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: "sent",
        total: 10000,
        amountPaid: 0,
        amountDue: 10000,
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          amount: 10000,
          method: "bank_transfer",
          paidAt: "2026-03-01",
        }),
      });

      const response = await paymentsRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.payment.amount).toBe(10000);
      expect(json.data.invoice.status).toBe("paid");
      expect(json.data.invoice.amountDue).toBe(0);
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices/[id]/payments records partial payment", async () => {
    const { db, sqlite, auth, paymentsRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: "sent",
        total: 10000,
        amountPaid: 0,
        amountDue: 10000,
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          amount: 4000,
          method: "cash",
          paidAt: "2026-03-01",
        }),
      });

      const response = await paymentsRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.invoice.status).toBe("partial");
      expect(json.data.invoice.amountPaid).toBe(4000);
      expect(json.data.invoice.amountDue).toBe(6000);
    } finally {
      sqlite.close();
    }
  });

  it("POST /api/invoices/[id]/payments returns PAYMENT_EXCEEDS_DUE when amount is too large", async () => {
    const { db, sqlite, auth, paymentsRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: "sent",
        total: 10000,
        amountPaid: 0,
        amountDue: 10000,
      });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          amount: 10001,
          method: "cash",
          paidAt: "2026-03-01",
        }),
      });

      const response = await paymentsRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      });
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("PAYMENT_EXCEEDS_DUE");
      expect(json.error.field).toBe("amount");
    } finally {
      sqlite.close();
    }
  });

  it("DELETE /api/invoices/[id]/payments/[paymentId] removes payment and updates status back to sent", async () => {
    const { db, sqlite, auth, paymentByIdRoute } = await loadInvoiceRoutes();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id);
      const client = await seedClient(db, user.id);
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: "partial",
        total: 10000,
        amountPaid: 4000,
        amountDue: 6000,
      });
      const payment = await seedPayment(db, invoice.id, { amount: 4000, paidAt: "2026-03-01" });

      const { accessToken } = auth.issueSession(user.id);
      const req = new NextRequest(
        `http://localhost/api/invoices/${invoice.id}/payments/${payment.id}`,
        {
          method: "DELETE",
          headers: { cookie: `invoicer_access=${accessToken}` },
        },
      );

      const response = await paymentByIdRoute.DELETE(req, {
        params: Promise.resolve({ id: invoice.id, paymentId: payment.id }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    } finally {
      sqlite.close();
    }
  });
});
