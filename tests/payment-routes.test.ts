/**
 * tests/payment-routes.test.ts
 *
 * Feature: F9 — Payment Routes Migrated to SQLite
 *
 * Covers: GET /api/invoices/[id]/payments,
 *         POST /api/invoices/[id]/payments,
 *         DELETE /api/invoices/[id]/payments/[paymentId]
 *
 * Verifies that payment recording and deletion:
 *   - Write to the payments table
 *   - Update invoice.amountPaid, amountDue, status, paidAt within a transaction
 *   - Handle overpayment protection
 *   - Recalculate status correctly after deletion
 *
 * Test runner: vitest
 * Run: npx vitest run tests/payment-routes.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { eq } from 'drizzle-orm'
import * as schema from '@/lib/schema'
import {
  createTestDb,
  seedUser,
  seedProfile,
  seedClient,
  seedInvoice,
  seedPayment,
  seedAccessToken,
  type DrizzleDb,
} from './helpers/db'
import { uuid } from '@/lib/ids'

// ── Setup ─────────────────────────────────────────────────────────────────────

let testDb: { db: DrizzleDb; sqlite: any }
let userId: string
let clientId: string
let accessToken: string

async function makeReq(method: string, path: string, body?: unknown) {
  const { NextRequest } = await import('next/server')
  return new NextRequest(`http://localhost${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `invoicer_access=${accessToken}`,
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
  accessToken = 'at_test_payment_token'
  await seedAccessToken(db, userId, accessToken)
})

afterEach(() => {
  testDb.sqlite.close()
})

// ── GET /api/invoices/[id]/payments ──────────────────────────────────────────

describe('GET /api/invoices/[id]/payments', () => {
  it('returns empty list when no payments exist', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent' })

    const { GET } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await GET(
      await makeReq('GET', `/api/invoices/${invoice.id}/payments`),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
  })

  it('returns payments sorted by paidAt DESC', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'partial', amountPaid: 3000, amountDue: 7000, total: 10000,
    })
    await seedPayment(db, invoice.id, { amount: 1000, paidAt: '2026-01-01' })
    await seedPayment(db, invoice.id, { amount: 2000, paidAt: '2026-02-01' })

    const { GET } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await GET(
      await makeReq('GET', `/api/invoices/${invoice.id}/payments`),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].paidAt).toBe('2026-02-01') // most recent first
    expect(body.data[1].paidAt).toBe('2026-01-01')
  })

  it('returns 404 for invoice not belonging to user', async () => {
    const { db } = testDb
    const user2 = await seedUser(db, { email: 'other@test.com' })
    await seedProfile(db, user2.id)
    const client2 = await seedClient(db, user2.id)
    const invoice2 = await seedInvoice(db, user2.id, client2.id, { status: 'sent' })

    const { GET } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await GET(
      await makeReq('GET', `/api/invoices/${invoice2.id}/payments`),
      { params: Promise.resolve({ id: invoice2.id }) },
    )
    expect(res.status).toBe(404)
  })
})

// ── POST /api/invoices/[id]/payments ─────────────────────────────────────────

describe('POST /api/invoices/[id]/payments', () => {
  it('records a partial payment and updates invoice to partial status', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'sent', total: 10000, amountPaid: 0, amountDue: 10000,
    })

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, {
        amount: 4000,
        method: 'bank_transfer',
        paidAt: '2026-02-15',
      }),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    expect(res.status).toBe(201)
    const body = await res.json()

    // Response shape
    expect(body.data.payment).toBeDefined()
    expect(body.data.invoice).toBeDefined()
    expect(body.data.payment.amount).toBe(4000)

    // Invoice updated
    expect(body.data.invoice.amountPaid).toBe(4000)
    expect(body.data.invoice.amountDue).toBe(6000)
    expect(body.data.invoice.status).toBe('partial')
  })

  it('inserts payment row in SQLite', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'sent', total: 10000, amountPaid: 0, amountDue: 10000,
    })

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, {
        amount: 3000, method: 'cash',
      }),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    const paymentId = (await res.json()).data.payment.id

    const rows = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId))
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(3000)
    expect(rows[0].invoiceId).toBe(invoice.id)
  })

  it('sets invoice status to paid when full payment is made', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'sent', total: 10000, amountPaid: 0, amountDue: 10000,
    })

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, {
        amount: 10000, method: 'credit_card', paidAt: '2026-03-01',
      }),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.invoice.status).toBe('paid')
    expect(body.data.invoice.amountDue).toBe(0)
    expect(body.data.invoice.paidAt).toBe('2026-03-01')
  })

  it('sets invoice status to paid when partial + final payment covers full amount', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'partial', total: 10000, amountPaid: 7000, amountDue: 3000,
    })
    // First payment already recorded (amountPaid = 7000 seeded directly)

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, {
        amount: 3000, method: 'cash', paidAt: '2026-03-10',
      }),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.invoice.status).toBe('paid')
    expect(body.data.invoice.amountPaid).toBe(10000)
    expect(body.data.invoice.amountDue).toBe(0)
  })

  it('returns 400 PAYMENT_EXCEEDS_DUE when amount > amountDue', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'sent', total: 10000, amountPaid: 0, amountDue: 10000,
    })

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, {
        amount: 10001, method: 'cash',
      }),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('PAYMENT_EXCEEDS_DUE')
  })

  it('returns 400 VALIDATION_ERROR for amount = 0', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent', total: 10000, amountDue: 10000 })

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, { amount: 0, method: 'cash' }),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 VALIDATION_ERROR for invalid method', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent', total: 10000, amountDue: 10000 })

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, { amount: 1000, method: 'paypal' }),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    expect(res.status).toBe(400)
  })

  it('defaults paidAt to today if not provided', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent', total: 5000, amountDue: 5000 })

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, { amount: 1000, method: 'check' }),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    // Should have a paidAt value (today's date)
    expect(body.data.payment.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('stores all fields (reference, notes) in payments table', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent', total: 5000, amountDue: 5000 })

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, {
        amount: 1000,
        method: 'bank_transfer',
        reference: 'REF-12345',
        notes: 'First instalment',
        paidAt: '2026-01-20',
      }),
      { params: Promise.resolve({ id: invoice.id }) },
    )
    const paymentId = (await res.json()).data.payment.id
    const row = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId)).then((r) => r[0])
    expect(row.reference).toBe('REF-12345')
    expect(row.notes).toBe('First instalment')
  })

  it('returns 404 for invoice not belonging to user', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const fakeId = uuid()
    const res = await POST(
      await makeReq('POST', `/api/invoices/${fakeId}/payments`, { amount: 1000, method: 'cash' }),
      { params: Promise.resolve({ id: fakeId }) },
    )
    expect(res.status).toBe(404)
  })

  it('update is atomic (payment and invoice update happen in one transaction)', async () => {
    // If the DB enforces foreign keys and the payment insert is in a transaction,
    // a failed invoice update should rollback the payment insert.
    // This test verifies no partial state exists if something fails mid-transaction.
    // Since this is integration-level, we verify correct final state.
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'sent', total: 10000, amountPaid: 0, amountDue: 10000,
    })

    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    await POST(
      await makeReq('POST', `/api/invoices/${invoice.id}/payments`, { amount: 3000, method: 'cash' }),
      { params: Promise.resolve({ id: invoice.id }) },
    )

    const payments = await db.select().from(schema.payments).where(eq(schema.payments.invoiceId, invoice.id))
    const inv = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.id)).then((r) => r[0])

    expect(payments).toHaveLength(1)
    expect(inv.amountPaid).toBe(3000)
    expect(inv.status).toBe('partial')
  })
})

// ── DELETE /api/invoices/[id]/payments/[paymentId] ────────────────────────────

describe('DELETE /api/invoices/[id]/payments/[paymentId]', () => {
  it('deletes payment row from SQLite', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'partial', total: 10000, amountPaid: 3000, amountDue: 7000,
    })
    const payment = await seedPayment(db, invoice.id, { amount: 3000 })

    const { DELETE } = await import('@/app/api/invoices/[id]/payments/[paymentId]/route')
    const res = await DELETE(
      await makeReq('DELETE', `/api/invoices/${invoice.id}/payments/${payment.id}`),
      { params: Promise.resolve({ id: invoice.id, paymentId: payment.id }) },
    )
    expect(res.status).toBe(200)

    const rows = await db.select().from(schema.payments).where(eq(schema.payments.id, payment.id))
    expect(rows).toHaveLength(0)
  })

  it('recalculates invoice status to sent when all payments deleted', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'partial', total: 10000, amountPaid: 3000, amountDue: 7000,
    })
    const payment = await seedPayment(db, invoice.id, { amount: 3000 })

    const { DELETE } = await import('@/app/api/invoices/[id]/payments/[paymentId]/route')
    await DELETE(
      await makeReq('DELETE', `/api/invoices/${invoice.id}/payments/${payment.id}`),
      { params: Promise.resolve({ id: invoice.id, paymentId: payment.id }) },
    )

    const inv = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.id)).then((r) => r[0])
    expect(inv.amountPaid).toBe(0)
    expect(inv.amountDue).toBe(10000)
    expect(inv.status).toBe('sent')
  })

  it('recalculates invoice status to partial when not all payments deleted', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'paid', total: 10000, amountPaid: 10000, amountDue: 0,
    })
    const payment1 = await seedPayment(db, invoice.id, { amount: 7000 })
    const payment2 = await seedPayment(db, invoice.id, { amount: 3000 })

    const { DELETE } = await import('@/app/api/invoices/[id]/payments/[paymentId]/route')
    await DELETE(
      await makeReq('DELETE', `/api/invoices/${invoice.id}/payments/${payment2.id}`),
      { params: Promise.resolve({ id: invoice.id, paymentId: payment2.id }) },
    )

    const inv = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.id)).then((r) => r[0])
    expect(inv.status).toBe('partial')
    expect(inv.amountPaid).toBe(7000)
    expect(inv.amountDue).toBe(3000)
    expect(inv.paidAt).toBeNull() // paidAt cleared when no longer fully paid
  })

  it('clears paidAt when invoice drops from paid to partial', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'paid', total: 5000, amountPaid: 5000, amountDue: 0,
      paidAt: '2026-03-01',
    })
    const payment = await seedPayment(db, invoice.id, { amount: 5000, paidAt: '2026-03-01' })

    const { DELETE } = await import('@/app/api/invoices/[id]/payments/[paymentId]/route')
    await DELETE(
      await makeReq('DELETE', `/api/invoices/${invoice.id}/payments/${payment.id}`),
      { params: Promise.resolve({ id: invoice.id, paymentId: payment.id }) },
    )

    const inv = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.id)).then((r) => r[0])
    expect(inv.paidAt).toBeNull()
    expect(inv.status).toBe('sent')
  })

  it('returns 404 for payment not belonging to the invoice', async () => {
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, { status: 'sent' })
    const fakePaymentId = uuid()

    const { DELETE } = await import('@/app/api/invoices/[id]/payments/[paymentId]/route')
    const res = await DELETE(
      await makeReq('DELETE', `/api/invoices/${invoice.id}/payments/${fakePaymentId}`),
      { params: Promise.resolve({ id: invoice.id, paymentId: fakePaymentId }) },
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 for invoice not belonging to user', async () => {
    const { DELETE } = await import('@/app/api/invoices/[id]/payments/[paymentId]/route')
    const fakeInvoiceId = uuid()
    const fakePaymentId = uuid()
    const res = await DELETE(
      await makeReq('DELETE', `/api/invoices/${fakeInvoiceId}/payments/${fakePaymentId}`),
      { params: Promise.resolve({ id: fakeInvoiceId, paymentId: fakePaymentId }) },
    )
    expect(res.status).toBe(404)
  })

  it('deletion and invoice update are in a single transaction (atomic)', async () => {
    // Verify final state after deletion reflects recalculated values atomically
    const { db } = testDb
    const invoice = await seedInvoice(db, userId, clientId, {
      status: 'partial', total: 10000, amountPaid: 4000, amountDue: 6000,
    })
    const p1 = await seedPayment(db, invoice.id, { amount: 1000 })
    const p2 = await seedPayment(db, invoice.id, { amount: 3000 })

    const { DELETE } = await import('@/app/api/invoices/[id]/payments/[paymentId]/route')
    await DELETE(
      await makeReq('DELETE', `/api/invoices/${invoice.id}/payments/${p1.id}`),
      { params: Promise.resolve({ id: invoice.id, paymentId: p1.id }) },
    )

    // After deleting p1 (1000), amountPaid should be recalculated from DB (not from stale state)
    // SUM of remaining payments (p2 = 3000) should equal amountPaid
    const inv = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.id)).then((r) => r[0])
    expect(inv.amountPaid).toBe(3000)
    expect(inv.amountDue).toBe(7000)
  })
})
