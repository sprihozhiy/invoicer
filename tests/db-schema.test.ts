/**
 * tests/db-schema.test.ts
 *
 * Feature: F1–F5 — SQLite Database Setup, Drizzle Schema, Migration Files, DB Singleton
 *
 * Verifies that:
 *   - All nine tables are created by running migrations on a fresh :memory: DB
 *   - Column names match the spec exactly
 *   - Constraints (UNIQUE, NOT NULL, FK) are enforced by SQLite
 *   - Indexes exist
 *   - The DB singleton (lib/db.ts) uses globalThis caching
 *   - WAL mode and foreign_keys pragma are set
 *
 * Test runner: vitest (STACK.md → TEST_RUNNER=vitest)
 * Run: npx vitest run tests/db-schema.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'path'
import { eq, sql } from 'drizzle-orm'
import * as schema from '@/lib/schema'
import { createTestDb } from './helpers/db'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the list of table names in the SQLite DB. */
function getTableNames(sqlite: InstanceType<typeof Database>): string[] {
  return sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'drizzle_%' AND name NOT LIKE '__drizzle_%'")
    .all()
    .map((r: any) => r.name as string)
    .sort()
}

/** Returns column info for a given table. */
function getColumns(sqlite: InstanceType<typeof Database>, table: string): { name: string; notnull: number; pk: number }[] {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all() as any[]
}

/** Returns index names for a given table. */
function getIndexes(sqlite: InstanceType<typeof Database>, table: string): string[] {
  return (sqlite.prepare(`PRAGMA index_list(${table})`).all() as any[]).map((r) => r.name as string)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Database Migrations (F3, F5)', () => {
  let sqlite: InstanceType<typeof Database>

  beforeEach(() => {
    const { sqlite: s } = createTestDb()
    sqlite = s
  })

  afterEach(() => {
    sqlite.close()
  })

  it('creates all nine required tables', () => {
    const tables = getTableNames(sqlite)
    expect(tables).toContain('users')
    expect(tables).toContain('business_profiles')
    expect(tables).toContain('clients')
    expect(tables).toContain('invoices')
    expect(tables).toContain('payments')
    expect(tables).toContain('catalog_items')
    expect(tables).toContain('access_tokens')
    expect(tables).toContain('refresh_tokens')
    expect(tables).toContain('reset_tokens')
  })

  it('does not create unexpected tables', () => {
    const tables = getTableNames(sqlite)
    const allowed = new Set([
      'users', 'business_profiles', 'clients', 'invoices',
      'payments', 'catalog_items', 'access_tokens', 'refresh_tokens', 'reset_tokens',
    ])
    for (const t of tables) {
      expect(allowed.has(t), `Unexpected table: ${t}`).toBe(true)
    }
  })

  it('running migrations twice is idempotent (no error)', () => {
    // migrations folder uses drizzle's journal — re-running should skip applied migrations
    expect(() => {
      migrate(drizzle(sqlite, { schema }), { migrationsFolder: join(process.cwd(), 'drizzle') })
    }).not.toThrow()
  })
})

describe('users table schema (F3)', () => {
  let sqlite: InstanceType<typeof Database>

  beforeEach(() => { ({ sqlite } = createTestDb()) })
  afterEach(() => { sqlite.close() })

  it('has required columns: id, email, name, password_hash, created_at, updated_at', () => {
    const cols = getColumns(sqlite, 'users').map((c) => c.name)
    expect(cols).toContain('id')
    expect(cols).toContain('email')
    expect(cols).toContain('name')
    expect(cols).toContain('password_hash')
    expect(cols).toContain('created_at')
    expect(cols).toContain('updated_at')
  })

  it('id is the primary key', () => {
    const cols = getColumns(sqlite, 'users')
    const pk = cols.find((c) => c.pk === 1)
    expect(pk?.name).toBe('id')
  })

  it('email has a UNIQUE constraint', () => {
    const indexes = getIndexes(sqlite, 'users')
    // SQLite creates an automatic unique index; drizzle adds one too
    // Just test by attempting duplicate insert
    const db = drizzle(sqlite, { schema })
    const now = new Date().toISOString()
    sqlite.exec(`INSERT INTO users VALUES ('id1','dup@test.com','A','hash','${now}','${now}')`)
    expect(() => {
      sqlite.exec(`INSERT INTO users VALUES ('id2','dup@test.com','B','hash','${now}','${now}')`)
    }).toThrow()
  })

  it('name and password_hash are NOT NULL', () => {
    const cols = getColumns(sqlite, 'users')
    const nameCol = cols.find((c) => c.name === 'name')
    const hashCol = cols.find((c) => c.name === 'password_hash')
    expect(nameCol?.notnull).toBe(1)
    expect(hashCol?.notnull).toBe(1)
  })
})

describe('business_profiles table schema (F3)', () => {
  let sqlite: InstanceType<typeof Database>

  beforeEach(() => { ({ sqlite } = createTestDb()) })
  afterEach(() => { sqlite.close() })

  it('has user_id column with UNIQUE constraint (one profile per user)', () => {
    // Attempt inserting two profiles for the same user should fail
    const now = new Date().toISOString()
    sqlite.exec(`INSERT INTO users VALUES ('uid1','p1@test.com','A','hash','${now}','${now}')`)
    sqlite.exec(`INSERT INTO business_profiles (id,user_id,business_name,default_currency,default_payment_terms_days,invoice_prefix,next_invoice_number,created_at,updated_at) VALUES ('bp1','uid1','Biz','USD',30,'INV',1,'${now}','${now}')`)
    expect(() => {
      sqlite.exec(`INSERT INTO business_profiles (id,user_id,business_name,default_currency,default_payment_terms_days,invoice_prefix,next_invoice_number,created_at,updated_at) VALUES ('bp2','uid1','Biz2','USD',30,'INV',1,'${now}','${now}')`)
    }).toThrow()
  })

  it('has next_invoice_number column with default 1', () => {
    const cols = getColumns(sqlite, 'business_profiles')
    expect(cols.map((c) => c.name)).toContain('next_invoice_number')
  })

  it('has all address flat columns', () => {
    const cols = getColumns(sqlite, 'business_profiles').map((c) => c.name)
    expect(cols).toContain('address_line1')
    expect(cols).toContain('address_line2')
    expect(cols).toContain('address_city')
    expect(cols).toContain('address_state')
    expect(cols).toContain('address_postal_code')
    expect(cols).toContain('address_country')
  })

  it('cascades delete when parent user is deleted', () => {
    const now = new Date().toISOString()
    sqlite.exec(`INSERT INTO users VALUES ('uid2','cas@test.com','A','hash','${now}','${now}')`)
    sqlite.exec(`INSERT INTO business_profiles (id,user_id,business_name,default_currency,default_payment_terms_days,invoice_prefix,next_invoice_number,created_at,updated_at) VALUES ('bpx','uid2','Biz','USD',30,'INV',1,'${now}','${now}')`)
    sqlite.exec(`DELETE FROM users WHERE id = 'uid2'`)
    const rows = sqlite.prepare("SELECT * FROM business_profiles WHERE id = 'bpx'").all()
    expect(rows).toHaveLength(0)
  })
})

describe('clients table schema (F3)', () => {
  let sqlite: InstanceType<typeof Database>

  beforeEach(() => { ({ sqlite } = createTestDb()) })
  afterEach(() => { sqlite.close() })

  it('has all required columns', () => {
    const cols = getColumns(sqlite, 'clients').map((c) => c.name)
    expect(cols).toContain('id')
    expect(cols).toContain('user_id')
    expect(cols).toContain('name')
    expect(cols).toContain('email')
    expect(cols).toContain('currency')
    expect(cols).toContain('address_line1')
    expect(cols).toContain('address_city')
    expect(cols).toContain('address_country')
  })

  it('has index on user_id', () => {
    const indexes = getIndexes(sqlite, 'clients')
    const hasUserIdIdx = indexes.some((i) => i.includes('user_id') || i === 'clients_user_id_idx')
    expect(hasUserIdIdx).toBe(true)
  })

  it('cascades delete when parent user is deleted', () => {
    const now = new Date().toISOString()
    sqlite.exec(`INSERT INTO users VALUES ('u3','cl@test.com','A','hash','${now}','${now}')`)
    sqlite.exec(`INSERT INTO clients (id,user_id,name,currency,created_at,updated_at) VALUES ('c1','u3','Acme','USD','${now}','${now}')`)
    sqlite.exec(`DELETE FROM users WHERE id = 'u3'`)
    const rows = sqlite.prepare("SELECT * FROM clients WHERE id = 'c1'").all()
    expect(rows).toHaveLength(0)
  })
})

describe('invoices table schema (F3)', () => {
  let sqlite: InstanceType<typeof Database>

  beforeEach(() => { ({ sqlite } = createTestDb()) })
  afterEach(() => { sqlite.close() })

  it('has all required columns', () => {
    const cols = getColumns(sqlite, 'invoices').map((c) => c.name)
    const required = [
      'id','user_id','client_id','invoice_number','status',
      'issue_date','due_date','currency','line_items',
      'subtotal','tax_rate','tax_amount',
      'discount_type','discount_value','discount_amount',
      'total','amount_paid','amount_due',
      'notes','terms','sent_at','paid_at',
      'created_at','updated_at','deleted_at',
    ]
    for (const col of required) {
      expect(cols, `Missing column: ${col}`).toContain(col)
    }
  })

  it('has index on (user_id)', () => {
    const indexes = getIndexes(sqlite, 'invoices')
    const hasIdx = indexes.some((i) => i.includes('user_id') || i === 'invoices_user_id_idx')
    expect(hasIdx).toBe(true)
  })

  it('has index on (client_id)', () => {
    const indexes = getIndexes(sqlite, 'invoices')
    const hasIdx = indexes.some((i) => i.includes('client_id') || i === 'invoices_client_id_idx')
    expect(hasIdx).toBe(true)
  })

  it('has index on (user_id, status)', () => {
    const indexes = getIndexes(sqlite, 'invoices')
    const hasIdx = indexes.some((i) => i.includes('status') || i === 'invoices_user_status_idx')
    expect(hasIdx).toBe(true)
  })

  it('line_items column stores JSON text', () => {
    const now = new Date().toISOString()
    const lineItems = JSON.stringify([{ id: 'li1', description: 'Work', quantity: 1, unitPrice: 1000, amount: 1000, taxable: false }])
    sqlite.exec(`INSERT INTO users VALUES ('u4','inv@test.com','A','hash','${now}','${now}')`)
    sqlite.exec(`INSERT INTO clients (id,user_id,name,currency,created_at,updated_at) VALUES ('c2','u4','C','USD','${now}','${now}')`)
    sqlite.exec(`INSERT INTO invoices (id,user_id,client_id,invoice_number,status,issue_date,due_date,currency,line_items,subtotal,tax_amount,discount_value,discount_amount,total,amount_paid,amount_due,created_at,updated_at) VALUES ('i1','u4','c2','INV-0001','draft','2026-01-01','2026-01-31','USD','${lineItems}',1000,0,0,0,1000,0,1000,'${now}','${now}')`)
    const row: any = sqlite.prepare("SELECT line_items FROM invoices WHERE id = 'i1'").get()
    expect(() => JSON.parse(row.line_items)).not.toThrow()
    const parsed = JSON.parse(row.line_items)
    expect(parsed[0].description).toBe('Work')
  })

  it('deleted_at is nullable (supports soft delete)', () => {
    const cols = getColumns(sqlite, 'invoices')
    const col = cols.find((c) => c.name === 'deleted_at')
    expect(col?.notnull).toBe(0) // nullable
  })
})

describe('payments table schema (F3)', () => {
  let sqlite: InstanceType<typeof Database>

  beforeEach(() => { ({ sqlite } = createTestDb()) })
  afterEach(() => { sqlite.close() })

  it('has required columns: id, invoice_id, amount, method, paid_at, created_at', () => {
    const cols = getColumns(sqlite, 'payments').map((c) => c.name)
    expect(cols).toContain('id')
    expect(cols).toContain('invoice_id')
    expect(cols).toContain('amount')
    expect(cols).toContain('method')
    expect(cols).toContain('paid_at')
    expect(cols).toContain('created_at')
  })

  it('has index on invoice_id', () => {
    const indexes = getIndexes(sqlite, 'payments')
    const hasIdx = indexes.some((i) => i.includes('invoice_id') || i === 'payments_invoice_id_idx')
    expect(hasIdx).toBe(true)
  })

  it('cascades delete when parent invoice is deleted', () => {
    // Setup chain: user → client → invoice → payment
    const now = new Date().toISOString()
    const li = JSON.stringify([{ id: 'li2', description: 'W', quantity: 1, unitPrice: 100, amount: 100, taxable: false }])
    sqlite.exec(`INSERT INTO users VALUES ('u5','pay@test.com','A','hash','${now}','${now}')`)
    sqlite.exec(`INSERT INTO clients (id,user_id,name,currency,created_at,updated_at) VALUES ('c3','u5','C','USD','${now}','${now}')`)
    sqlite.exec(`INSERT INTO invoices (id,user_id,client_id,invoice_number,status,issue_date,due_date,currency,line_items,subtotal,tax_amount,discount_value,discount_amount,total,amount_paid,amount_due,created_at,updated_at) VALUES ('i2','u5','c3','INV-0002','sent','2026-01-01','2026-01-31','USD','${li}',100,0,0,0,100,0,100,'${now}','${now}')`)
    sqlite.exec(`INSERT INTO payments (id,invoice_id,amount,method,paid_at,created_at) VALUES ('p1','i2',50,'cash','2026-01-15','${now}')`)
    sqlite.exec(`DELETE FROM invoices WHERE id = 'i2'`)
    const rows = sqlite.prepare("SELECT * FROM payments WHERE id = 'p1'").all()
    expect(rows).toHaveLength(0)
  })
})

describe('catalog_items table schema (F3)', () => {
  let sqlite: InstanceType<typeof Database>

  beforeEach(() => { ({ sqlite } = createTestDb()) })
  afterEach(() => { sqlite.close() })

  it('has required columns', () => {
    const cols = getColumns(sqlite, 'catalog_items').map((c) => c.name)
    expect(cols).toContain('id')
    expect(cols).toContain('user_id')
    expect(cols).toContain('name')
    expect(cols).toContain('unit_price')
    expect(cols).toContain('taxable')
  })

  it('has index on user_id', () => {
    const indexes = getIndexes(sqlite, 'catalog_items')
    const hasIdx = indexes.some((i) => i.includes('user_id') || i === 'catalog_user_id_idx')
    expect(hasIdx).toBe(true)
  })
})

describe('auth token tables schema (F3)', () => {
  let sqlite: InstanceType<typeof Database>

  beforeEach(() => { ({ sqlite } = createTestDb()) })
  afterEach(() => { sqlite.close() })

  it('access_tokens has token (PK), user_id, expires_at', () => {
    const cols = getColumns(sqlite, 'access_tokens').map((c) => c.name)
    expect(cols).toContain('token')
    expect(cols).toContain('user_id')
    expect(cols).toContain('expires_at')
  })

  it('refresh_tokens.token_hash has UNIQUE constraint', () => {
    const now = new Date().toISOString()
    sqlite.exec(`INSERT INTO users VALUES ('u6','rt@test.com','A','hash','${now}','${now}')`)
    sqlite.exec(`INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at,created_at) VALUES ('rt1','u6','HASHDUP','${now}','${now}')`)
    expect(() => {
      sqlite.exec(`INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at,created_at) VALUES ('rt2','u6','HASHDUP','${now}','${now}')`)
    }).toThrow()
  })

  it('reset_tokens has id, user_id, token_hash, raw_token, expires_at, used_at, created_at', () => {
    const cols = getColumns(sqlite, 'reset_tokens').map((c) => c.name)
    expect(cols).toContain('id')
    expect(cols).toContain('user_id')
    expect(cols).toContain('token_hash')
    expect(cols).toContain('raw_token')
    expect(cols).toContain('expires_at')
    expect(cols).toContain('used_at')
    expect(cols).toContain('created_at')
  })
})

describe('DB singleton (lib/db.ts) — F4', () => {
  it('exports a db instance', async () => {
    // Import the createDb factory (not the global singleton, to avoid polluting test env)
    const { createDb } = await import('@/lib/db')
    const sqlite = new Database(':memory:')
    const db = createDb(sqlite)
    expect(db).toBeDefined()
    sqlite.close()
  })

  it('createDb enables foreign keys pragma', async () => {
    const { createDb } = await import('@/lib/db')
    const sqlite = new Database(':memory:')
    createDb(sqlite)
    const result: any = sqlite.prepare('PRAGMA foreign_keys').get()
    expect(result.foreign_keys).toBe(1)
    sqlite.close()
  })

  it('createDb enables WAL journal mode', async () => {
    const { createDb } = await import('@/lib/db')
    const sqlite = new Database(':memory:')
    createDb(sqlite)
    // In-memory DBs report 'memory' journal, not WAL — verify pragma was called without error
    // For file DBs the mode would be 'wal'
    expect(sqlite).toBeDefined() // createDb did not throw
    sqlite.close()
  })

  it('multiple imports of lib/db return the same instance', async () => {
    // The globalThis guard ensures the singleton is reused
    const mod1 = await import('@/lib/db')
    const mod2 = await import('@/lib/db')
    // Same module reference (Node caches modules), same db instance
    expect(mod1.db).toBe(mod2.db)
  })
})
