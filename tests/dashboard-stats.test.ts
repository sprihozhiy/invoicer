import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { startOfMonthUtc, todayUtc } from "@/lib/time";
import {
  createTestDb,
  seedClient,
  seedInvoice,
  seedPayment,
  seedProfile,
  seedUser,
} from "./helpers/db";

async function loadDashboardRoute() {
  const testDb = createTestDb();
  vi.resetModules();
  globalThis.__invoicer_db__ = testDb.db;

  const auth = await import("@/lib/auth");
  const dashboardRoute = await import("@/app/api/dashboard/stats/route");

  return {
    ...testDb,
    auth,
    dashboardRoute,
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

describe("F13 dashboard stats migration tests", () => {
  afterEach(() => {
    delete globalThis.__invoicer_db__;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("GET /api/dashboard/stats returns SQL-backed aggregates and invoice lists", async () => {
    const { db, sqlite, auth, dashboardRoute } = await loadDashboardRoute();
    try {
      const user = await seedUser(db);
      await seedProfile(db, user.id, { defaultCurrency: "USD" });
      const clientA = await seedClient(db, user.id, { name: "Client A" });
      const clientB = await seedClient(db, user.id, { name: "Client B" });

      const today = todayUtc();
      const firstOfMonth = startOfMonthUtc().toISOString().slice(0, 10);
      const lastMonthDay = new Date(`${firstOfMonth}T00:00:00.000Z`);
      lastMonthDay.setUTCDate(lastMonthDay.getUTCDate() - 1);
      const outsideMonth = lastMonthDay.toISOString().slice(0, 10);

      const inv1 = await seedInvoice(db, user.id, clientA.id, {
        invoiceNumber: "INV-0001",
        status: "sent",
        currency: "USD",
        amountDue: 1500,
        dueDate: "2025-01-01",
        createdAt: "2026-03-01T00:00:00.000Z",
      });
      const inv2 = await seedInvoice(db, user.id, clientA.id, {
        invoiceNumber: "INV-0002",
        status: "partial",
        currency: "USD",
        amountDue: 2500,
        dueDate: "2099-01-01",
        createdAt: "2026-03-02T00:00:00.000Z",
      });
      const inv3 = await seedInvoice(db, user.id, clientB.id, {
        invoiceNumber: "INV-0003",
        status: "sent",
        currency: "CAD",
        amountDue: 3500,
        dueDate: "2025-01-02",
        createdAt: "2026-03-03T00:00:00.000Z",
      });
      const inv4 = await seedInvoice(db, user.id, clientA.id, {
        invoiceNumber: "INV-0004",
        status: "paid",
        currency: "USD",
        amountDue: 0,
        createdAt: "2026-03-04T00:00:00.000Z",
      });
      await seedInvoice(db, user.id, clientA.id, {
        invoiceNumber: "INV-0005",
        status: "sent",
        currency: "USD",
        amountDue: 9999,
        dueDate: "2025-01-03",
        deletedAt: "2026-03-10T00:00:00.000Z",
        createdAt: "2026-03-05T00:00:00.000Z",
      });
      await seedInvoice(db, user.id, clientA.id, {
        invoiceNumber: "INV-0006",
        status: "draft",
        currency: "USD",
        createdAt: "2026-03-06T00:00:00.000Z",
      });
      await seedInvoice(db, user.id, clientA.id, {
        invoiceNumber: "INV-0007",
        status: "draft",
        currency: "USD",
        createdAt: "2026-03-07T00:00:00.000Z",
      });
      await seedInvoice(db, user.id, clientA.id, {
        invoiceNumber: "INV-0008",
        status: "draft",
        currency: "USD",
        createdAt: "2026-03-08T00:00:00.000Z",
      });

      await seedPayment(db, inv4.id, { amount: 4000, paidAt: today });
      await seedPayment(db, inv2.id, { amount: 500, paidAt: firstOfMonth });
      await seedPayment(db, inv3.id, { amount: 7000, paidAt: today });
      await seedPayment(db, inv1.id, { amount: 9999, paidAt: outsideMonth });

      const { accessToken } = auth.issueSession(user.id);
      const req = authedRequest("http://localhost/api/dashboard/stats", accessToken);
      const response = await dashboardRoute.GET(req);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.data.totalOutstanding).toBe(4000);
      expect(json.data.totalOverdue).toBe(1500);
      expect(json.data.paidThisMonth).toBe(4500);

      expect(json.data.recentInvoices).toHaveLength(5);
      expect(json.data.recentInvoices.map((i: { invoiceNumber: string }) => i.invoiceNumber)).toEqual([
        "INV-0008",
        "INV-0007",
        "INV-0006",
        "INV-0004",
        "INV-0003",
      ]);

      expect(json.data.overdueInvoices.map((i: { invoiceNumber: string }) => i.invoiceNumber)).toEqual([
        "INV-0001",
        "INV-0003",
      ]);
      expect(json.data.overdueInvoices.every((i: { status: string }) => i.status === "overdue")).toBe(true);
    } finally {
      sqlite.close();
    }
  });
});
