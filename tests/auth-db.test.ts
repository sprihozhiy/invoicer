/**
 * tests/auth-db.test.ts
 *
 * Feature: F7 — Auth Routes Migrated to SQLite
 *
 * Verifies that lib/auth.ts (issueSession, requireAuth, rotateRefreshToken)
 * reads/writes SQLite tables instead of the in-memory store, and that all six
 * auth API routes function correctly with the new DB backend.
 *
 * Tests operate on the lib/auth.ts functions directly — not via HTTP.
 * Route-level tests mock NextRequest where needed.
 *
 * Test runner: vitest
 * Run: npx vitest run tests/auth-db.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { eq, and, gt, isNull } from 'drizzle-orm'
import * as schema from '@/lib/schema'
import { sha256 } from '@/lib/ids'
import { nowIso } from '@/lib/time'
import {
  createTestDb,
  seedUser,
  seedProfile,
  seedRefreshToken,
  type DrizzleDb,
} from './helpers/db'

// ── Setup ─────────────────────────────────────────────────────────────────────

let testDb: { db: DrizzleDb; sqlite: any }

beforeEach(() => {
  testDb = createTestDb()
})

afterEach(() => {
  testDb.sqlite.close()
})

// ── issueSession ──────────────────────────────────────────────────────────────

describe('issueSession(userId)', () => {
  it('inserts a row into access_tokens for the user', async () => {
    const { db } = testDb
    const user = await seedUser(db)

    // Import issueSession and inject db (or mock the db import)
    // Since lib/auth.ts imports db from lib/db.ts, we need to either:
    //   1. Use dependency injection (preferred for testability), or
    //   2. Mock the module via vi.mock
    // This stub shows the test intent; implementation team decides the DI approach.
    const { issueSession } = await import('@/lib/auth')

    const { accessToken, refreshToken } = await issueSession(user.id)

    expect(accessToken).toMatch(/^at_/)
    expect(refreshToken).toMatch(/^rt_/)

    const atRows = await db.select()
      .from(schema.accessTokens)
      .where(eq(schema.accessTokens.token, accessToken))
    expect(atRows).toHaveLength(1)
    expect(atRows[0].userId).toBe(user.id)
  })

  it('inserts a hashed row into refresh_tokens (not the raw token)', async () => {
    const { db } = testDb
    const user = await seedUser(db)
    const { issueSession } = await import('@/lib/auth')

    const { refreshToken } = await issueSession(user.id)
    const hash = sha256(refreshToken)

    const rtRows = await db.select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, hash))
    expect(rtRows).toHaveLength(1)
    expect(rtRows[0].userId).toBe(user.id)
    expect(rtRows[0].usedAt).toBeNull()
  })

  it('access token expires in ~15 minutes', async () => {
    const { db } = testDb
    const user = await seedUser(db)
    const { issueSession } = await import('@/lib/auth')

    const { accessToken } = await issueSession(user.id)
    const row = await db.select()
      .from(schema.accessTokens)
      .where(eq(schema.accessTokens.token, accessToken))
      .then((r) => r[0])

    const expiresAt = new Date(row.expiresAt).getTime()
    const now = Date.now()
    const diff = expiresAt - now
    // Should be between 14 and 16 minutes
    expect(diff).toBeGreaterThan(14 * 60 * 1000)
    expect(diff).toBeLessThan(16 * 60 * 1000)
  })

  it('refresh token expires in ~7 days', async () => {
    const { db } = testDb
    const user = await seedUser(db)
    const { issueSession } = await import('@/lib/auth')

    const { refreshToken } = await issueSession(user.id)
    const hash = sha256(refreshToken)
    const row = await db.select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, hash))
      .then((r) => r[0])

    const expiresAt = new Date(row.expiresAt).getTime()
    const diff = expiresAt - Date.now()
    expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000)
    expect(diff).toBeLessThan(8 * 24 * 60 * 60 * 1000)
  })
})

// ── requireAuth ───────────────────────────────────────────────────────────────

describe('requireAuth(req)', () => {
  it('returns { userId } for a valid, unexpired access token', async () => {
    const { db } = testDb
    const user = await seedUser(db)
    const { issueSession, requireAuth } = await import('@/lib/auth')
    const { accessToken } = await issueSession(user.id)

    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Cookie: `invoicer_access=${accessToken}` },
    })

    const result = await requireAuth(req)
    expect(result.userId).toBe(user.id)
  })

  it('throws 401 when invoicer_access cookie is missing', async () => {
    const { requireAuth } = await import('@/lib/auth')
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/test')

    await expect(requireAuth(req)).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 when access token does not exist in DB', async () => {
    const { requireAuth } = await import('@/lib/auth')
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Cookie: 'invoicer_access=at_nonexistent_token' },
    })

    await expect(requireAuth(req)).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 when access token is expired', async () => {
    const { db } = testDb
    const user = await seedUser(db)

    // Insert expired access token directly
    const expiredToken = 'at_expired_token'
    await db.insert(schema.accessTokens).values({
      token:     expiredToken,
      userId:    user.id,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second in the past
    })

    const { requireAuth } = await import('@/lib/auth')
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Cookie: `invoicer_access=${expiredToken}` },
    })

    await expect(requireAuth(req)).rejects.toMatchObject({ status: 401 })
  })
})

// ── rotateRefreshToken ────────────────────────────────────────────────────────

describe('rotateRefreshToken(rawToken)', () => {
  it('marks the old refresh token as used', async () => {
    const { db } = testDb
    const user = await seedUser(db)
    const { issueSession, rotateRefreshToken } = await import('@/lib/auth')

    const { refreshToken } = await issueSession(user.id)
    await rotateRefreshToken(refreshToken)

    const hash = sha256(refreshToken)
    const oldRow = await db.select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, hash))
      .then((r) => r[0])

    expect(oldRow.usedAt).not.toBeNull()
  })

  it('issues a new access token and refresh token', async () => {
    const { db } = testDb
    const user = await seedUser(db)
    const { issueSession, rotateRefreshToken } = await import('@/lib/auth')

    const { refreshToken: oldToken } = await issueSession(user.id)
    const { accessToken: newAt, refreshToken: newRt } = await rotateRefreshToken(oldToken)

    expect(newAt).toMatch(/^at_/)
    expect(newRt).toMatch(/^rt_/)
    expect(newRt).not.toBe(oldToken)
  })

  it('throws 401 if the refresh token does not exist', async () => {
    const { rotateRefreshToken } = await import('@/lib/auth')
    await expect(rotateRefreshToken('rt_nonexistent')).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 if the refresh token is already used', async () => {
    const { db } = testDb
    const user = await seedUser(db)
    const { issueSession, rotateRefreshToken } = await import('@/lib/auth')

    const { refreshToken } = await issueSession(user.id)
    await rotateRefreshToken(refreshToken) // first rotation succeeds
    await expect(rotateRefreshToken(refreshToken)).rejects.toMatchObject({ status: 401 }) // second fails
  })

  it('throws 401 if the refresh token is expired', async () => {
    const { db } = testDb
    const user = await seedUser(db)
    const expiredRaw = 'rt_expired_token'
    const expiredHash = sha256(expiredRaw)

    await db.insert(schema.refreshTokens).values({
      id:        'rt_test_id',
      userId:    user.id,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      usedAt:    null,
      createdAt: nowIso(),
    })

    const { rotateRefreshToken } = await import('@/lib/auth')
    await expect(rotateRefreshToken(expiredRaw)).rejects.toMatchObject({ status: 401 })
  })
})

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('inserts user row into users table', async () => {
    const { db } = testDb
    const { POST } = await import('@/app/api/auth/register/route')
    const { NextRequest } = await import('next/server')

    const body = { name: 'Alice', email: 'alice@test.com', password: 'password123' }
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const users = await db.select().from(schema.users).where(eq(schema.users.email, 'alice@test.com'))
    expect(users).toHaveLength(1)
    expect(users[0].name).toBe('Alice')
  })

  it('creates a default business_profile for the new user', async () => {
    const { db } = testDb
    const { POST } = await import('@/app/api/auth/register/route')
    const { NextRequest } = await import('next/server')

    const body = { name: 'Bob', email: 'bob@test.com', password: 'password123' }
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const data = await res.json()

    const profiles = await db.select()
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.userId, data.data.id))
    expect(profiles).toHaveLength(1)
    expect(profiles[0].invoicePrefix).toBe('INV')
    expect(profiles[0].nextInvoiceNumber).toBe(1)
  })

  it('returns 409 EMAIL_TAKEN if email already exists', async () => {
    const { db } = testDb
    await seedUser(db, { email: 'taken@test.com' })

    const { POST } = await import('@/app/api/auth/register/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', email: 'taken@test.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('EMAIL_TAKEN')
  })

  it('returns 400 VALIDATION_ERROR for short password', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', email: 'x@test.com', password: 'short' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.password).toBeDefined()
  })

  it('sets invoicer_access and invoicer_refresh cookies on success', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Carol', email: 'carol@test.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const cookies = res.headers.get('Set-Cookie') ?? ''
    expect(cookies).toContain('invoicer_access')
    expect(cookies).toContain('invoicer_refresh')
  })
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 and sets cookies for valid credentials', async () => {
    const { db } = testDb
    // Register a user first
    const { POST: registerPost } = await import('@/app/api/auth/register/route')
    const { POST: loginPost } = await import('@/app/api/auth/login/route')
    const { NextRequest } = await import('next/server')

    await registerPost(new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dave', email: 'dave@test.com', password: 'mypassword1' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    const res = await loginPost(new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'dave@test.com', password: 'mypassword1' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    expect(res.status).toBe(200)
    const cookies = res.headers.get('Set-Cookie') ?? ''
    expect(cookies).toContain('invoicer_access')
  })

  it('returns 401 INVALID_CREDENTIALS for wrong password', async () => {
    const { db } = testDb
    await seedUser(db, { email: 'eve@test.com' })

    const { POST } = await import('@/app/api/auth/login/route')
    const { NextRequest } = await import('next/server')

    const res = await POST(new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'eve@test.com', password: 'wrongpassword' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 INVALID_CREDENTIALS for non-existent email', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const { NextRequest } = await import('next/server')

    const res = await POST(new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ghost@test.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid email format', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const { NextRequest } = await import('next/server')

    const res = await POST(new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-email', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('deletes the access and refresh token rows', async () => {
    const { db } = testDb
    const user = await seedUser(db)
    const { issueSession } = await import('@/lib/auth')
    const { POST } = await import('@/app/api/auth/logout/route')
    const { NextRequest } = await import('next/server')

    const { accessToken, refreshToken } = await issueSession(user.id)

    const req = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: `invoicer_access=${accessToken}; invoicer_refresh=${refreshToken}` },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const atRows = await db.select().from(schema.accessTokens).where(eq(schema.accessTokens.token, accessToken))
    expect(atRows).toHaveLength(0)
  })

  it('clears cookies even if tokens not found (idempotent logout)', async () => {
    const { POST } = await import('@/app/api/auth/logout/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: 'invoicer_access=at_ghost; invoicer_refresh=rt_ghost' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    // Cookies should be cleared (expired)
    const cookies = res.headers.get('Set-Cookie') ?? ''
    expect(cookies).toContain('invoicer_access')
  })
})

// ── POST /api/auth/forgot-password ────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('inserts a reset_tokens row when email is found', async () => {
    const { db } = testDb
    const user = await seedUser(db, { email: 'frank@test.com' })
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'frank@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const tokens = await db.select().from(schema.resetTokens).where(eq(schema.resetTokens.userId, user.id))
    expect(tokens).toHaveLength(1)
    expect(tokens[0].usedAt).toBeNull()
    expect(tokens[0].rawToken).toMatch(/^rst_/)
  })

  it('returns { success: true } even for non-existent email (prevents enumeration)', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'ghost@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ── POST /api/auth/reset-password ────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  it('updates user passwordHash and marks reset token used', async () => {
    const { db } = testDb
    const user = await seedUser(db, { email: 'grace@test.com', passwordHash: 'oldhash' })
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const { POST: resetPost } = await import('@/app/api/auth/reset-password/route')
    const { NextRequest } = await import('next/server')

    // Trigger token creation
    await POST(new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'grace@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    const tokenRow = await db.select().from(schema.resetTokens).where(eq(schema.resetTokens.userId, user.id)).then((r) => r[0])
    const rawToken = tokenRow.rawToken

    const res = await resetPost(new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: rawToken, password: 'newpassword123' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    expect(res.status).toBe(200)

    // Token should be marked used
    const used = await db.select().from(schema.resetTokens).where(eq(schema.resetTokens.id, tokenRow.id)).then((r) => r[0])
    expect(used.usedAt).not.toBeNull()

    // Password should have changed
    const updatedUser = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).then((r) => r[0])
    expect(updatedUser.passwordHash).not.toBe('oldhash')
  })

  it('returns 400 INVALID_TOKEN for non-existent token', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const { NextRequest } = await import('next/server')

    const res = await POST(new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'rst_nonexistent', password: 'newpassword123' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_TOKEN')
  })

  it('returns 400 INVALID_TOKEN if token already used', async () => {
    const { db } = testDb
    const user = await seedUser(db, { email: 'henry@test.com' })
    const { POST: fpPost } = await import('@/app/api/auth/forgot-password/route')
    const { POST: resetPost } = await import('@/app/api/auth/reset-password/route')
    const { NextRequest } = await import('next/server')

    await fpPost(new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST', body: JSON.stringify({ email: 'henry@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    const tokenRow = await db.select().from(schema.resetTokens).where(eq(schema.resetTokens.userId, user.id)).then((r) => r[0])

    // Use it once
    await resetPost(new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: tokenRow.rawToken, password: 'newpassword1' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    // Try to use it again
    const res = await resetPost(new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: tokenRow.rawToken, password: 'anotherpassword' }),
      headers: { 'Content-Type': 'application/json' },
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_TOKEN')
  })
})
