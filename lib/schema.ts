import {
  sqliteTable, text, integer, real,
  index, uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import type { LineItem } from '@/lib/models'

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    text('created_at').notNull(),
  updatedAt:    text('updated_at').notNull(),
})

// ── Business Profiles ─────────────────────────────────────────────────────────
// Address is flattened to columns (no JSON object).
export const businessProfiles = sqliteTable('business_profiles', {
  id:                      text('id').primaryKey(),
  userId:                  text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  businessName:            text('business_name').notNull(),
  logoUrl:                 text('logo_url'),
  addressLine1:            text('address_line1'),
  addressLine2:            text('address_line2'),
  addressCity:             text('address_city'),
  addressState:            text('address_state'),
  addressPostalCode:       text('address_postal_code'),
  addressCountry:          text('address_country'),
  phone:                   text('phone'),
  email:                   text('email'),
  website:                 text('website'),
  taxId:                   text('tax_id'),
  defaultCurrency:         text('default_currency').notNull().default('USD'),
  defaultPaymentTermsDays: integer('default_payment_terms_days').notNull().default(30),
  defaultTaxRate:          real('default_tax_rate'),
  defaultNotes:            text('default_notes'),
  defaultTerms:            text('default_terms'),
  invoicePrefix:           text('invoice_prefix').notNull().default('INV'),
  nextInvoiceNumber:       integer('next_invoice_number').notNull().default(1),
  createdAt:               text('created_at').notNull(),
  updatedAt:               text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('bp_user_id_idx').on(t.userId),
])

// ── Clients ───────────────────────────────────────────────────────────────────
// Address is flattened to columns (no JSON object).
export const clients = sqliteTable('clients', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name:             text('name').notNull(),
  email:            text('email'),
  phone:            text('phone'),
  company:          text('company'),
  addressLine1:     text('address_line1'),
  addressLine2:     text('address_line2'),
  addressCity:      text('address_city'),
  addressState:     text('address_state'),
  addressPostalCode: text('address_postal_code'),
  addressCountry:   text('address_country'),
  currency:         text('currency').notNull().default('USD'),
  notes:            text('notes'),
  createdAt:        text('created_at').notNull(),
  updatedAt:        text('updated_at').notNull(),
}, (t) => [
  index('clients_user_id_idx').on(t.userId),
])

// ── Invoices ──────────────────────────────────────────────────────────────────
// lineItems stored as JSON TEXT. All money values are integer cents.
export const invoices = sqliteTable('invoices', {
  id:             text('id').primaryKey(),
  userId:         text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  clientId:       text('client_id').notNull()
    .references(() => clients.id),
  invoiceNumber:  text('invoice_number').notNull(),
  status:         text('status').notNull(), // 'draft'|'sent'|'partial'|'paid'|'void'
  issueDate:      text('issue_date').notNull(), // YYYY-MM-DD
  dueDate:        text('due_date').notNull(), // YYYY-MM-DD
  currency:       text('currency').notNull(),
  lineItems:      text('line_items', { mode: 'json' })
    .$type<LineItem[]>().notNull(),
  subtotal:       integer('subtotal').notNull(),
  taxRate:        real('tax_rate'),
  taxAmount:      integer('tax_amount').notNull().default(0),
  discountType:   text('discount_type'), // 'percentage'|'fixed'|null
  discountValue:  real('discount_value').notNull().default(0),
  discountAmount: integer('discount_amount').notNull().default(0),
  total:          integer('total').notNull(),
  amountPaid:     integer('amount_paid').notNull().default(0),
  amountDue:      integer('amount_due').notNull(),
  notes:          text('notes'),
  terms:          text('terms'),
  sentAt:         text('sent_at'),
  paidAt:         text('paid_at'),
  createdAt:      text('created_at').notNull(),
  updatedAt:      text('updated_at').notNull(),
  deletedAt:      text('deleted_at'),
}, (t) => [
  index('invoices_user_id_idx').on(t.userId),
  index('invoices_client_id_idx').on(t.clientId),
  index('invoices_user_status_idx').on(t.userId, t.status),
])

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = sqliteTable('payments', {
  id:        text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  amount:    integer('amount').notNull(),
  method:    text('method').notNull(), // 'cash'|'bank_transfer'|'check'|'credit_card'|'other'
  reference: text('reference'),
  notes:     text('notes'),
  paidAt:    text('paid_at').notNull(), // YYYY-MM-DD
  createdAt: text('created_at').notNull(),
}, (t) => [
  index('payments_invoice_id_idx').on(t.invoiceId),
])

// ── Catalog Items ─────────────────────────────────────────────────────────────
export const catalogItems = sqliteTable('catalog_items', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  unitPrice:   integer('unit_price').notNull(),
  unit:        text('unit'),
  taxable:     integer('taxable', { mode: 'boolean' }).notNull().default(false),
  createdAt:   text('created_at').notNull(),
  updatedAt:   text('updated_at').notNull(),
}, (t) => [
  index('catalog_user_id_idx').on(t.userId),
])

// ── Access Tokens ─────────────────────────────────────────────────────────────
export const accessTokens = sqliteTable('access_tokens', {
  token:     text('token').primaryKey(),
  userId:    text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
})

// ── Refresh Tokens ────────────────────────────────────────────────────────────
export const refreshTokens = sqliteTable('refresh_tokens', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt:    text('used_at'),
  createdAt: text('created_at').notNull(),
})

// ── Reset Tokens ──────────────────────────────────────────────────────────────
export const resetTokens = sqliteTable('reset_tokens', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  rawToken:  text('raw_token').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt:    text('used_at'),
  createdAt: text('created_at').notNull(),
})
