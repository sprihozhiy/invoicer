/**
 * tests/zod-validators.test.ts
 *
 * Feature: F6 — Zod Validation Layer (lib/validators.ts)
 *
 * Verifies that every Zod schema:
 *   - Accepts valid input without errors
 *   - Rejects invalid input with descriptive fieldErrors
 *   - Applies transforms (trim, toLowerCase, toUpperCase)
 *   - Enforces all constraints documented in integration-spec.md §Zod Schemas
 *
 * Also verifies the parseBody() helper added to lib/api.ts.
 *
 * Test runner: vitest (STACK.md → TEST_RUNNER=vitest)
 * Run: npx vitest run tests/zod-validators.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ProfilePatchSchema,
  ClientCreateSchema,
  ClientPatchSchema,
  InvoiceCreateSchema,
  InvoicePatchSchema,
  InvoiceSendSchema,
  PaymentCreateSchema,
  CatalogCreateSchema,
  CatalogPatchSchema,
} from '@/lib/validators'

// ── Helper ────────────────────────────────────────────────────────────────────

function expectValid<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, input: unknown): T {
  const result = schema.safeParse(input)
  expect(result.success, `Expected valid but got error for: ${JSON.stringify(input)}`).toBe(true)
  return result.data as T
}

function expectInvalid(schema: { safeParse: (v: unknown) => { success: boolean; error?: { flatten: () => { fieldErrors: Record<string, string[]> } } } }, input: unknown, field?: string): void {
  const result = schema.safeParse(input)
  expect(result.success, `Expected invalid but got success for: ${JSON.stringify(input)}`).toBe(false)
  if (field && result.error) {
    const errors = result.error.flatten().fieldErrors
    expect(errors[field], `Expected error on field "${field}"`).toBeDefined()
  }
}

// ── RegisterSchema ────────────────────────────────────────────────────────────

describe('RegisterSchema', () => {
  const valid = { name: 'Alice', email: 'Alice@Example.COM', password: 'securepassword' }

  it('accepts valid registration data', () => {
    expectValid(RegisterSchema, valid)
  })

  it('lowercases email', () => {
    const result = expectValid(RegisterSchema, valid)
    expect(result.email).toBe('alice@example.com')
  })

  it('trims name', () => {
    const result = expectValid(RegisterSchema, { ...valid, name: '  Alice  ' })
    expect(result.name).toBe('Alice')
  })

  it('rejects missing name', () => {
    expectInvalid(RegisterSchema, { email: 'a@b.com', password: 'password1' }, 'name')
  })

  it('rejects empty name', () => {
    expectInvalid(RegisterSchema, { ...valid, name: '' }, 'name')
  })

  it('rejects name longer than 100 chars', () => {
    expectInvalid(RegisterSchema, { ...valid, name: 'a'.repeat(101) }, 'name')
  })

  it('rejects invalid email', () => {
    expectInvalid(RegisterSchema, { ...valid, email: 'not-an-email' }, 'email')
  })

  it('rejects password shorter than 8 chars', () => {
    expectInvalid(RegisterSchema, { ...valid, password: 'short' }, 'password')
  })

  it('rejects password longer than 100 chars', () => {
    expectInvalid(RegisterSchema, { ...valid, password: 'a'.repeat(101) }, 'password')
  })

  it('rejects missing password', () => {
    expectInvalid(RegisterSchema, { name: 'Alice', email: 'a@b.com' }, 'password')
  })
})

// ── LoginSchema ───────────────────────────────────────────────────────────────

describe('LoginSchema', () => {
  const valid = { email: 'User@Example.com', password: 'anypassword' }

  it('accepts valid login data', () => {
    expectValid(LoginSchema, valid)
  })

  it('lowercases email', () => {
    const result = expectValid(LoginSchema, valid)
    expect(result.email).toBe('user@example.com')
  })

  it('rejects invalid email', () => {
    expectInvalid(LoginSchema, { ...valid, email: 'bad' }, 'email')
  })

  it('rejects empty password', () => {
    expectInvalid(LoginSchema, { ...valid, password: '' }, 'password')
  })
})

// ── ForgotPasswordSchema ──────────────────────────────────────────────────────

describe('ForgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expectValid(ForgotPasswordSchema, { email: 'user@example.com' })
  })

  it('lowercases email', () => {
    const result = expectValid(ForgotPasswordSchema, { email: 'UPPER@EXAMPLE.COM' })
    expect(result.email).toBe('upper@example.com')
  })

  it('rejects invalid email', () => {
    expectInvalid(ForgotPasswordSchema, { email: 'notvalid' }, 'email')
  })

  it('rejects missing email', () => {
    expectInvalid(ForgotPasswordSchema, {}, 'email')
  })
})

// ── ResetPasswordSchema ───────────────────────────────────────────────────────

describe('ResetPasswordSchema', () => {
  const valid = { token: 'rst_abc123', password: 'newpassword' }

  it('accepts valid reset data', () => {
    expectValid(ResetPasswordSchema, valid)
  })

  it('rejects empty token', () => {
    expectInvalid(ResetPasswordSchema, { ...valid, token: '' }, 'token')
  })

  it('rejects missing token', () => {
    expectInvalid(ResetPasswordSchema, { password: 'newpassword' }, 'token')
  })

  it('rejects short password', () => {
    expectInvalid(ResetPasswordSchema, { ...valid, password: 'short' }, 'password')
  })
})

// ── ProfilePatchSchema ────────────────────────────────────────────────────────

describe('ProfilePatchSchema', () => {
  it('accepts empty patch (all fields optional)', () => {
    expectValid(ProfilePatchSchema, {})
  })

  it('accepts valid full patch', () => {
    expectValid(ProfilePatchSchema, {
      businessName:            'My Company',
      email:                   'contact@myco.com',
      phone:                   '+1-555-1234',
      website:                 'https://myco.com',
      taxId:                   'US-12345',
      defaultCurrency:         'EUR',
      defaultPaymentTermsDays: 30,
      defaultTaxRate:          10,
      defaultNotes:            'Thanks for your business',
      defaultTerms:            'Net 30',
      invoicePrefix:           'INV',
      address: {
        line1:   '123 Main St',
        city:    'Anytown',
        country: 'us',
      },
    })
  })

  it('uppercases defaultCurrency', () => {
    const result = expectValid(ProfilePatchSchema, { defaultCurrency: 'eur' })
    expect(result.defaultCurrency).toBe('EUR')
  })

  it('trims businessName', () => {
    const result = expectValid(ProfilePatchSchema, { businessName: '  Acme  ' })
    expect(result.businessName).toBe('Acme')
  })

  it('rejects businessName longer than 200 chars', () => {
    expectInvalid(ProfilePatchSchema, { businessName: 'a'.repeat(201) }, 'businessName')
  })

  it('rejects invalid invoicePrefix (special chars)', () => {
    expectInvalid(ProfilePatchSchema, { invoicePrefix: 'INV@' }, 'invoicePrefix')
  })

  it('rejects invoicePrefix longer than 10 chars', () => {
    expectInvalid(ProfilePatchSchema, { invoicePrefix: 'TOOLONGPREFIX' }, 'invoicePrefix')
  })

  it('rejects defaultPaymentTermsDays > 365', () => {
    expectInvalid(ProfilePatchSchema, { defaultPaymentTermsDays: 366 }, 'defaultPaymentTermsDays')
  })

  it('rejects defaultPaymentTermsDays < 0', () => {
    expectInvalid(ProfilePatchSchema, { defaultPaymentTermsDays: -1 }, 'defaultPaymentTermsDays')
  })

  it('rejects unknown fields (strict)', () => {
    expectInvalid(ProfilePatchSchema, { unknownField: 'foo' })
  })

  it('accepts null for nullable fields', () => {
    expectValid(ProfilePatchSchema, { email: null, phone: null, website: null, taxId: null, defaultTaxRate: null })
  })

  it('uppercases address.country', () => {
    const result = expectValid(ProfilePatchSchema, {
      address: { line1: '1 St', city: 'X', country: 'us' },
    })
    expect(result.address?.country).toBe('US')
  })

  it('rejects address.country not exactly 2 chars', () => {
    const result = ProfilePatchSchema.safeParse({
      address: { line1: '1 St', city: 'X', country: 'USA' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts null address', () => {
    expectValid(ProfilePatchSchema, { address: null })
  })

  it('rejects invalid website URL', () => {
    expectInvalid(ProfilePatchSchema, { website: 'not-a-url' }, 'website')
  })
})

// ── ClientCreateSchema ────────────────────────────────────────────────────────

describe('ClientCreateSchema', () => {
  const valid = { name: 'Acme Corp' }

  it('accepts minimal valid client (name only)', () => {
    expectValid(ClientCreateSchema, valid)
  })

  it('defaults currency to USD', () => {
    const result = expectValid(ClientCreateSchema, valid)
    expect(result.currency).toBe('USD')
  })

  it('uppercases currency', () => {
    const result = expectValid(ClientCreateSchema, { ...valid, currency: 'eur' })
    expect(result.currency).toBe('EUR')
  })

  it('trims name', () => {
    const result = expectValid(ClientCreateSchema, { name: '  Acme  ' })
    expect(result.name).toBe('Acme')
  })

  it('rejects empty name', () => {
    expectInvalid(ClientCreateSchema, { name: '' }, 'name')
  })

  it('rejects name longer than 200 chars', () => {
    expectInvalid(ClientCreateSchema, { name: 'a'.repeat(201) }, 'name')
  })

  it('rejects invalid email', () => {
    expectInvalid(ClientCreateSchema, { name: 'A', email: 'bad' }, 'email')
  })

  it('accepts full optional data', () => {
    expectValid(ClientCreateSchema, {
      name:     'Acme',
      email:    'billing@acme.com',
      phone:    '+1-555-9999',
      company:  'Acme Inc.',
      address:  { line1: '1 Main', city: 'NYC', country: 'US' },
      currency: 'GBP',
      notes:    'VIP client',
    })
  })
})

// ── ClientPatchSchema ─────────────────────────────────────────────────────────

describe('ClientPatchSchema', () => {
  it('accepts empty patch', () => {
    expectValid(ClientPatchSchema, {})
  })

  it('accepts partial update (name only)', () => {
    expectValid(ClientPatchSchema, { name: 'New Name' })
  })

  it('rejects invalid email in partial update', () => {
    expectInvalid(ClientPatchSchema, { email: 'bad' }, 'email')
  })
})

// ── InvoiceCreateSchema ───────────────────────────────────────────────────────

describe('InvoiceCreateSchema', () => {
  const validLineItem = {
    description: 'Web design',
    quantity:    1,
    unitPrice:   150000,
    taxable:     false,
  }

  const valid = {
    clientId:  '123e4567-e89b-12d3-a456-426614174000',
    issueDate: '2026-01-01',
    dueDate:   '2026-01-31',
    lineItems: [validLineItem],
  }

  it('accepts minimal valid invoice', () => {
    expectValid(InvoiceCreateSchema, valid)
  })

  it('rejects non-UUID clientId', () => {
    expectInvalid(InvoiceCreateSchema, { ...valid, clientId: 'not-a-uuid' }, 'clientId')
  })

  it('rejects malformed issueDate', () => {
    expectInvalid(InvoiceCreateSchema, { ...valid, issueDate: '01-01-2026' }, 'issueDate')
  })

  it('rejects malformed dueDate', () => {
    expectInvalid(InvoiceCreateSchema, { ...valid, dueDate: '31/01/2026' }, 'dueDate')
  })

  it('rejects empty lineItems array', () => {
    expectInvalid(InvoiceCreateSchema, { ...valid, lineItems: [] }, 'lineItems')
  })

  it('rejects lineItems with more than 100 items', () => {
    const items = Array(101).fill(validLineItem)
    expectInvalid(InvoiceCreateSchema, { ...valid, lineItems: items }, 'lineItems')
  })

  it('rejects line item with negative unitPrice', () => {
    const result = InvoiceCreateSchema.safeParse({
      ...valid,
      lineItems: [{ ...validLineItem, unitPrice: -1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects line item with zero or negative quantity', () => {
    const result = InvoiceCreateSchema.safeParse({
      ...valid,
      lineItems: [{ ...validLineItem, quantity: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects line item with empty description', () => {
    const result = InvoiceCreateSchema.safeParse({
      ...valid,
      lineItems: [{ ...validLineItem, description: '' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid discountType', () => {
    expectInvalid(InvoiceCreateSchema, { ...valid, discountType: 'flat' } as any, 'discountType')
  })

  it('rejects taxRate > 100', () => {
    expectInvalid(InvoiceCreateSchema, { ...valid, taxRate: 101 }, 'taxRate')
  })

  it('accepts valid discount fields', () => {
    expectValid(InvoiceCreateSchema, { ...valid, discountType: 'percentage', discountValue: 10 })
  })

  it('uppercases currency', () => {
    const result = expectValid(InvoiceCreateSchema, { ...valid, currency: 'gbp' })
    expect(result.currency).toBe('GBP')
  })

  it('defaults discountValue to 0', () => {
    const result = expectValid(InvoiceCreateSchema, valid)
    expect(result.discountValue).toBe(0)
  })

  it('accepts optional invoiceNumber override', () => {
    expectValid(InvoiceCreateSchema, { ...valid, invoiceNumber: 'CUSTOM-001' })
  })

  it('rejects invoiceNumber longer than 50 chars', () => {
    expectInvalid(InvoiceCreateSchema, { ...valid, invoiceNumber: 'a'.repeat(51) }, 'invoiceNumber')
  })
})

// ── InvoicePatchSchema ────────────────────────────────────────────────────────

describe('InvoicePatchSchema', () => {
  it('accepts empty patch', () => {
    expectValid(InvoicePatchSchema, {})
  })

  it('accepts partial patch with only lineItems', () => {
    expectValid(InvoicePatchSchema, {
      lineItems: [{ description: 'X', quantity: 1, unitPrice: 1000, taxable: false }],
    })
  })

  it('validates lineItems even in patch', () => {
    const result = InvoicePatchSchema.safeParse({
      lineItems: [{ description: '', quantity: 1, unitPrice: 1000, taxable: false }],
    })
    expect(result.success).toBe(false)
  })
})

// ── InvoiceSendSchema ─────────────────────────────────────────────────────────

describe('InvoiceSendSchema', () => {
  it('accepts valid send data', () => {
    expectValid(InvoiceSendSchema, { recipientEmail: 'client@example.com' })
  })

  it('lowercases recipientEmail', () => {
    const result = expectValid(InvoiceSendSchema, { recipientEmail: 'CLIENT@EXAMPLE.COM' })
    expect(result.recipientEmail).toBe('client@example.com')
  })

  it('accepts optional message', () => {
    expectValid(InvoiceSendSchema, { recipientEmail: 'a@b.com', message: 'Please find attached.' })
  })

  it('rejects invalid recipientEmail', () => {
    expectInvalid(InvoiceSendSchema, { recipientEmail: 'not-email' }, 'recipientEmail')
  })

  it('rejects message longer than 2000 chars', () => {
    expectInvalid(InvoiceSendSchema, { recipientEmail: 'a@b.com', message: 'x'.repeat(2001) }, 'message')
  })
})

// ── PaymentCreateSchema ───────────────────────────────────────────────────────

describe('PaymentCreateSchema', () => {
  const valid = { amount: 5000, method: 'bank_transfer' as const }

  it('accepts valid payment data', () => {
    expectValid(PaymentCreateSchema, valid)
  })

  it('rejects amount = 0', () => {
    expectInvalid(PaymentCreateSchema, { ...valid, amount: 0 }, 'amount')
  })

  it('rejects negative amount', () => {
    expectInvalid(PaymentCreateSchema, { ...valid, amount: -100 }, 'amount')
  })

  it('rejects non-integer amount', () => {
    expectInvalid(PaymentCreateSchema, { ...valid, amount: 49.99 }, 'amount')
  })

  it('rejects invalid payment method', () => {
    expectInvalid(PaymentCreateSchema, { ...valid, method: 'paypal' } as any, 'method')
  })

  it('accepts all valid payment methods', () => {
    const methods = ['cash', 'bank_transfer', 'check', 'credit_card', 'other'] as const
    for (const method of methods) {
      expectValid(PaymentCreateSchema, { amount: 100, method })
    }
  })

  it('rejects malformed paidAt', () => {
    expectInvalid(PaymentCreateSchema, { ...valid, paidAt: '15/01/2026' }, 'paidAt')
  })

  it('accepts valid paidAt ISO date', () => {
    expectValid(PaymentCreateSchema, { ...valid, paidAt: '2026-01-15' })
  })

  it('accepts optional reference and notes', () => {
    expectValid(PaymentCreateSchema, { ...valid, reference: 'REF-001', notes: 'Wire transfer' })
  })
})

// ── CatalogCreateSchema ───────────────────────────────────────────────────────

describe('CatalogCreateSchema', () => {
  const valid = { name: 'Design Work', unitPrice: 15000 }

  it('accepts minimal valid catalog item', () => {
    expectValid(CatalogCreateSchema, valid)
  })

  it('defaults taxable to false', () => {
    const result = expectValid(CatalogCreateSchema, valid)
    expect(result.taxable).toBe(false)
  })

  it('trims name', () => {
    const result = expectValid(CatalogCreateSchema, { ...valid, name: '  Design Work  ' })
    expect(result.name).toBe('Design Work')
  })

  it('rejects empty name', () => {
    expectInvalid(CatalogCreateSchema, { ...valid, name: '' }, 'name')
  })

  it('rejects name longer than 200 chars', () => {
    expectInvalid(CatalogCreateSchema, { ...valid, name: 'a'.repeat(201) }, 'name')
  })

  it('rejects negative unitPrice', () => {
    expectInvalid(CatalogCreateSchema, { ...valid, unitPrice: -1 }, 'unitPrice')
  })

  it('rejects non-integer unitPrice', () => {
    expectInvalid(CatalogCreateSchema, { ...valid, unitPrice: 99.99 }, 'unitPrice')
  })

  it('rejects description longer than 500 chars', () => {
    expectInvalid(CatalogCreateSchema, { ...valid, description: 'd'.repeat(501) }, 'description')
  })

  it('rejects unit longer than 20 chars', () => {
    expectInvalid(CatalogCreateSchema, { ...valid, unit: 'u'.repeat(21) }, 'unit')
  })

  it('accepts full optional data', () => {
    expectValid(CatalogCreateSchema, {
      ...valid,
      description: 'Hourly design rate',
      unit:        'hr',
      taxable:     true,
    })
  })
})

// ── CatalogPatchSchema ────────────────────────────────────────────────────────

describe('CatalogPatchSchema', () => {
  it('accepts empty patch', () => {
    expectValid(CatalogPatchSchema, {})
  })

  it('accepts partial update (name only)', () => {
    expectValid(CatalogPatchSchema, { name: 'Updated Name' })
  })

  it('rejects invalid unitPrice in partial update', () => {
    expectInvalid(CatalogPatchSchema, { unitPrice: -50 }, 'unitPrice')
  })
})

// ── parseBody helper (lib/api.ts) ─────────────────────────────────────────────

describe('parseBody helper (lib/api.ts)', () => {
  it('returns { ok: true, data } for valid input', async () => {
    const { parseBody } = await import('@/lib/api')
    const result = parseBody(RegisterSchema, { name: 'Bob', email: 'bob@test.com', password: 'password123' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.email).toBe('bob@test.com')
    }
  })

  it('returns { ok: false, response } for invalid input', async () => {
    const { parseBody } = await import('@/lib/api')
    const result = parseBody(RegisterSchema, { name: '', email: 'bad', password: 'short' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response).toBeDefined()
      // Response should be a NextResponse with status 400
      expect(result.response.status).toBe(400)
    }
  })

  it('response body for invalid input contains VALIDATION_ERROR code', async () => {
    const { parseBody } = await import('@/lib/api')
    const result = parseBody(LoginSchema, { email: 'bad' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const body = await result.response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.details).toBeDefined()
    }
  })
})
