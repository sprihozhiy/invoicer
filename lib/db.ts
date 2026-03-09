import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'path'
import * as schema from '@/lib/schema'

export type Db = ReturnType<typeof drizzle<typeof schema>>

export function createDb(sqliteInstance?: InstanceType<typeof Database>): Db {
  const sqlite = sqliteInstance ?? new Database(process.env.DATABASE_URL ?? './invoicer.db')
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') })
  return db
}

declare global {
  // eslint-disable-next-line no-var
  var __invoicer_db__: Db | undefined
}

export const db: Db =
  globalThis.__invoicer_db__ ?? (globalThis.__invoicer_db__ = createDb())
