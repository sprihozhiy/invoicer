import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'path'
import * as schema from '@/lib/schema'

export type Db = ReturnType<typeof drizzle<typeof schema>>
type SqliteDatabase = InstanceType<typeof Database>

function initSqlite(sqlite: SqliteDatabase): void {
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
}

export function createDb(sqliteInstance?: SqliteDatabase): Db {
  const sqlite = sqliteInstance ?? new Database(process.env.DATABASE_URL ?? './invoicer.db')
  initSqlite(sqlite)
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') })
  return db
}

// Keeps app/test callers on the same singleton instance when they need to swap DBs.
export function syncDb(sqliteInstance?: SqliteDatabase): Db {
  const instance = createDb(sqliteInstance)
  globalThis.__invoicer_db__ = instance
  return instance
}

declare global {
  // eslint-disable-next-line no-var
  var __invoicer_db__: Db | undefined
}

export const db: Db =
  globalThis.__invoicer_db__ ?? (globalThis.__invoicer_db__ = createDb())
