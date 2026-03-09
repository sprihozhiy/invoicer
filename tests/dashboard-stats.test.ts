/**
 * tests/dashboard-stats.test.ts
 *
 * Feature: F13 — Dashboard Stats Route Migrated to SQLite
 *
 * Covers: GET /api/dashboard/stats
 *
 * Verifies that all five aggregate fields are computed via SQL queries:
 *   - totalOutstanding
 *   - totalOverdue
 *   - paidThisMonth
 *   - recentInvoices (5 most recent)
 *   - overdueInvoices (all overdue, ordered by dueDate ASC)
 *
 * Test runner: vitest
 * Run: npx vitest run tests/dashboard-stats.test.ts
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

async function makeReq(method: string, path: string) {
  const { NextRequest } = await import('next/server')
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { Cookie: `invoicer_access=${accessToken}` },
  })
}

beforeEach(async () => {
  testDb = createTestDb()
  const { db } = testDb
  const user = await seedUser(db)
  userId = user.id
  await seedProfile(db, userId, { defaultCurrency: 'USD' })
  const client = await seedClient(db, userId)
  clientId = client.id
  accessToken = 'at_test_dashboard_token'
  await seedAccessToken(db, userId, accessToken)
})

afterEach(() => {
  testDb.sqlite.close()
})

// ── GET /api/dashboard/stats ──────────────────────────────────────────────────

describe('GET /api/dashboard/stats', () => {
  it('returns correct shape with zeroed values when no invoices exist', async () => {
    const { GET } = await import('@/app/api/dashboard/stats/route')
    const res = await GET(await makeReq('GET', '/api/dashboard/stats'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toMatchObject({
      totalOutstanding: 0,
      totalOverdue:     0,
      paidThisMonth:    0,
      recentInvoices:   [],
      overdueInvoices:  [],
    })
  })

  it('returns 401 for unauthenticated request', async () => {
    const { GET } = await import('@/app/api/dashboard/stats/route')
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/dashboard/stats')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  // ── totalOutstanding ──────────────────────────────────────────────────────

  describe('totalOutstanding', () => {
    it('sums amountDue for sent and partial invoices in defaultCurrency', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent',
        currency: 'USD',
        total: 10000, amountPaid: 0, amountDue: 10000,
      })
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0002',
        status: 'partial',
        currency: 'USD',
        total: 20000, amountPaid: 5000, amountDue: 15000,
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.totalOutstanding).toBe(25000) // 10000 + 15000
    })

    it('excludes paid invoices from totalOutstanding', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'paid', currency: 'USD', total: 10000, amountPaid: 10000, amountDue: 0,
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.totalOutstanding).toBe(0)
    })

    it('excludes draft invoices from totalOutstanding', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'draft', currency: 'USD', total: 10000, amountPaid: 0, amountDue: 10000,
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.totalOutstanding).toBe(0)
    })

    it('excludes soft-deleted invoices from totalOutstanding', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent', currency: 'USD', total: 10000, amountDue: 10000,
        deletedAt: new Date().toISOString(),
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.totalOutstanding).toBe(0)
    })

    it('excludes invoices in non-default currency from totalOutstanding', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent', currency: 'EUR', total: 10000, amountDue: 10000,
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.totalOutstanding).toBe(0)
    })
  })

  // ── totalOverdue ──────────────────────────────────────────────────────────

  describe('totalOverdue', () => {
    it('sums amountDue for sent/partial invoices with dueDate < today', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent', currency: 'USD',
        dueDate: '2020-01-01', // past
        total: 8000, amountPaid: 0, amountDue: 8000,
      })
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0002',
        status: 'sent', currency: 'USD',
        dueDate: '2099-01-01', // future
        total: 5000, amountPaid: 0, amountDue: 5000,
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.totalOverdue).toBe(8000)
      expect(body.data.totalOutstanding).toBe(13000) // both sent
    })

    it('does not count overdue invoices in non-default currency', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent', currency: 'GBP',
        dueDate: '2020-01-01',
        total: 5000, amountDue: 5000,
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.totalOverdue).toBe(0)
    })
  })

  // ── paidThisMonth ─────────────────────────────────────────────────────────

  describe('paidThisMonth', () => {
    it('sums payments with paidAt in current calendar month', async () => {
      const { db } = testDb
      const invoice = await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'partial', currency: 'USD', total: 10000, amountPaid: 3000, amountDue: 7000,
      })

      // Get current month dates
      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`
      const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-15`

      await seedPayment(db, invoice.id, { amount: 2000, paidAt: thisMonth })
      await seedPayment(db, invoice.id, { amount: 1000, paidAt: lastMonth || '2025-12-15' })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.paidThisMonth).toBe(2000) // only this month's payment
    })

    it('excludes payments from invoices in non-default currency', async () => {
      const { db } = testDb
      const invoice = await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'paid', currency: 'EUR', total: 5000, amountPaid: 5000, amountDue: 0,
      })

      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`
      await seedPayment(db, invoice.id, { amount: 5000, paidAt: thisMonth })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.paidThisMonth).toBe(0)
    })
  })

  // ── recentInvoices ────────────────────────────────────────────────────────

  describe('recentInvoices', () => {
    it('returns at most 5 most recent invoices by createdAt DESC', async () => {
      const { db } = testDb
      for (let i = 1; i <= 7; i++) {
        await seedInvoice(db, userId, clientId, { invoiceNumber: `INV-${String(i).padStart(4, '0')}` })
      }

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.recentInvoices).toHaveLength(5)
    })

    it('excludes soft-deleted invoices from recentInvoices', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        deletedAt: new Date().toISOString(),
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.recentInvoices).toHaveLength(0)
    })

    it('applies withComputedStatus to recentInvoices', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent',
        dueDate: '2020-01-01', // overdue
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.recentInvoices[0].status).toBe('overdue')
    })

    it('includes invoices from all currencies in recentInvoices', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, { invoiceNumber: 'INV-0001', currency: 'USD' })
      await seedInvoice(db, userId, clientId, { invoiceNumber: 'INV-0002', currency: 'EUR' })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.recentInvoices).toHaveLength(2)
    })

    it('returns only current user invoices in recentInvoices', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, { invoiceNumber: 'INV-0001' })

      const user2 = await seedUser(db, { email: 'other@test.com' })
      await seedProfile(db, user2.id)
      const client2 = await seedClient(db, user2.id)
      await seedInvoice(db, user2.id, client2.id, { invoiceNumber: 'INV-0001' })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.recentInvoices).toHaveLength(1)
    })
  })

  // ── overdueInvoices ───────────────────────────────────────────────────────

  describe('overdueInvoices', () => {
    it('returns all overdue invoices (status in sent/partial, dueDate < today)', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent', dueDate: '2020-01-01',
      })
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0002',
        status: 'partial', dueDate: '2020-06-01',
      })
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0003',
        status: 'sent', dueDate: '2099-01-01', // not overdue
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.overdueInvoices).toHaveLength(2)
    })

    it('orders overdueInvoices by dueDate ASC (most urgent first)', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent', dueDate: '2020-06-01',
      })
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0002',
        status: 'sent', dueDate: '2020-01-01',
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.overdueInvoices[0].dueDate).toBe('2020-01-01')
      expect(body.data.overdueInvoices[1].dueDate).toBe('2020-06-01')
    })

    it('excludes soft-deleted invoices from overdueInvoices', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent', dueDate: '2020-01-01',
        deletedAt: new Date().toISOString(),
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.overdueInvoices).toHaveLength(0)
    })

    it('excludes paid/void/draft invoices from overdueInvoices', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001', status: 'paid', dueDate: '2020-01-01',
      })
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0002', status: 'void', dueDate: '2020-01-01',
      })
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0003', status: 'draft', dueDate: '2020-01-01',
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.overdueInvoices).toHaveLength(0)
    })

    it('applies withComputedStatus to overdueInvoices items', async () => {
      const { db } = testDb
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent', dueDate: '2020-01-01',
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.overdueInvoices[0].status).toBe('overdue')
    })
  })

  // ── Integration: stats are isolated per user ──────────────────────────────

  describe('data isolation', () => {
    it('stats are computed only for the authenticated user, not all users', async () => {
      const { db } = testDb
      // Seed for authenticated user
      await seedInvoice(db, userId, clientId, {
        invoiceNumber: 'INV-0001',
        status: 'sent', currency: 'USD', total: 5000, amountDue: 5000,
      })

      // Seed for another user (should not appear in stats)
      const user2 = await seedUser(db, { email: 'spy@test.com' })
      await seedProfile(db, user2.id, { defaultCurrency: 'USD' })
      const client2 = await seedClient(db, user2.id)
      await seedInvoice(db, user2.id, client2.id, {
        invoiceNumber: 'INV-0001',
        status: 'sent', currency: 'USD', total: 99999, amountDue: 99999,
      })

      const { GET } = await import('@/app/api/dashboard/stats/route')
      const body = await GET(await makeReq('GET', '/api/dashboard/stats')).then((r) => r.json())
      expect(body.data.totalOutstanding).toBe(5000) // only authenticated user's invoice
    })
  })
})
