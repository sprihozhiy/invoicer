import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'

import * as schema from '@/lib/schema'
import { todayUtc } from '@/lib/time'
import {
  createTestDb,
  seedClient,
  seedInvoice,
  seedPayment,
  seedProfile,
  seedUser,
} from './helpers/db'

async function loadPaymentRoutes() {
  const testDb = createTestDb()
  vi.resetModules()
  globalThis.__invoicer_db__ = testDb.db

  const auth = await import('@/lib/auth')
  const paymentsRoute = await import('@/app/api/invoices/[id]/payments/route')
  const paymentByIdRoute = await import('@/app/api/invoices/[id]/payments/[paymentId]/route')

  return {
    ...testDb,
    auth,
    paymentsRoute,
    paymentByIdRoute,
  }
}

function authedRequest(url: string, accessToken: string, options?: RequestInit): NextRequest {
  return new NextRequest(url, {
    ...options,
    headers: {
      ...(options?.headers as Record<string, string> | undefined),
      cookie: `invoicer_access=${accessToken}`,
    },
  })
}

describe('F9 payment route migration tests', () => {
  afterEach(() => {
    delete globalThis.__invoicer_db__
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('GET /api/invoices/[id]/payments returns payments ordered by paidAt DESC then createdAt DESC', async () => {
    const { db, sqlite, auth, paymentsRoute } = await loadPaymentRoutes()
    try {
      const user = await seedUser(db)
      await seedProfile(db, user.id)
      const client = await seedClient(db, user.id)
      const invoice = await seedInvoice(db, user.id, client.id, { status: 'sent' })

      await seedPayment(db, invoice.id, { amount: 2500, paidAt: '2026-03-01' })
      await seedPayment(db, invoice.id, { amount: 3000, paidAt: '2026-03-10' })

      const { accessToken } = auth.issueSession(user.id)
      const req = authedRequest(`http://localhost/api/invoices/${invoice.id}/payments`, accessToken)

      const response = await paymentsRoute.GET(req, {
        params: Promise.resolve({ id: invoice.id }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data).toHaveLength(2)
      expect(json.data[0].paidAt).toBe('2026-03-10')
      expect(json.data[1].paidAt).toBe('2026-03-01')
    } finally {
      sqlite.close()
    }
  })

  it('POST /api/invoices/[id]/payments returns VALIDATION_ERROR on schema violations', async () => {
    const { db, sqlite, auth, paymentsRoute } = await loadPaymentRoutes()
    try {
      const user = await seedUser(db)
      await seedProfile(db, user.id)
      const client = await seedClient(db, user.id)
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: 'sent',
        total: 10000,
        amountPaid: 0,
        amountDue: 10000,
      })

      const { accessToken } = auth.issueSession(user.id)
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          amount: 1000,
          method: 'wire',
          paidAt: '03/10/2026',
        }),
      })

      const response = await paymentsRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.details).toBeDefined()
    } finally {
      sqlite.close()
    }
  })

  it('POST /api/invoices/[id]/payments returns PAYMENT_EXCEEDS_DUE when amount is greater than amountDue', async () => {
    const { db, sqlite, auth, paymentsRoute } = await loadPaymentRoutes()
    try {
      const user = await seedUser(db)
      await seedProfile(db, user.id)
      const client = await seedClient(db, user.id)
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: 'sent',
        total: 10000,
        amountPaid: 0,
        amountDue: 10000,
      })

      const { accessToken } = auth.issueSession(user.id)
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          amount: 10001,
          method: 'cash',
          paidAt: '2026-03-01',
        }),
      })

      const response = await paymentsRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error.code).toBe('PAYMENT_EXCEEDS_DUE')
      expect(json.error.field).toBe('amount')
    } finally {
      sqlite.close()
    }
  })

  it('POST /api/invoices/[id]/payments creates partial payment and returns stored status (not computed overdue)', async () => {
    const { db, sqlite, auth, paymentsRoute } = await loadPaymentRoutes()
    try {
      const user = await seedUser(db)
      await seedProfile(db, user.id)
      const client = await seedClient(db, user.id)
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: 'sent',
        dueDate: '2025-01-01',
        total: 10000,
        amountPaid: 0,
        amountDue: 10000,
      })

      const { accessToken } = auth.issueSession(user.id)
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          amount: 4000,
          method: 'cash',
          paidAt: '2026-03-01',
        }),
      })

      const response = await paymentsRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      })

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.data.payment.amount).toBe(4000)
      expect(json.data.invoice.status).toBe('partial')
      expect(json.data.invoice.amountPaid).toBe(4000)
      expect(json.data.invoice.amountDue).toBe(6000)
    } finally {
      sqlite.close()
    }
  })

  it('POST /api/invoices/[id]/payments defaults paidAt to today and marks fully paid invoice', async () => {
    const { db, sqlite, auth, paymentsRoute } = await loadPaymentRoutes()
    try {
      const user = await seedUser(db)
      await seedProfile(db, user.id)
      const client = await seedClient(db, user.id)
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: 'sent',
        total: 10000,
        amountPaid: 0,
        amountDue: 10000,
      })

      const { accessToken } = auth.issueSession(user.id)
      const req = new NextRequest(`http://localhost/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `invoicer_access=${accessToken}`,
        },
        body: JSON.stringify({
          amount: 10000,
          method: 'bank_transfer',
        }),
      })

      const response = await paymentsRoute.POST(req, {
        params: Promise.resolve({ id: invoice.id }),
      })

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.data.payment.paidAt).toBe(todayUtc())
      expect(json.data.invoice.status).toBe('paid')
      expect(json.data.invoice.amountDue).toBe(0)
      expect(json.data.invoice.paidAt).toBe(`${todayUtc()}T00:00:00.000Z`)
    } finally {
      sqlite.close()
    }
  })

  it('DELETE /api/invoices/[id]/payments/[paymentId] deletes payment and recalculates invoice to sent', async () => {
    const { db, sqlite, auth, paymentByIdRoute } = await loadPaymentRoutes()
    try {
      const user = await seedUser(db)
      await seedProfile(db, user.id)
      const client = await seedClient(db, user.id)
      const invoice = await seedInvoice(db, user.id, client.id, {
        status: 'partial',
        total: 10000,
        amountPaid: 4000,
        amountDue: 6000,
      })

      const payment = await seedPayment(db, invoice.id, { amount: 4000, paidAt: '2026-03-01' })

      const { accessToken } = auth.issueSession(user.id)
      const req = authedRequest(
        `http://localhost/api/invoices/${invoice.id}/payments/${payment.id}`,
        accessToken,
        { method: 'DELETE' },
      )

      const response = await paymentByIdRoute.DELETE(req, {
        params: Promise.resolve({ id: invoice.id, paymentId: payment.id }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)

      const updatedInvoice = await db.query.invoices.findFirst({
        where: eq(schema.invoices.id, invoice.id),
      })
      expect(updatedInvoice?.status).toBe('sent')
      expect(updatedInvoice?.amountPaid).toBe(0)
      expect(updatedInvoice?.amountDue).toBe(10000)
      expect(updatedInvoice?.paidAt).toBeNull()
    } finally {
      sqlite.close()
    }
  })
})
