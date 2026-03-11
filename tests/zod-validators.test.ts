import { describe, expect, it } from 'vitest'

import { parseBody } from '@/lib/api'
import {
  CatalogCreateSchema,
  CatalogPatchSchema,
  ClientCreateSchema,
  ClientPatchSchema,
  ForgotPasswordSchema,
  InvoiceCreateSchema,
  InvoicePatchSchema,
  InvoiceSendSchema,
  LoginSchema,
  PaymentCreateSchema,
  ProfilePatchSchema,
  RegisterSchema,
  ResetPasswordSchema,
} from '@/lib/validators'

describe('F6 Zod validation tests', () => {
  it('register/login/forgot/reset schemas normalize email and trim name', () => {
    const register = RegisterSchema.parse({
      name: '  Jane Doe  ',
      email: 'USER@Example.COM',
      password: 'Password123',
    })

    expect(register.name).toBe('Jane Doe')
    expect(register.email).toBe('user@example.com')

    const login = LoginSchema.parse({
      email: 'USER@Example.COM',
      password: 'x',
    })
    expect(login.email).toBe('user@example.com')

    const forgot = ForgotPasswordSchema.parse({ email: 'USER@Example.COM' })
    expect(forgot.email).toBe('user@example.com')

    const reset = ResetPasswordSchema.safeParse({ token: '', password: '12345678' })
    expect(reset.success).toBe(false)
  })

  it('profile schema is strict and applies transforms', () => {
    const parsed = ProfilePatchSchema.parse({
      businessName: '  Acme Inc  ',
      email: 'BILLING@EXAMPLE.COM',
      defaultCurrency: 'usd',
      address: {
        line1: ' 123 Main ',
        city: '  Denver ',
        country: 'us',
      },
    })

    expect(parsed.businessName).toBe('Acme Inc')
    expect(parsed.email).toBe('billing@example.com')
    expect(parsed.defaultCurrency).toBe('USD')
    expect(parsed.address?.line1).toBe('123 Main')
    expect(parsed.address?.city).toBe('Denver')
    expect(parsed.address?.country).toBe('US')

    const strictFailure = ProfilePatchSchema.safeParse({ unknownField: true })
    expect(strictFailure.success).toBe(false)
  })

  it('client create/patch schema defaults and transforms fields', () => {
    const created = ClientCreateSchema.parse({
      name: '  Client Name ',
      email: 'CLIENT@EXAMPLE.COM',
    })

    expect(created.name).toBe('Client Name')
    expect(created.email).toBe('client@example.com')
    expect(created.currency).toBe('USD')

    const patched = ClientPatchSchema.parse({ currency: 'eur' })
    expect(patched.currency).toBe('EUR')
  })

  it('invoice create/patch/send schema validates and applies defaults/transforms', () => {
    const created = InvoiceCreateSchema.parse({
      clientId: '6f73eaf8-59a5-4b19-9da8-c6878060466d',
      issueDate: '2026-03-01',
      dueDate: '2026-03-15',
      lineItems: [
        {
          description: '  Design work ',
          quantity: 2,
          unitPrice: 5000,
        },
      ],
      currency: 'cad',
    })

    expect(created.currency).toBe('CAD')
    expect(created.discountValue).toBe(0)
    expect(created.lineItems[0].description).toBe('Design work')
    expect(created.lineItems[0].taxable).toBe(false)

    const patched = InvoicePatchSchema.parse({ notes: null })
    expect(patched.notes).toBeNull()

    const send = InvoiceSendSchema.parse({ recipientEmail: 'SEND@EXAMPLE.COM' })
    expect(send.recipientEmail).toBe('send@example.com')
  })

  it('payment schema enforces enum/date and trims reference', () => {
    const payment = PaymentCreateSchema.parse({
      amount: 1000,
      method: 'bank_transfer',
      paidAt: '2026-03-10',
      reference: '  REF-123 ',
    })

    expect(payment.reference).toBe('REF-123')

    const invalid = PaymentCreateSchema.safeParse({
      amount: 1000,
      method: 'wire',
      paidAt: '03/10/2026',
    })
    expect(invalid.success).toBe(false)
  })

  it('catalog create/patch schema trims name and defaults taxable', () => {
    const created = CatalogCreateSchema.parse({
      name: '  Logo Design ',
      unitPrice: 10000,
      unit: '  hr ',
    })

    expect(created.name).toBe('Logo Design')
    expect(created.taxable).toBe(false)
    expect(created.unit).toBe('hr')

    const patched = CatalogPatchSchema.parse({ taxable: true })
    expect(patched.taxable).toBe(true)
  })

  it('parseBody returns typed data on success and validation response on failure', async () => {
    const ok = parseBody(RegisterSchema, {
      name: '  Jane ',
      email: 'JANE@EXAMPLE.COM',
      password: 'Password123',
    })

    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.data.name).toBe('Jane')
      expect(ok.data.email).toBe('jane@example.com')
    }

    const failed = parseBody(RegisterSchema, {
      name: '',
      email: 'bad-email',
      password: 'short',
    })

    expect(failed.ok).toBe(false)
    if (!failed.ok) {
      expect(failed.response.status).toBe(400)
      const json = await failed.response.json()
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toBe('Invalid input.')
      expect(json.error.details).toBeDefined()
      expect(Array.isArray(json.error.details.name)).toBe(true)
    }
  })
})
