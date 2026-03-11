import { describe, it, expect } from 'vitest'

describe('drizzle config (F2)', () => {
  it('exports required sqlite config values', async () => {
    const mod = await import('../drizzle.config')
    const config = mod.default

    expect(config.dialect).toBe('sqlite')
    expect(config.schema).toBe('./lib/schema.ts')
    expect(config.out).toBe('./drizzle')
    expect(config.dbCredentials?.url).toBe(process.env.DATABASE_URL ?? './invoicer.db')
  })
})

describe('db singleton contract (F4)', () => {
  it('exports createDb factory, syncDb helper, and db singleton', async () => {
    const mod = await import('@/lib/db')

    expect(typeof mod.createDb).toBe('function')
    expect(typeof mod.syncDb).toBe('function')
    expect(mod.db).toBeDefined()
  })
})
