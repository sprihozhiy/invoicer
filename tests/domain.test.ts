import { afterEach, describe, expect, it, vi } from "vitest";

import type { Address } from "@/lib/models";
import { ApiError } from "@/lib/api";
import {
  createTestDb,
  seedClient,
  seedInvoice,
  seedProfile,
  seedUser,
} from "./helpers/db";

async function loadDomain() {
  const testDb = createTestDb();
  vi.resetModules();
  globalThis.__invoicer_db__ = testDb.db;

  const domain = await import("@/lib/domain");

  return {
    ...testDb,
    domain,
  };
}

describe("domain helpers", () => {
  afterEach(() => {
    delete globalThis.__invoicer_db__;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("flatToAddress returns null when addressLine1 is null", async () => {
    const { sqlite, domain } = await loadDomain();
    try {
      const result = domain.flatToAddress({
        addressLine1: null,
        addressLine2: "Suite 10",
        addressCity: "Edmonton",
        addressState: "AB",
        addressPostalCode: "T5J 0A1",
        addressCountry: "CA",
      });
      expect(result).toBeNull();
    } finally {
      sqlite.close();
    }
  });

  it("flatToAddress reconstitutes nested address", async () => {
    const { sqlite, domain } = await loadDomain();
    try {
      const result = domain.flatToAddress({
        addressLine1: "123 Main St",
        addressLine2: null,
        addressCity: "Edmonton",
        addressState: null,
        addressPostalCode: "T5J 0A1",
        addressCountry: "CA",
      });

      expect(result).toEqual({
        line1: "123 Main St",
        line2: null,
        city: "Edmonton",
        state: null,
        postalCode: "T5J 0A1",
        country: "CA",
      });
    } finally {
      sqlite.close();
    }
  });

  it("addressToFlat maps nested address to flat columns and all-null when null", async () => {
    const { sqlite, domain } = await loadDomain();
    try {
      const address: Address = {
        line1: "987 4 Ave",
        line2: "Unit 3",
        city: "Calgary",
        state: "AB",
        postalCode: "T2P 0J8",
        country: "CA",
      };

      expect(domain.addressToFlat(address)).toEqual({
        addressLine1: "987 4 Ave",
        addressLine2: "Unit 3",
        addressCity: "Calgary",
        addressState: "AB",
        addressPostalCode: "T2P 0J8",
        addressCountry: "CA",
      });

      expect(domain.addressToFlat(null)).toEqual({
        addressLine1: null,
        addressLine2: null,
        addressCity: null,
        addressState: null,
        addressPostalCode: null,
        addressCountry: null,
      });
    } finally {
      sqlite.close();
    }
  });

  it("getClientOrFail returns owned client with nested address and throws 404 for wrong user", async () => {
    const { db, sqlite, domain } = await loadDomain();
    try {
      const user = await seedUser(db, { email: "owner@example.com" });
      const otherUser = await seedUser(db, { email: "other@example.com" });

      const client = await seedClient(db, user.id, {
        name: "Client One",
        addressLine1: "123 Main St",
        addressLine2: null,
        addressCity: "Edmonton",
        addressState: null,
        addressPostalCode: "T5J 0A1",
        addressCountry: "CA",
      });

      const found = domain.getClientOrFail(user.id, client.id);
      expect(found.id).toBe(client.id);
      expect(found.address).toEqual({
        line1: "123 Main St",
        line2: null,
        city: "Edmonton",
        state: null,
        postalCode: "T5J 0A1",
        country: "CA",
      });

      expect(() => domain.getClientOrFail(otherUser.id, client.id)).toThrow(ApiError);
      try {
        domain.getClientOrFail(otherUser.id, client.id);
      } catch (error) {
        const apiErr = error as ApiError;
        expect(apiErr.status).toBe(404);
        expect(apiErr.code).toBe("NOT_FOUND");
      }
    } finally {
      sqlite.close();
    }
  });

  it("getInvoiceOrFail ignores deleted invoices and enforces user ownership", async () => {
    const { db, sqlite, domain } = await loadDomain();
    try {
      const user = await seedUser(db, { email: "invoice-owner@example.com" });
      const otherUser = await seedUser(db, { email: "invoice-other@example.com" });
      const client = await seedClient(db, user.id);

      const active = await seedInvoice(db, user.id, client.id, { deletedAt: null });
      const deleted = await seedInvoice(db, user.id, client.id, {
        invoiceNumber: "INV-0099",
        deletedAt: "2026-03-01T00:00:00.000Z",
      });

      const found = domain.getInvoiceOrFail(user.id, active.id);
      expect(found.id).toBe(active.id);

      expect(() => domain.getInvoiceOrFail(user.id, deleted.id)).toThrow(ApiError);
      expect(() => domain.getInvoiceOrFail(otherUser.id, active.id)).toThrow(ApiError);
    } finally {
      sqlite.close();
    }
  });

  it("getProfileOrFail returns profile with nested address and 404 on missing", async () => {
    const { db, sqlite, domain } = await loadDomain();
    try {
      const user = await seedUser(db, { email: "profile-owner@example.com" });
      const missingUser = await seedUser(db, { email: "profile-missing@example.com" });

      const profile = await seedProfile(db, user.id, {
        businessName: "Acme LLC",
        addressLine1: "101 Jasper Ave",
        addressLine2: null,
        addressCity: "Edmonton",
        addressState: null,
        addressPostalCode: "T5J 1W8",
        addressCountry: "CA",
      });

      const found = domain.getProfileOrFail(user.id);
      expect(found.id).toBe(profile.id);
      expect(found.address).toEqual({
        line1: "101 Jasper Ave",
        line2: null,
        city: "Edmonton",
        state: null,
        postalCode: "T5J 1W8",
        country: "CA",
      });

      expect(() => domain.getProfileOrFail(missingUser.id)).toThrow(ApiError);
    } finally {
      sqlite.close();
    }
  });
});
