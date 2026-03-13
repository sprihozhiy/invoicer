/**
 * Test database helper.
 *
 * Creates an in-memory SQLite database with all migrations applied.
 * Each test suite should call createTestDb() in beforeEach and close
 * the returned sqlite instance in afterEach to ensure isolation.
 *
 * Usage:
 *   import { createTestDb, seedUser, seedProfile } from '../helpers/db'
 *   let db: TestDb
 *   beforeEach(() => { db = createTestDb() })
 *   afterEach(() => { db.sqlite.close() })
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import * as schema from '@/lib/schema'
import { uuid } from '@/lib/ids'
import { nowIso, todayUtc } from '@/lib/time'
import type { LineItem } from '@/lib/models'

export type TestDb = ReturnType<typeof createTestDb>
export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

export function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') })
  return { db, sqlite }
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

export interface SeedUserOptions {
  name?: string
  email?: string
  passwordHash?: string
}

export async function seedUser(
  db: DrizzleDb,
  overrides: SeedUserOptions = {},
): Promise<typeof schema.users.$inferSelect> {
  const now = nowIso()
  const row = {
    id:           uuid(),
    email:        overrides.email ?? 'test@example.com',
    name:         overrides.name  ?? 'Test User',
    passwordHash: overrides.passwordHash ?? 'hash_placeholder',
    createdAt:    now,
    updatedAt:    now,
  }
  await db.insert(schema.users).values(row)
  return row
}

export async function seedProfile(
  db: DrizzleDb,
  userId: string,
  overrides: Partial<typeof schema.businessProfiles.$inferInsert> = {},
): Promise<typeof schema.businessProfiles.$inferSelect> {
  const now = nowIso()
  const row = {
    id:                      uuid(),
    userId,
    businessName:            'Test Business',
    logoUrl:                 null,
    addressLine1:            null,
    addressLine2:            null,
    addressCity:             null,
    addressState:            null,
    addressPostalCode:       null,
    addressCountry:          null,
    phone:                   null,
    email:                   null,
    website:                 null,
    taxId:                   null,
    defaultCurrency:         'USD',
    defaultPaymentTermsDays: 30,
    defaultTaxRate:          null,
    defaultNotes:            null,
    defaultTerms:            null,
    invoicePrefix:           'INV',
    nextInvoiceNumber:       1,
    createdAt:               now,
    updatedAt:               now,
    ...overrides,
  }
  await db.insert(schema.businessProfiles).values(row)
  return row as typeof schema.businessProfiles.$inferSelect
}

export async function seedClient(
  db: DrizzleDb,
  userId: string,
  overrides: Partial<typeof schema.clients.$inferInsert> = {},
): Promise<typeof schema.clients.$inferSelect> {
  const now = nowIso()
  const row = {
    id:               uuid(),
    userId,
    name:             'Acme Corp',
    email:            'billing@acme.com',
    phone:            null,
    company:          'Acme Corp',
    addressLine1:     null,
    addressLine2:     null,
    addressCity:      null,
    addressState:     null,
    addressPostalCode:null,
    addressCountry:   null,
    currency:         'USD',
    notes:            null,
    createdAt:        now,
    updatedAt:        now,
    ...overrides,
  }
  await db.insert(schema.clients).values(row)
  return row as typeof schema.clients.$inferSelect
}

export async function seedInvoice(
  db: DrizzleDb,
  userId: string,
  clientId: string,
  overrides: Partial<typeof schema.invoices.$inferInsert> = {},
): Promise<typeof schema.invoices.$inferSelect> {
  const now = nowIso()
  const today = todayUtc()
  const lineItems: LineItem[] = [
    { id: uuid(), description: 'Service', quantity: 1, unitPrice: 10000, amount: 10000, taxable: false },
  ]
  const row = {
    id:             uuid(),
    userId,
    clientId,
    invoiceNumber:  'INV-0001',
    status:         'draft' as const,
    issueDate:      today,
    dueDate:        today,
    currency:       'USD',
    lineItems,
    subtotal:       10000,
    taxRate:        null,
    taxAmount:      0,
    discountType:   null,
    discountValue:  0,
    discountAmount: 0,
    total:          10000,
    amountPaid:     0,
    amountDue:      10000,
    notes:          null,
    terms:          null,
    sentAt:         null,
    paidAt:         null,
    createdAt:      now,
    updatedAt:      now,
    deletedAt:      null,
    ...overrides,
  }
  await db.insert(schema.invoices).values(row as typeof schema.invoices.$inferInsert)
  return row as unknown as typeof schema.invoices.$inferSelect
}

export async function seedPayment(
  db: DrizzleDb,
  invoiceId: string,
  overrides: Partial<typeof schema.payments.$inferInsert> = {},
): Promise<typeof schema.payments.$inferSelect> {
  const now = nowIso()
  const row = {
    id:        uuid(),
    invoiceId,
    amount:    5000,
    method:    'bank_transfer' as const,
    reference: null,
    notes:     null,
    paidAt:    todayUtc(),
    createdAt: now,
    ...overrides,
  }
  await db.insert(schema.payments).values(row)
  return row as typeof schema.payments.$inferSelect
}

export async function seedCatalogItem(
  db: DrizzleDb,
  userId: string,
  overrides: Partial<typeof schema.catalogItems.$inferInsert> = {},
): Promise<typeof schema.catalogItems.$inferSelect> {
  const now = nowIso()
  const row = {
    id:          uuid(),
    userId,
    name:        'Design Work',
    description: 'Hourly design rate',
    unitPrice:   15000,
    unit:        'hr',
    taxable:     false,
    createdAt:   now,
    updatedAt:   now,
    deletedAt:   null,
    ...overrides,
  }
  await db.insert(schema.catalogItems).values(row as typeof schema.catalogItems.$inferInsert)
  return row as unknown as typeof schema.catalogItems.$inferSelect
}

export async function seedAccessToken(
  db: DrizzleDb,
  userId: string,
  token: string,
  expiresAt?: string,
): Promise<void> {
  await db.insert(schema.accessTokens).values({
    token,
    userId,
    expiresAt: expiresAt ?? new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  })
}

export async function seedRefreshToken(
  db: DrizzleDb,
  userId: string,
  tokenHash: string,
  expiresAt?: string,
): Promise<void> {
  await db.insert(schema.refreshTokens).values({
    id:        uuid(),
    userId,
    tokenHash,
    expiresAt: expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    usedAt:    null,
    createdAt: nowIso(),
  })
}
