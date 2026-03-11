import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'

import * as schema from '@/lib/schema'
import { sha256 } from '@/lib/ids'
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
})
