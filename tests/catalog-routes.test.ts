/**
 * tests/catalog-routes.test.ts
 *
 * Feature: F11 — Catalog Routes Migrated to SQLite
 *
 * Covers: GET/POST /api/catalog, PATCH/DELETE /api/catalog/[id]
 *
 * Test runner: vitest
 * Run: npx vitest run tests/catalog-routes.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { eq } from 'drizzle-orm'
import * as schema from '@/lib/schema'
import {
  createTestDb,
  seedUser,
  seedProfile,
  seedCatalogItem,
  seedAccessToken,
  type DrizzleDb,
} from './helpers/db'
import { uuid } from '@/lib/ids'
import { nowIso } from '@/lib/time'

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
  accessToken = 'at_test_catalog_token'
  await seedAccessToken(db, userId, accessToken)
})

afterEach(() => {
  testDb.sqlite.close()
})

// ── GET /api/catalog ──────────────────────────────────────────────────────────

describe('GET /api/catalog', () => {
  it('returns empty list when no catalog items exist', async () => {
    const { GET } = await import('@/app/api/catalog/route')
    const res = await GET(await makeReq('GET', '/api/catalog'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
  })

  it('returns only catalog items for the authenticated user', async () => {
    const { db } = testDb
    await seedCatalogItem(db, userId, { name: 'My Item' })

    const user2 = await seedUser(db, { email: 'other@test.com' })
    await seedProfile(db, user2.id)
    await seedCatalogItem(db, user2.id, { name: 'Their Item' })

    const { GET } = await import('@/app/api/catalog/route')
    const res = await GET(await makeReq('GET', '/api/catalog'))
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('My Item')
  })

  it('returns items ordered by name ASC', async () => {
    const { db } = testDb
    await seedCatalogItem(db, userId, { name: 'Zebra Design' })
    await seedCatalogItem(db, userId, { name: 'Alpha Consulting' })
    await seedCatalogItem(db, userId, { name: 'Mid Photography' })

    const { GET } = await import('@/app/api/catalog/route')
    const res = await GET(await makeReq('GET', '/api/catalog'))
    const body = await res.json()
    expect(body.data[0].name).toBe('Alpha Consulting')
    expect(body.data[1].name).toBe('Mid Photography')
    expect(body.data[2].name).toBe('Zebra Design')
  })

  it('filters by search query on name', async () => {
    const { db } = testDb
    await seedCatalogItem(db, userId, { name: 'Web Design' })
    await seedCatalogItem(db, userId, { name: 'Logo Design' })
    await seedCatalogItem(db, userId, { name: 'Photography' })

    const { GET } = await import('@/app/api/catalog/route')
    const res = await GET(await makeReq('GET', '/api/catalog?search=design'))
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    const names = body.data.map((i: any) => i.name)
    expect(names).toContain('Web Design')
    expect(names).toContain('Logo Design')
  })

  it('filters by search query on description', async () => {
    const { db } = testDb
    await seedCatalogItem(db, userId, { name: 'Item 1', description: 'hourly consulting rate' })
    await seedCatalogItem(db, userId, { name: 'Item 2', description: 'fixed project fee' })

    const { GET } = await import('@/app/api/catalog/route')
    const res = await GET(await makeReq('GET', '/api/catalog?search=consulting'))
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Item 1')
  })

  it('search is case-insensitive', async () => {
    const { db } = testDb
    await seedCatalogItem(db, userId, { name: 'WEB DESIGN' })

    const { GET } = await import('@/app/api/catalog/route')
    const res = await GET(await makeReq('GET', '/api/catalog?search=web design'))
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })

  it('returns 401 for unauthenticated request', async () => {
    const { GET } = await import('@/app/api/catalog/route')
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/catalog')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

// ── POST /api/catalog ─────────────────────────────────────────────────────────

describe('POST /api/catalog', () => {
  it('creates a catalog item and returns 201', async () => {
    const { POST } = await import('@/app/api/catalog/route')
    const res = await POST(await makeReq('POST', '/api/catalog', {
      name: 'Design Work',
      unitPrice: 15000,
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe('Design Work')
    expect(body.data.unitPrice).toBe(15000)
    expect(body.data.userId).toBe(userId)
  })

  it('defaults taxable to false', async () => {
    const { POST } = await import('@/app/api/catalog/route')
    const res = await POST(await makeReq('POST', '/api/catalog', { name: 'Item', unitPrice: 1000 }))
    const body = await res.json()
    expect(body.data.taxable).toBe(false)
  })

  it('stores item in SQLite (not in-memory store)', async () => {
    const { db } = testDb
    const { POST } = await import('@/app/api/catalog/route')
    const res = await POST(await makeReq('POST', '/api/catalog', { name: 'DB Item', unitPrice: 5000 }))
    const id = (await res.json()).data.id

    const rows = await db.select().from(schema.catalogItems).where(eq(schema.catalogItems.id, id))
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('DB Item')
  })

  it('returns 400 CATALOG_LIMIT_EXCEEDED when 500 items exist', async () => {
    const { db } = testDb
    // Seed 500 items directly via SQL for speed
    const now = nowIso()
    const stmt = testDb.sqlite.prepare(
      `INSERT INTO catalog_items (id, user_id, name, unit_price, taxable, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    for (let i = 0; i < 500; i++) {
      stmt.run(uuid(), userId, `Item ${i}`, 1000, 0, now, now)
    }

    const { POST } = await import('@/app/api/catalog/route')
    const res = await POST(await makeReq('POST', '/api/catalog', { name: 'One Too Many', unitPrice: 1000 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('CATALOG_LIMIT_EXCEEDED')
  })

  it('returns 400 VALIDATION_ERROR for empty name', async () => {
    const { POST } = await import('@/app/api/catalog/route')
    const res = await POST(await makeReq('POST', '/api/catalog', { name: '', unitPrice: 1000 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.name).toBeDefined()
  })

  it('returns 400 VALIDATION_ERROR for negative unitPrice', async () => {
    const { POST } = await import('@/app/api/catalog/route')
    const res = await POST(await makeReq('POST', '/api/catalog', { name: 'Item', unitPrice: -1 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 VALIDATION_ERROR for non-integer unitPrice', async () => {
    const { POST } = await import('@/app/api/catalog/route')
    const res = await POST(await makeReq('POST', '/api/catalog', { name: 'Item', unitPrice: 99.99 }))
    expect(res.status).toBe(400)
  })

  it('accepts optional description, unit, and taxable', async () => {
    const { POST } = await import('@/app/api/catalog/route')
    const res = await POST(await makeReq('POST', '/api/catalog', {
      name: 'Consulting',
      unitPrice: 20000,
      description: 'Hourly consulting',
      unit: 'hr',
      taxable: true,
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.description).toBe('Hourly consulting')
    expect(body.data.unit).toBe('hr')
    expect(body.data.taxable).toBe(true)
  })
})

// ── PATCH /api/catalog/[id] ───────────────────────────────────────────────────

describe('PATCH /api/catalog/[id]', () => {
  it('updates catalog item fields', async () => {
    const { db } = testDb
    const item = await seedCatalogItem(db, userId)

    const { PATCH } = await import('@/app/api/catalog/[id]/route')
    const res = await PATCH(
      await makeReq('PATCH', `/api/catalog/${item.id}`, { name: 'Updated Name', unitPrice: 25000 }),
      { params: Promise.resolve({ id: item.id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Updated Name')
    expect(body.data.unitPrice).toBe(25000)
  })

  it('persists changes in SQLite', async () => {
    const { db } = testDb
    const item = await seedCatalogItem(db, userId)

    const { PATCH } = await import('@/app/api/catalog/[id]/route')
    await PATCH(
      await makeReq('PATCH', `/api/catalog/${item.id}`, { name: 'Persisted Name' }),
      { params: Promise.resolve({ id: item.id }) },
    )

    const row = await db.select().from(schema.catalogItems).where(eq(schema.catalogItems.id, item.id)).then((r) => r[0])
    expect(row.name).toBe('Persisted Name')
  })

  it('returns 400 VALIDATION_ERROR for invalid patch', async () => {
    const { db } = testDb
    const item = await seedCatalogItem(db, userId)

    const { PATCH } = await import('@/app/api/catalog/[id]/route')
    const res = await PATCH(
      await makeReq('PATCH', `/api/catalog/${item.id}`, { unitPrice: -100 }),
      { params: Promise.resolve({ id: item.id }) },
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 for item not belonging to user', async () => {
    const { PATCH } = await import('@/app/api/catalog/[id]/route')
    const fakeId = uuid()
    const res = await PATCH(
      await makeReq('PATCH', `/api/catalog/${fakeId}`, { name: 'X' }),
      { params: Promise.resolve({ id: fakeId }) },
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 for item belonging to another user', async () => {
    const { db } = testDb
    const user2 = await seedUser(db, { email: 'other@test.com' })
    await seedProfile(db, user2.id)
    const theirItem = await seedCatalogItem(db, user2.id)

    const { PATCH } = await import('@/app/api/catalog/[id]/route')
    const res = await PATCH(
      await makeReq('PATCH', `/api/catalog/${theirItem.id}`, { name: 'Steal' }),
      { params: Promise.resolve({ id: theirItem.id }) },
    )
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/catalog/[id] ──────────────────────────────────────────────────

describe('DELETE /api/catalog/[id]', () => {
  it('deletes a catalog item', async () => {
    const { db } = testDb
    const item = await seedCatalogItem(db, userId)

    const { DELETE } = await import('@/app/api/catalog/[id]/route')
    const res = await DELETE(
      await makeReq('DELETE', `/api/catalog/${item.id}`),
      { params: Promise.resolve({ id: item.id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const rows = await db.select().from(schema.catalogItems).where(eq(schema.catalogItems.id, item.id))
    expect(rows).toHaveLength(0)
  })

  it('returns 404 for item not belonging to user', async () => {
    const { DELETE } = await import('@/app/api/catalog/[id]/route')
    const fakeId = uuid()
    const res = await DELETE(
      await makeReq('DELETE', `/api/catalog/${fakeId}`),
      { params: Promise.resolve({ id: fakeId }) },
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 for item belonging to another user', async () => {
    const { db } = testDb
    const user2 = await seedUser(db, { email: 'other3@test.com' })
    await seedProfile(db, user2.id)
    const theirItem = await seedCatalogItem(db, user2.id)

    const { DELETE } = await import('@/app/api/catalog/[id]/route')
    const res = await DELETE(
      await makeReq('DELETE', `/api/catalog/${theirItem.id}`),
      { params: Promise.resolve({ id: theirItem.id }) },
    )
    expect(res.status).toBe(404)
  })

  it('allows creating a new item after the limit after deleting one (500 limit is re-checked)', async () => {
    const { db } = testDb
    // Seed exactly 500 items
    const now = nowIso()
    const stmt = testDb.sqlite.prepare(
      `INSERT INTO catalog_items (id, user_id, name, unit_price, taxable, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    const lastId = uuid()
    for (let i = 0; i < 499; i++) {
      stmt.run(uuid(), userId, `Item ${i}`, 1000, 0, now, now)
    }
    stmt.run(lastId, userId, 'Item 499', 1000, 0, now, now)

    // At 500, creating new should fail
    const { POST, GET } = await import('@/app/api/catalog/route')
    const failRes = await POST(await makeReq('POST', '/api/catalog', { name: 'Overflow', unitPrice: 1000 }))
    expect(failRes.status).toBe(400)

    // Delete one
    const { DELETE } = await import('@/app/api/catalog/[id]/route')
    await DELETE(
      await makeReq('DELETE', `/api/catalog/${lastId}`),
      { params: Promise.resolve({ id: lastId }) },
    )

    // Now creating should succeed
    const okRes = await POST(await makeReq('POST', '/api/catalog', { name: 'New Item', unitPrice: 1000 }))
    expect(okRes.status).toBe(201)
  })
})
