/**
 * tests/invoice-routes.test.ts
 *
 * Feature: F8 — Invoice Routes Migrated to SQLite
 *
 * Covers: GET/POST /api/invoices, GET /api/invoices/next-number,
 *         GET/PATCH/DELETE /api/invoices/[id],
 *         POST /api/invoices/[id]/send, POST /api/invoices/[id]/void,
 *         POST /api/invoices/[id]/duplicate, GET /api/invoices/[id]/pdf
 *
 * Test runner: vitest
 * Run: npx vitest run tests/invoice-routes.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { eq, and, isNull } from 'drizzle-orm'
import * as schema from '@/lib/schema'
import {
  createTestDb,
  seedUser,
  seedProfile,
  seedClient,
  seedInvoice,
  seedAccessToken,
  type DrizzleDb,
} from './helpers/db'
import { uuid } from '@/lib/ids'
import { todayUtc } from '@/lib/time'

// ── Setup ─────────────────────────────────────────────────────────────────────

let testDb: { db: DrizzleDb; sqlite: any }
let userId: string
let clientId: string
let accessToken: string

/**
 * Builds an authenticated NextRequest for a given path.
 * Requires next/server to be importable in test env.
 */
async function makeReq(method: string, path: string, body?: unknown, token?: string) {
  const { NextRequest } = await import('next/server')
  return new NextRequest(`http://localhost${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `invoicer_access=${token ?? accessToken}`,
    },
  })
}

beforeEach(async () => {
  testDb = createTestDb()
  const { db } = testDb
  const user = await seedUser(db)
  userId = user.id
  await seedProfile(db, userId)
  const client = await seedClient(db, userId)
  clientId = client.id
  accessToken = 'at_test_invoice_token'
  await seedAccessToken(db, userId, accessToken)
})

afterEach(() => {
  testDb.sqlite.close()
})

// ── GET /api/invoices ─────────────────────────────────────────────────────────

describe('GET /api/invoices', () => {
  it('returns empty list when no invoices exist', async () => {
    const { GET } = await import('@/app/api/invoices/route')
    const req = await makeReq('GET', '/api/invoices')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
    expect(body.meta.total).toBe(0)
  })

  it('returns invoices for the authenticated user only', async () => {
    const { db } = testDb
    await seedInvoice(db, userId, clientId, { invoiceNumber: 'INV-0001' })

    // Create a second user with their own invoice
    const user2 = await seedUser(db, { email: 'other@test.com' })
    await seedProfile(db, user2.id)
    const client2 = await seedClient(db, user2.id)
    await seedInvoice(db, user2.id, client2.id, { invoiceNumber: 'INV-0001' })

    const { GET } = await import('@/app/api/invoices/route')
    const req = await makeReq('GET', '/api/invoices')
    const res = await GET(req)
    const body = await res.json()

    expect(body.meta.total).toBe(1)
    expect(body.data[0].userId).toBe(userId)
  })

  it('excludes soft-deleted invoices', async () => {
    const { db } = testDb
    await seedInvoice(db, userId, clientId, {
      invoiceNumber: 'INV-0001',
      deletedAt: new Date().toISOString(),
    })

    const { GET } = await import('@/app/api/invoices/route')
    const req = await makeReq('GET', '/api/invoices')
    const res = await GET(req)
    const body = await res.json()
    expect(body.meta.total).toBe(0)
  })

  it('filters by status', async () => {
    const { db } = testDb
    await seedInvoice(db, userId, clientId, { invoiceNumber: 'INV-0001', status: 'draft' })
    await seedInvoice(db, userId, clientId, { invoiceNumber: 'INV-0002', status: 'sent' })

    const { GET } = await import('@/app/api/invoices/route')
    const req = await makeReq('GET', '/api/invoices?status=sent')
    const res = await GET(req)
    const body = await res.json()
    expect(body.meta.total).toBe(1)
    expect(body.data[0].status).toBe('sent')
  })

  it('filters by overdue virtual status (sent/partial with past due date)', async () => {
    const { db } = testDb
    await seedInvoice(db, userId, clientId, {
      invoiceNumber: 'INV-0001',
      status: 'sent',
      dueDate: '2020-01-01', // past
    })
    await seedInvoice(db, userId, clientId, {
      invoiceNumber: 'INV-0002',
      status: 'sent',
      dueDate: '2099-01-01', // future
    })

    const { GET } = await import('@/app/api/invoices/route')
    const req = await makeReq('GET', '/api/invoices?status=overdue')
    const res = await GET(req)
    const body = await res.json()
    expect(body.meta.total).toBe(1)
    expect(body.data[0].invoiceNumber).toBe('INV-0001')
  })

  it('filters by clientId', async () => {
    const { db } = testDb
    const otherClient = await seedClient(db, userId, { name: 'Other' })
    await seedInvoice(db, userId, clientId, { invoiceNumber: 'INV-0001' })
    await seedInvoice(db, userId, otherClient.id, { invoiceNumber: 'INV-0002' })

    const { GET } = await import('@/app/api/invoices/route')
    const req = await makeReq('GET', `/api/invoices?clientId=${clientId}`)
    const res = await GET(req)
    const body = await res.json()
    expect(body.meta.total).toBe(1)
    expect(body.data[0].clientId).toBe(clientId)
  })

  it('searches by invoice number', async () => {
    const { db } = testDb
    await seedInvoice(db, userId, clientId, { invoiceNumber: 'INV-0042' })
    await seedInvoice(db, userId, clientId, { invoiceNumber: 'INV-0099' })

    const { GET } = await import('@/app/api/invoices/route')
    const req = await makeReq('GET', '/api/invoices?search=0042')
    const res = await GET(req)
    const body = await res.json()
    expect(body.meta.total).toBe(1)
    expect(body.data[0].invoiceNumber).toBe('INV-0042')
  })

  it('applies withComputedStatus (adds overdue to status field)', async () => {
    const { db } = testDb
    await seedInvoice(db, userId, clientId, {
      invoiceNumber: 'INV-0001',
      status: 'sent',
      dueDate: '2020-01-01',
    })

    const { GET } = await import('@/app/api/invoices/route')
    const req = await makeReq('GET', '/api/invoices')
    const res = await GET(req)
    const body = await res.json()
    expect(body.data[0].status).toBe('overdue')
  })

  it('paginates results', async () => {
    const { db } = testDb
    for (let i = 1; i <= 5; i++) {
      await seedInvoice(db, userId, clientId, { invoiceNumber: `INV-${String(i).padStart(4, '0')}` })
    }

    const { GET } = await import('@/app/api/invoices/route')
    const req = await makeReq('GET', '/api/invoices?page=1&limit=2')
    const res = await GET(req)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.meta.total).toBe(5)
    expect(body.meta.limit).toBe(2)
  })

  it('returns 401 for unauthenticated request', async () => {
    const { GET } = await import('@/app/api/invoices/route')
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/invoices')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

// ── POST /api/invoices ────────────────────────────────────────────────────────

describe('POST /api/invoices', () => {
  const validBody = () => ({
    clientId,
    issueDate: '2026-01-01',
    dueDate:   '2026-01-31',
    lineItems: [{ description: 'Web Design', quantity: 1, unitPrice: 150000, taxable: false }],
  })

  it('creates a draft invoice and returns 201', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const req = await makeReq('POST', '/api/invoices', validBody())
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.status).toBe('draft')
    expect(body.data.userId).toBe(userId)
  })

  it('auto-generates invoice number using profile prefix and counter', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const req = await makeReq('POST', '/api/invoices', validBody())
    const res = await POST(req)
    const body = await res.json()
    expect(body.data.invoiceNumber).toBe('INV-0001')
  })

  it('increments nextInvoiceNumber on each create', async () => {
    const { db } = testDb
    const { POST } = await import('@/app/api/invoices/route')

    await POST(await makeReq('POST', '/api/invoices', validBody()))
    await POST(await makeReq('POST', '/api/invoices', { ...validBody() }))

    const profile = await db.select()
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.userId, userId))
      .then((r) => r[0])
    expect(profile.nextInvoiceNumber).toBe(3)
  })

  it('computes subtotal, total, and amountDue from lineItems', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const body = {
      ...validBody(),
      lineItems: [{ description: 'Work', quantity: 2, unitPrice: 5000, taxable: false }],
    }
    const res = await POST(await makeReq('POST', '/api/invoices', body))
    const data = (await res.json()).data
    expect(data.subtotal).toBe(10000)
    expect(data.total).toBe(10000)
    expect(data.amountDue).toBe(10000)
    expect(data.amountPaid).toBe(0)
  })

  it('applies tax when taxRate provided', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const body = {
      ...validBody(),
      lineItems: [{ description: 'Work', quantity: 1, unitPrice: 10000, taxable: true }],
      taxRate: 10,
    }
    const res = await POST(await makeReq('POST', '/api/invoices', body))
    const data = (await res.json()).data
    expect(data.taxAmount).toBe(1000) // 10% of 10000
    expect(data.total).toBe(11000)
  })

  it('returns 404 if clientId does not belong to user', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const req = await makeReq('POST', '/api/invoices', {
      ...validBody(),
      clientId: uuid(), // random UUID not belonging to user
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 409 DUPLICATE_INVOICE_NUMBER if custom invoiceNumber already exists', async () => {
    const { db } = testDb
    await seedInvoice(db, userId, clientId, { invoiceNumber: 'CUSTOM-001' })

    const { POST } = await import('@/app/api/invoices/route')
    const req = await makeReq('POST', '/api/invoices', { ...validBody(), invoiceNumber: 'CUSTOM-001' })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('DUPLICATE_INVOICE_NUMBER')
  })

  it('returns 400 VALIDATION_ERROR for missing lineItems', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const req = await makeReq('POST', '/api/invoices', { clientId, issueDate: '2026-01-01', dueDate: '2026-01-31' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

// ── GET /api/invoices/next-number ─────────────────────────────────────────────

describe('GET /api/invoices/next-number', () => {
  it('returns the formatted next invoice number without incrementing', async () => {
    const { GET } = await import('@/app/api/invoices/next-number/route')
    const req = await makeReq('GET', '/api/invoices/next-number')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.invoiceNumber).toBe('INV-0001')
  })

  it('does not increment nextInvoiceNumber', async () => {
    const { db } = testDb
    const { GET } = await import('@/app/api/invoices/next-number/route')
    await GET(await makeReq('GET', '/api/invoices/next-number'))

    const profile = await db.select()
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.userId, userId))
      .then((r) => r[0])
    expect(profile.nextInvoiceNumber).toBe(1) // unchanged
  })
})

// ── GET /api/invoices/[id] ────────────────────────────────────────────────────

describe('GET /api/invoices/[id]', () => {
  it('returns the invoice by id', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId)

    const { GET } = await import('@/app/api/invoices/[id]/route')
    const req = await makeReq('GET', `/api/invoices/${invoice.id}`)
    const res = await GET(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(invoice.id)
  })

  it('applies withComputedStatus to the returned invoice', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'sent',
      dueDate: '2020-01-01',
    })

    const { GET } = await import('@/app/api/invoices/[id]/route')
    const req = await makeReq('GET', `/api/invoices/${invoice.id}`)
    const res = await GET(req, { params: Promise.resolve({ id: invoice.id }) })
    const body = await res.json()
    expect(body.data.status).toBe('overdue')
  })

  it('returns 404 for invoice belonging to another user', async () => {
    const { db } = testDb
    const user2 = await seedUser(db, { email: 'other2@test.com' })
    await seedProfile(db, user2.id)
    const client2 = await seedClient(db, user2.id)
    const invoice = await seedInvoice(db, user2.id, client2.id)

    const { GET } = await import('@/app/api/invoices/[id]/route')
    const req = await makeReq('GET', `/api/invoices/${invoice.id}`)
    const res = await GET(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 for soft-deleted invoice', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { deletedAt: new Date().toISOString() })

    const { GET } = await import('@/app/api/invoices/[id]/route')
    const req = await makeReq('GET', `/api/invoices/${invoice.id}`)
    const res = await GET(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(404)
  })
})

// ── PATCH /api/invoices/[id] ──────────────────────────────────────────────────

describe('PATCH /api/invoices/[id]', () => {
  it('updates a draft invoice and recomputes totals', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId)

    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const req = await makeReq('PATCH', `/api/invoices/${invoice.id}`, {
      lineItems: [{ description: 'Updated Work', quantity: 3, unitPrice: 5000, taxable: false }],
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.subtotal).toBe(15000) // 3 * 5000
    expect(body.data.total).toBe(15000)
  })

  it('returns 403 FORBIDDEN for non-draft invoice', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent' })

    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const req = await makeReq('PATCH', `/api/invoices/${invoice.id}`, { notes: 'test' })
    const res = await PATCH(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('returns 400 VALIDATION_ERROR for invalid patch data', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId)

    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const req = await makeReq('PATCH', `/api/invoices/${invoice.id}`, {
      issueDate: 'not-a-date',
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(400)
  })
})

// ── DELETE /api/invoices/[id] ─────────────────────────────────────────────────

describe('DELETE /api/invoices/[id]', () => {
  it('soft-deletes a draft invoice (sets deletedAt)', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId)

    const { DELETE } = await import('@/app/api/invoices/[id]/route')
    const req = await makeReq('DELETE', `/api/invoices/${invoice.id}`)
    const res = await DELETE(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(200)

    const row = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.id)).then((r) => r[0])
    expect(row.deletedAt).not.toBeNull()
  })

  it('returns 403 for non-draft invoice', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent' })

    const { DELETE } = await import('@/app/api/invoices/[id]/route')
    const req = await makeReq('DELETE', `/api/invoices/${invoice.id}`)
    const res = await DELETE(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(403)
  })

  it('physical row still exists after soft-delete', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId)

    const { DELETE } = await import('@/app/api/invoices/[id]/route')
    await DELETE(await makeReq('DELETE', `/api/invoices/${invoice.id}`), { params: Promise.resolve({ id: invoice.id }) })

    const all = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.id))
    expect(all).toHaveLength(1) // row exists, just has deletedAt set
  })
})

// ── POST /api/invoices/[id]/send ──────────────────────────────────────────────

describe('POST /api/invoices/[id]/send', () => {
  it('changes draft invoice status to sent and sets sentAt', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId)

    const { POST } = await import('@/app/api/invoices/[id]/send/route')
    const req = await makeReq('POST', `/api/invoices/${invoice.id}/send`, {
      recipientEmail: 'client@example.com',
    })
    const res = await POST(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(200)

    const row = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.id)).then((r) => r[0])
    expect(row.status).toBe('sent')
    expect(row.sentAt).not.toBeNull()
  })

  it('returns 400 INVALID_STATUS if invoice is not draft', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent' })

    const { POST } = await import('@/app/api/invoices/[id]/send/route')
    const req = await makeReq('POST', `/api/invoices/${invoice.id}/send`, { recipientEmail: 'a@b.com' })
    const res = await POST(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_STATUS')
  })

  it('returns 400 VALIDATION_ERROR for invalid recipientEmail', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId)

    const { POST } = await import('@/app/api/invoices/[id]/send/route')
    const req = await makeReq('POST', `/api/invoices/${invoice.id}/send`, { recipientEmail: 'not-email' })
    const res = await POST(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

// ── POST /api/invoices/[id]/void ──────────────────────────────────────────────

describe('POST /api/invoices/[id]/void', () => {
  it('voids a sent invoice', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent' })

    const { POST } = await import('@/app/api/invoices/[id]/void/route')
    const req = await makeReq('POST', `/api/invoices/${invoice.id}/void`)
    const res = await POST(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(200)

    const row = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.id)).then((r) => r[0])
    expect(row.status).toBe('void')
  })

  it('voids a draft invoice', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'draft' })

    const { POST } = await import('@/app/api/invoices/[id]/void/route')
    const req = await makeReq('POST', `/api/invoices/${invoice.id}/void`)
    const res = await POST(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(200)
  })

  it('returns 400 INVALID_STATUS if invoice is already void', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'void' })

    const { POST } = await import('@/app/api/invoices/[id]/void/route')
    const req = await makeReq('POST', `/api/invoices/${invoice.id}/void`)
    const res = await POST(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_STATUS')
  })

  it('returns 400 INVALID_STATUS if invoice is paid', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'paid' })

    const { POST } = await import('@/app/api/invoices/[id]/void/route')
    const req = await makeReq('POST', `/api/invoices/${invoice.id}/void`)
    const res = await POST(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(400)
  })
})

// ── POST /api/invoices/[id]/duplicate ────────────────────────────────────────

describe('POST /api/invoices/[id]/duplicate', () => {
  it('creates a new draft invoice with a new number', async () => {
    const { db } = testDb
    const original = await seedInvoice(db, userId, clientId)

    const { POST } = await import('@/app/api/invoices/[id]/duplicate/route')
    const req = await makeReq('POST', `/api/invoices/${original.id}/duplicate`)
    const res = await POST(req, { params: Promise.resolve({ id: original.id }) })
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.data.status).toBe('draft')
    expect(body.data.id).not.toBe(original.id)
    expect(body.data.invoiceNumber).not.toBe(original.invoiceNumber)
  })

  it('sets issueDate to today on the duplicate', async () => {
    const { db } = testDb
    const original = await seedInvoice(db, userId, clientId, { issueDate: '2020-01-01' })

    const { POST } = await import('@/app/api/invoices/[id]/duplicate/route')
    const req = await makeReq('POST', `/api/invoices/${original.id}/duplicate`)
    const res = await POST(req, { params: Promise.resolve({ id: original.id }) })

    const body = await res.json()
    expect(body.data.issueDate).toBe(todayUtc())
  })

  it('increments nextInvoiceNumber for the duplicate', async () => {
    const { db } = testDb
    const original = await seedInvoice(db, userId, clientId)

    const { POST } = await import('@/app/api/invoices/[id]/duplicate/route')
    await POST(await makeReq('POST', `/api/invoices/${original.id}/duplicate`), { params: Promise.resolve({ id: original.id }) })

    const profile = await db.select()
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.userId, userId))
      .then((r) => r[0])
    expect(profile.nextInvoiceNumber).toBe(2)
  })

  it('copies lineItems from the original', async () => {
    const { db } = testDb
    const original = await seedInvoice(db, userId, clientId)

    const { POST } = await import('@/app/api/invoices/[id]/duplicate/route')
    const req = await makeReq('POST', `/api/invoices/${original.id}/duplicate`)
    const res = await POST(req, { params: Promise.resolve({ id: original.id }) })

    const body = await res.json()
    expect(body.data.lineItems).toHaveLength(1)
    expect(body.data.lineItems[0].description).toBe('Service')
  })

  it('resets amountPaid and sentAt to 0/null on the duplicate', async () => {
    const { db } = testDb
    const original = await seedInvoice(db, userId, clientId, {
      status: 'sent',
      sentAt: new Date().toISOString(),
      amountPaid: 5000,
    })

    const { POST } = await import('@/app/api/invoices/[id]/duplicate/route')
    const req = await makeReq('POST', `/api/invoices/${original.id}/duplicate`)
    const res = await POST(req, { params: Promise.resolve({ id: original.id }) })

    const body = await res.json()
    expect(body.data.amountPaid).toBe(0)
    expect(body.data.sentAt).toBeNull()
    expect(body.data.status).toBe('draft')
  })
})

// ── GET /api/invoices/[id]/pdf ────────────────────────────────────────────────

describe('GET /api/invoices/[id]/pdf', () => {
  it('returns application/pdf content type', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId)

    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    const req = await makeReq('GET', `/api/invoices/${invoice.id}/pdf`)
    const res = await GET(req, { params: Promise.resolve({ id: invoice.id }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/pdf')
  })

  it('returns 404 for non-existent invoice', async () => {
    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    const req = await makeReq('GET', `/api/invoices/${uuid()}/pdf`)
    const res = await GET(req, { params: Promise.resolve({ id: uuid() }) })
    expect(res.status).toBe(404)
  })

  it('reads invoice data from SQLite (not in-memory store)', async () => {
    // If lib/store.ts is deleted and PDF generation succeeds, this confirms DB is used
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId)

    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    const req = await makeReq('GET', `/api/invoices/${invoice.id}/pdf`)
    const res = await GET(req, { params: Promise.resolve({ id: invoice.id }) })
    // If this succeeds without throwing "store is not defined", DB is wired correctly
    expect(res.status).toBe(200)
  })
})
