import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'

import * as schema from '@/lib/schema'
import { sha256 } from '@/lib/ids'
import { nowIso } from '@/lib/time'
import { createTestDb, seedUser } from './helpers/db'

async function loadAuthWithTestDb() {
  const testDb = createTestDb()
  vi.resetModules()
  globalThis.__invoicer_db__ = testDb.db
  const auth = await import('@/lib/auth')
  return { ...testDb, auth }
}

describe('F7 auth DB migration tests', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    delete globalThis.__invoicer_db__
    vi.resetModules()
  })

  it('issueSession inserts access and refresh rows with expected token format and TTL', async () => {
    const { db, sqlite, auth } = await loadAuthWithTestDb()
    try {
      const user = await seedUser(db)
      const nowMs = Date.now()

      const tokens = auth.issueSession(user.id)

      expect(tokens.accessToken.startsWith('at_')).toBe(true)
      expect(tokens.refreshToken.startsWith('rt_')).toBe(true)

      const accessRow = await db.query.accessTokens.findFirst({
        where: eq(schema.accessTokens.token, tokens.accessToken),
      })
      expect(accessRow?.userId).toBe(user.id)
      expect(accessRow).toBeTruthy()
      if (accessRow) {
        const deltaMs = new Date(accessRow.expiresAt).getTime() - nowMs
        expect(deltaMs).toBeGreaterThanOrEqual(14 * 60 * 1000)
        expect(deltaMs).toBeLessThanOrEqual(16 * 60 * 1000)
      }

      const refreshRow = await db.query.refreshTokens.findFirst({
        where: eq(schema.refreshTokens.tokenHash, sha256(tokens.refreshToken)),
      })
      expect(refreshRow?.userId).toBe(user.id)
      expect(refreshRow?.usedAt).toBeNull()
      expect(refreshRow).toBeTruthy()
      if (refreshRow) {
        const deltaMs = new Date(refreshRow.expiresAt).getTime() - nowMs
        expect(deltaMs).toBeGreaterThanOrEqual(6.9 * 24 * 60 * 60 * 1000)
        expect(deltaMs).toBeLessThanOrEqual(7.1 * 24 * 60 * 60 * 1000)
      }
    } finally {
      sqlite.close()
    }
  })

  it('requireAuth reads access token cookie and returns the matching user', async () => {
    const { db, sqlite, auth } = await loadAuthWithTestDb()
    try {
      const user = await seedUser(db)
      const { accessToken } = auth.issueSession(user.id)
      const req = new NextRequest('http://localhost/api/profile', {
        headers: { cookie: `invoicer_access=${accessToken}` },
      })

      const authedUser = auth.requireAuth(req)
      expect(authedUser.id).toBe(user.id)
      expect(authedUser.email).toBe(user.email)
    } finally {
      sqlite.close()
    }
  })

  it('requireAuth rejects missing/invalid access tokens', async () => {
    const { sqlite, auth } = await loadAuthWithTestDb()
    try {
      const noCookieReq = new NextRequest('http://localhost/api/profile')
      expect(() => auth.requireAuth(noCookieReq)).toThrow()

      const badCookieReq = new NextRequest('http://localhost/api/profile', {
        headers: { cookie: 'invoicer_access=at_invalid' },
      })
      expect(() => auth.requireAuth(badCookieReq)).toThrow()
    } finally {
      sqlite.close()
    }
  })

  it('rotateRefreshToken marks current refresh token used and issues a new token pair', async () => {
    const { db, sqlite, auth } = await loadAuthWithTestDb()
    try {
      const user = await seedUser(db)
      const first = auth.issueSession(user.id)

      const rotated = auth.rotateRefreshToken(first.refreshToken)
      expect(rotated.userId).toBe(user.id)
      expect(rotated.tokens.accessToken.startsWith('at_')).toBe(true)
      expect(rotated.tokens.refreshToken.startsWith('rt_')).toBe(true)
      expect(rotated.tokens.refreshToken).not.toBe(first.refreshToken)

      const oldRefreshRow = await db.query.refreshTokens.findFirst({
        where: eq(schema.refreshTokens.tokenHash, sha256(first.refreshToken)),
      })
      expect(oldRefreshRow?.usedAt).toBeTruthy()

      const newAccessRow = await db.query.accessTokens.findFirst({
        where: eq(schema.accessTokens.token, rotated.tokens.accessToken),
      })
      expect(newAccessRow?.userId).toBe(user.id)

      const newRefreshRow = await db.query.refreshTokens.findFirst({
        where: and(
          eq(schema.refreshTokens.userId, user.id),
          eq(schema.refreshTokens.tokenHash, sha256(rotated.tokens.refreshToken)),
        ),
      })
      expect(newRefreshRow?.usedAt).toBeNull()
    } finally {
      sqlite.close()
    }
  })

  it('rotateRefreshToken rejects unknown refresh token', async () => {
    const { sqlite, auth } = await loadAuthWithTestDb()
    try {
      expect(() => auth.rotateRefreshToken('rt_not_real')).toThrow()
    } finally {
      sqlite.close()
    }
  })

  it('rotateRefreshToken rejects a refresh token that has already been used (replay attack)', async () => {
    const { db, sqlite, auth } = await loadAuthWithTestDb()
    try {
      const user = await seedUser(db)
      const first = auth.issueSession(user.id)

      // First rotation succeeds
      auth.rotateRefreshToken(first.refreshToken)

      // Second use of the same token must throw
      expect(() => auth.rotateRefreshToken(first.refreshToken)).toThrow()
    } finally {
      sqlite.close()
    }
  })

  it('invalidateRefreshToken marks the token used so it cannot be rotated again', async () => {
    const { db, sqlite, auth } = await loadAuthWithTestDb()
    try {
      const user = await seedUser(db)
      const { refreshToken } = auth.issueSession(user.id)

      auth.invalidateRefreshToken(refreshToken)

      // Token must now be rejected
      expect(() => auth.rotateRefreshToken(refreshToken)).toThrow()
    } finally {
      sqlite.close()
    }
  })

  it('invalidateRefreshToken is a no-op for undefined input', async () => {
    const { sqlite, auth } = await loadAuthWithTestDb()
    try {
      // Must not throw
      expect(() => auth.invalidateRefreshToken(undefined)).not.toThrow()
    } finally {
      sqlite.close()
    }
  })
})

describe('Auth route review regression tests', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    delete globalThis.__invoicer_db__
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('reset-password accepts a raw token by matching reset_tokens.token_hash', async () => {
    const testDb = createTestDb()
    const { db, sqlite } = testDb
    try {
      const user = await seedUser(db, { passwordHash: 'old_hash' })
      const suppliedRawToken = 'rst_expected_raw_token'
      const now = nowIso()
      await db.insert(schema.resetTokens).values({
        id: 'reset_1',
        userId: user.id,
        tokenHash: sha256(suppliedRawToken),
        rawToken: 'different_raw_value',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        usedAt: null,
        createdAt: now,
      })

      vi.resetModules()
      globalThis.__invoicer_db__ = db
      const { POST } = await import('@/app/api/auth/reset-password/route')

      const req = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: suppliedRawToken, password: 'NewPassword123' }),
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      const tokenRow = await db.query.resetTokens.findFirst({
        where: eq(schema.resetTokens.id, 'reset_1'),
      })
      expect(tokenRow?.usedAt).toBeTruthy()

      const updatedUser = await db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      })
      expect(updatedUser?.passwordHash).not.toBe('old_hash')
    } finally {
      sqlite.close()
    }
  })

  it('register returns 409 EMAIL_TAKEN when email already exists', async () => {
    const testDb = createTestDb()
    const { db, sqlite } = testDb
    try {
      await seedUser(db, { email: 'dupe@example.com' })

      vi.resetModules()
      globalThis.__invoicer_db__ = db
      const { POST } = await import('@/app/api/auth/register/route')
      const req = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane',
          email: 'dupe@example.com',
          password: 'Password123',
        }),
      })

      const response = await POST(req)
      expect(response.status).toBe(409)
      const json = await response.json()
      expect(json.error?.code).toBe('EMAIL_TAKEN')
    } finally {
      sqlite.close()
    }
  })

  it('login runs scrypt once even when user does not exist (timing-oracle hardening)', async () => {
    const testDb = createTestDb()
    const { db, sqlite } = testDb
    try {
      vi.resetModules()
      globalThis.__invoicer_db__ = db

      const crypto = await import('node:crypto')
      const scryptSpy = vi.spyOn(crypto.default, 'scryptSync')
      const { POST } = await import('@/app/api/auth/login/route')

      const req = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'missing@example.com',
          password: 'Password123',
        }),
      })

      const response = await POST(req)
      expect(response.status).toBe(401)
      expect(scryptSpy).toHaveBeenCalledTimes(1)
    } finally {
      sqlite.close()
    }
  })
})
