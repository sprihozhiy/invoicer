/**
 * tests/client-routes.test.ts
 *
 * Feature: F10 — Client Routes Migrated to SQLite
 *
 * Covers: GET/POST /api/clients, GET/PATCH/DELETE /api/clients/[id],
 *         GET /api/clients/[id]/invoices
 *
 * Test runner: vitest
 * Run: npx vitest run tests/client-routes.test.ts
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
  seedAccessToken,
  type DrizzleDb,
} from './helpers/db'
import { uuid } from '@/lib/ids'

// ── Setup ─────────────────────────────────────────────────────────────────────

let testDb: { db: DrizzleDb; sqlite: any }
let userId: string
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
  accessToken = 'at_test_client_token'
  await seedAccessToken(db, userId, accessToken)
})

afterEach(() => {
  testDb.sqlite.close()
})

// ── GET /api/clients ──────────────────────────────────────────────────────────

describe('GET /api/clients', () => {
  it('returns empty list when no clients exist', async () => {
    const { GET } = await import('@/app/api/clients/route')
    const res = await GET(await makeReq('GET', '/api/clients'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
    expect(body.meta.total).toBe(0)
  })

  it('returns only clients belonging to the authenticated user', async () => {
    const { db } = testDb
    await seedClient(db, userId, { name: 'My Client' })

    const user2 = await seedUser(db, { email: 'other@test.com' })
    await seedProfile(db, user2.id)
    await seedClient(db, user2.id, { name: 'Their Client' })

    const { GET } = await import('@/app/api/clients/route')
    const res = await GET(await makeReq('GET', '/api/clients'))
    const body = await res.json()
    expect(body.meta.total).toBe(1)
    expect(body.data[0].name).toBe('My Client')
  })

  it('searches by name', async () => {
    const { db } = testDb
    await seedClient(db, userId, { name: 'Acme Corp' })
    await seedClient(db, userId, { name: 'Widget Inc' })

    const { GET } = await import('@/app/api/clients/route')
    const res = await GET(await makeReq('GET', '/api/clients?search=acme'))
    const body = await res.json()
    expect(body.meta.total).toBe(1)
    expect(body.data[0].name).toBe('Acme Corp')
  })

  it('searches by company', async () => {
    const { db } = testDb
    await seedClient(db, userId, { name: 'John Doe', company: 'TechCo' })
    await seedClient(db, userId, { name: 'Jane Smith', company: 'DesignCo' })

    const { GET } = await import('@/app/api/clients/route')
    const res = await GET(await makeReq('GET', '/api/clients?search=techco'))
    const body = await res.json()
    expect(body.meta.total).toBe(1)
    expect(body.data[0].company).toBe('TechCo')
  })

  it('paginates results', async () => {
    const { db } = testDb
    for (let i = 1; i <= 5; i++) {
      await seedClient(db, userId, { name: `Client ${i}` })
    }

    const { GET } = await import('@/app/api/clients/route')
    const res = await GET(await makeReq('GET', '/api/clients?page=1&limit=2'))
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.meta.total).toBe(5)
  })

  it('returns 401 for unauthenticated request', async () => {
    const { GET } = await import('@/app/api/clients/route')
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/clients')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

// ── POST /api/clients ─────────────────────────────────────────────────────────

describe('POST /api/clients', () => {
  it('creates a client and returns 201', async () => {
    const { POST } = await import('@/app/api/clients/route')
    const res = await POST(await makeReq('POST', '/api/clients', { name: 'New Client' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe('New Client')
    expect(body.data.userId).toBe(userId)
  })

  it('stores flat address columns when address is provided', async () => {
    const { db } = testDb
    const { POST } = await import('@/app/api/clients/route')
    const res = await POST(await makeReq('POST', '/api/clients', {
      name: 'Acme',
      address: { line1: '123 Main St', city: 'New York', country: 'US' },
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    const clientId = body.data.id

    const row = await db.select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .then((r) => r[0])

    expect(row.addressLine1).toBe('123 Main St')
    expect(row.addressCity).toBe('New York')
    expect(row.addressCountry).toBe('US')
  })

  it('returns address as nested object in response', async () => {
    const { POST } = await import('@/app/api/clients/route')
    const res = await POST(await makeReq('POST', '/api/clients', {
      name: 'Acme',
      address: { line1: '123 Main St', city: 'New York', country: 'US' },
    }))
    const body = await res.json()
    expect(body.data.address).toMatchObject({ line1: '123 Main St', city: 'New York', country: 'US' })
  })

  it('returns address as null when not provided', async () => {
    const { POST } = await import('@/app/api/clients/route')
    const res = await POST(await makeReq('POST', '/api/clients', { name: 'No Address' }))
    const body = await res.json()
    expect(body.data.address).toBeNull()
  })

  it('returns 400 VALIDATION_ERROR for empty name', async () => {
    const { POST } = await import('@/app/api/clients/route')
    const res = await POST(await makeReq('POST', '/api/clients', { name: '' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.name).toBeDefined()
  })

  it('returns 400 for invalid email', async () => {
    const { POST } = await import('@/app/api/clients/route')
    const res = await POST(await makeReq('POST', '/api/clients', { name: 'A', email: 'bad' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('stores client in SQLite (not in-memory store)', async () => {
    const { db } = testDb
    const { POST } = await import('@/app/api/clients/route')
    const res = await POST(await makeReq('POST', '/api/clients', { name: 'DB Client' }))
    const id = (await res.json()).data.id

    const rows = await db.select().from(schema.clients).where(eq(schema.clients.id, id))
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('DB Client')
  })
})

// ── GET /api/clients/[id] ─────────────────────────────────────────────────────

describe('GET /api/clients/[id]', () => {
  it('returns client with stats', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)

    const { GET } = await import('@/app/api/clients/[id]/route')
    const res = await GET(
      await makeReq('GET', `/api/clients/${client.id}`),
      { params: Promise.resolve({ id: client.id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(client.id)
    expect(body.data.stats).toBeDefined()
    expect(body.data.stats.totalInvoiced).toBeDefined()
    expect(body.data.stats.totalPaid).toBeDefined()
    expect(body.data.stats.totalOutstanding).toBeDefined()
    expect(body.data.stats.invoiceCount).toBeDefined()
  })

  it('computes stats aggregates from invoices table', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    await seedInvoice(db, userId, client.id, {
      invoiceNumber: 'INV-0001',
      status: 'sent',
      total: 100000,
      amountDue: 100000,
      amountPaid: 0,
    })

    const { GET } = await import('@/app/api/clients/[id]/route')
    const res = await GET(
      await makeReq('GET', `/api/clients/${client.id}`),
      { params: Promise.resolve({ id: client.id }) },
    )
    const body = await res.json()
    expect(body.data.stats.totalInvoiced).toBe(100000)
    expect(body.data.stats.totalOutstanding).toBe(100000)
    expect(body.data.stats.invoiceCount).toBe(1)
  })

  it('excludes voided invoices from totalInvoiced', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    await seedInvoice(db, userId, client.id, {
      invoiceNumber: 'INV-0001',
      status: 'void',
      total: 50000,
    })

    const { GET } = await import('@/app/api/clients/[id]/route')
    const res = await GET(
      await makeReq('GET', `/api/clients/${client.id}`),
      { params: Promise.resolve({ id: client.id }) },
    )
    const body = await res.json()
    expect(body.data.stats.totalInvoiced).toBe(0)
  })

  it('returns 404 for client belonging to another user', async () => {
    const { db } = testDb
    const user2 = await seedUser(db, { email: 'other@test.com' })
    await seedProfile(db, user2.id)
    const otherClient = await seedClient(db, user2.id)

    const { GET } = await import('@/app/api/clients/[id]/route')
    const res = await GET(
      await makeReq('GET', `/api/clients/${otherClient.id}`),
      { params: Promise.resolve({ id: otherClient.id }) },
    )
    expect(res.status).toBe(404)
  })

  it('lastInvoiceDate is the most recent invoice issueDate', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    await seedInvoice(db, userId, client.id, { invoiceNumber: 'INV-0001', issueDate: '2025-06-01' })
    await seedInvoice(db, userId, client.id, { invoiceNumber: 'INV-0002', issueDate: '2026-01-15' })

    const { GET } = await import('@/app/api/clients/[id]/route')
    const res = await GET(
      await makeReq('GET', `/api/clients/${client.id}`),
      { params: Promise.resolve({ id: client.id }) },
    )
    const body = await res.json()
    expect(body.data.stats.lastInvoiceDate).toBe('2026-01-15')
  })
})

// ── PATCH /api/clients/[id] ───────────────────────────────────────────────────

describe('PATCH /api/clients/[id]', () => {
  it('updates client fields', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)

    const { PATCH } = await import('@/app/api/clients/[id]/route')
    const res = await PATCH(
      await makeReq('PATCH', `/api/clients/${client.id}`, { name: 'Updated Name', phone: '+1-555-0000' }),
      { params: Promise.resolve({ id: client.id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Updated Name')
    expect(body.data.phone).toBe('+1-555-0000')
  })

  it('updates address flat columns', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)

    const { PATCH } = await import('@/app/api/clients/[id]/route')
    const res = await PATCH(
      await makeReq('PATCH', `/api/clients/${client.id}`, {
        address: { line1: '99 Oak Ave', city: 'Portland', country: 'US' },
      }),
      { params: Promise.resolve({ id: client.id }) },
    )
    expect(res.status).toBe(200)

    const row = await db.select().from(schema.clients).where(eq(schema.clients.id, client.id)).then((r) => r[0])
    expect(row.addressLine1).toBe('99 Oak Ave')
    expect(row.addressCity).toBe('Portland')
  })

  it('returns 400 VALIDATION_ERROR for invalid patch', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)

    const { PATCH } = await import('@/app/api/clients/[id]/route')
    const res = await PATCH(
      await makeReq('PATCH', `/api/clients/${client.id}`, { email: 'not-email' }),
      { params: Promise.resolve({ id: client.id }) },
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 for client not belonging to user', async () => {
    const { PATCH } = await import('@/app/api/clients/[id]/route')
    const res = await PATCH(
      await makeReq('PATCH', `/api/clients/${uuid()}`, { name: 'X' }),
      { params: Promise.resolve({ id: uuid() }) },
    )
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/clients/[id] ──────────────────────────────────────────────────

describe('DELETE /api/clients/[id]', () => {
  it('deletes a client with no invoices', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)

    const { DELETE } = await import('@/app/api/clients/[id]/route')
    const res = await DELETE(
      await makeReq('DELETE', `/api/clients/${client.id}`),
      { params: Promise.resolve({ id: client.id }) },
    )
    expect(res.status).toBe(200)

    const rows = await db.select().from(schema.clients).where(eq(schema.clients.id, client.id))
    expect(rows).toHaveLength(0)
  })

  it('returns 409 CLIENT_HAS_INVOICES when client has non-void invoices', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    await seedInvoice(db, userId, client.id, { invoiceNumber: 'INV-0001', status: 'sent' })

    const { DELETE } = await import('@/app/api/clients/[id]/route')
    const res = await DELETE(
      await makeReq('DELETE', `/api/clients/${client.id}`),
      { params: Promise.resolve({ id: client.id }) },
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('CLIENT_HAS_INVOICES')
  })

  it('allows deletion when all invoices are voided', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    await seedInvoice(db, userId, client.id, { invoiceNumber: 'INV-0001', status: 'void' })

    const { DELETE } = await import('@/app/api/clients/[id]/route')
    const res = await DELETE(
      await makeReq('DELETE', `/api/clients/${client.id}`),
      { params: Promise.resolve({ id: client.id }) },
    )
    expect(res.status).toBe(200)
  })

  it('allows deletion when invoices are soft-deleted (deletedAt set)', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    await seedInvoice(db, userId, client.id, {
      invoiceNumber: 'INV-0001',
      status: 'draft',
      deletedAt: new Date().toISOString(),
    })

    const { DELETE } = await import('@/app/api/clients/[id]/route')
    const res = await DELETE(
      await makeReq('DELETE', `/api/clients/${client.id}`),
      { params: Promise.resolve({ id: client.id }) },
    )
    expect(res.status).toBe(200)
  })

  it('returns 404 for client not belonging to user', async () => {
    const { DELETE } = await import('@/app/api/clients/[id]/route')
    const fakeId = uuid()
    const res = await DELETE(
      await makeReq('DELETE', `/api/clients/${fakeId}`),
      { params: Promise.resolve({ id: fakeId }) },
    )
    expect(res.status).toBe(404)
  })
})

// ── GET /api/clients/[id]/invoices ────────────────────────────────────────────

describe('GET /api/clients/[id]/invoices', () => {
  it('returns invoices for a specific client', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    const other = await seedClient(db, userId, { name: 'Other' })
    await seedInvoice(db, userId, client.id, { invoiceNumber: 'INV-0001' })
    await seedInvoice(db, userId, other.id,  { invoiceNumber: 'INV-0002' })

    const { GET } = await import('@/app/api/clients/[id]/invoices/route')
    const res = await GET(
      await makeReq('GET', `/api/clients/${client.id}/invoices`),
      { params: Promise.resolve({ id: client.id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta.total).toBe(1)
    expect(body.data[0].clientId).toBe(client.id)
  })

  it('excludes soft-deleted invoices', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    await seedInvoice(db, userId, client.id, {
      invoiceNumber: 'INV-0001',
      deletedAt: new Date().toISOString(),
    })

    const { GET } = await import('@/app/api/clients/[id]/invoices/route')
    const res = await GET(
      await makeReq('GET', `/api/clients/${client.id}/invoices`),
      { params: Promise.resolve({ id: client.id }) },
    )
    const body = await res.json()
    expect(body.meta.total).toBe(0)
  })

  it('filters by status', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    await seedInvoice(db, userId, client.id, { invoiceNumber: 'INV-0001', status: 'draft' })
    await seedInvoice(db, userId, client.id, { invoiceNumber: 'INV-0002', status: 'paid' })

    const { GET } = await import('@/app/api/clients/[id]/invoices/route')
    const res = await GET(
      await makeReq('GET', `/api/clients/${client.id}/invoices?status=paid`),
      { params: Promise.resolve({ id: client.id }) },
    )
    const body = await res.json()
    expect(body.meta.total).toBe(1)
    expect(body.data[0].status).toBe('paid')
  })

  it('applies withComputedStatus', async () => {
    const { db } = testDb
    const client = await seedClient(db, userId)
    await seedInvoice(db, userId, client.id, {
      invoiceNumber: 'INV-0001',
      status: 'sent',
      dueDate: '2020-01-01',
    })

    const { GET } = await import('@/app/api/clients/[id]/invoices/route')
    const res = await GET(
      await makeReq('GET', `/api/clients/${client.id}/invoices`),
      { params: Promise.resolve({ id: client.id }) },
    )
    const body = await res.json()
    expect(body.data[0].status).toBe('overdue')
  })
})
