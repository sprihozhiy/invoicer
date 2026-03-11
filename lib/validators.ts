import { z } from 'zod'

const AddressSchema = z
  .object({
    line1: z.string().min(1).max(200).trim(),
    line2: z.string().max(200).trim().nullish(),
    city: z.string().min(1).max(100).trim(),
    state: z.string().max(100).trim().nullish(),
    postalCode: z.string().max(20).trim().nullish(),
    country: z.string().length(2).toUpperCase(),
  })
  .nullish()

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')

export const RegisterSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
})

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
})

export const ProfilePatchSchema = z
  .object({
    businessName: z.string().min(1).max(200).trim().optional(),
    email: z.string().email().toLowerCase().nullish(),
    phone: z.string().max(50).trim().nullish(),
    website: z.string().url().nullish(),
    taxId: z.string().max(50).trim().nullish(),
    defaultCurrency: z.string().length(3).toUpperCase().optional(),
    defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
    defaultTaxRate: z.number().min(0).max(100).nullish(),
    defaultNotes: z.string().max(2000).nullish(),
    defaultTerms: z.string().max(2000).nullish(),
    invoicePrefix: z.string().regex(/^[A-Za-z0-9-]{1,10}$/).optional(),
    address: AddressSchema,
  })
  .strict()

export const ClientCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().toLowerCase().nullish(),
  phone: z.string().max(50).trim().nullish(),
  company: z.string().max(200).trim().nullish(),
  address: AddressSchema,
  currency: z.string().length(3).toUpperCase().default('USD'),
  notes: z.string().max(2000).nullish(),
})

export const ClientPatchSchema = ClientCreateSchema.partial()

const LineItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1).max(500).trim(),
  quantity: z.number().positive().max(99999),
  unitPrice: z.number().int().min(0),
  taxable: z.boolean().default(false),
})

export const InvoiceCreateSchema = z.object({
  clientId: z.string().uuid(),
  issueDate: isoDate,
  dueDate: isoDate,
  lineItems: z.array(LineItemInputSchema).min(1).max(100),
  taxRate: z.number().min(0).max(100).nullish(),
  discountType: z.enum(['percentage', 'fixed']).nullish(),
  discountValue: z.number().min(0).default(0),
  currency: z.string().length(3).toUpperCase().optional(),
  notes: z.string().max(2000).nullish(),
  terms: z.string().max(2000).nullish(),
  invoiceNumber: z.string().max(50).optional(),
})

export const InvoicePatchSchema = InvoiceCreateSchema.partial()

export const InvoiceSendSchema = z.object({
  recipientEmail: z.string().email().toLowerCase(),
  message: z.string().max(2000).optional(),
})

export const PaymentCreateSchema = z.object({
  amount: z.number().int().positive(),
  method: z.enum(['cash', 'bank_transfer', 'check', 'credit_card', 'other']),
  paidAt: isoDate.optional(),
  reference: z.string().max(200).trim().nullish(),
  notes: z.string().max(1000).nullish(),
})

export const CatalogCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  unitPrice: z.number().int().min(0),
  description: z.string().max(500).nullish(),
  unit: z.string().max(20).trim().nullish(),
  taxable: z.boolean().default(false),
})

export const CatalogPatchSchema = CatalogCreateSchema.partial()
