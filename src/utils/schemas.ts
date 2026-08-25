import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Email inválido'),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
});

export const createDropSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200),
  slug: z.string().min(1, 'El slug es requerido').regex(/^[a-z0-9-]+$/, 'El slug debe ser lowercase con guiones'),
  description: z.string().min(1, 'La descripción es requerida'),
  category: z.string().min(1, 'La categoría es requerida'),
  price: z.number().positive('El precio debe ser positivo'),
  stock: z.number().int().min(0, 'El stock no puede ser negativo').default(0),
  productImage: z.string().url().optional().nullable(),
  status: z.enum(['DRAFT', 'COMING_SOON', 'LIVE', 'SOLD_OUT', 'ENDED']).default('DRAFT'),
  config: z.object({
    theme: z.object({
      colors: z.object({
        primary: z.string().optional(),
        secondary: z.string().optional(),
        background: z.string().optional(),
        text: z.string().optional(),
        accent: z.string().optional(),
      }).optional(),
      fonts: z.object({
        heading: z.string().optional(),
        body: z.string().optional(),
      }).optional(),
    }).optional(),
    branding: z.object({
      logo: z.string().nullable().optional(),
      favicon: z.string().nullable().optional(),
      heroImage: z.string().nullable().optional(),
      ogImage: z.string().nullable().optional(),
    }).optional(),
    content: z.object({
      headline: z.string().optional(),
      subheadline: z.string().optional(),
      description: z.string().optional(),
      ctaText: z.string().optional(),
      footerText: z.string().optional(),
    }).optional(),
    layout: z.object({
      template: z.enum(['minimal', 'standard', 'showcase']).optional(),
      boxedWidth: z.number().optional(),
      padding: z.number().optional(),
    }).optional(),
    products: z.object({
      showStock: z.boolean().optional(),
      showPrices: z.boolean().optional(),
      currency: z.enum(['USD', 'EUR', 'ARS']).optional(),
    }).optional(),
    checkout: z.object({
      successRedirect: z.string().optional(),
      emailCustomMessage: z.string().optional(),
    }).optional(),
    social: z.object({
      instagram: z.string().nullable().optional(),
      twitter: z.string().nullable().optional(),
      tiktok: z.string().nullable().optional(),
    }).optional(),
    customCss: z.string().optional(),
    meta: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
    }).optional(),
  }).optional().nullable(),
});

export const updateDropSchema = createDropSchema.partial().extend({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
});

export const createDiscountCodeSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(50).toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.number().positive('El valor debe ser positivo'),
  minAmount: z.number().min(0).optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  dropIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un drop'),
});

export const updateDiscountCodeSchema = createDiscountCodeSchema.partial();

export const checkoutSchema = z.object({
  dropId: z.string().uuid('ID de drop inválido'),
  discountCode: z.string().optional().nullable(),
  buyerEmail: z.string().email('Email de comprador inválido'),
  buyerName: z.string().min(1, 'El nombre es requerido'),
  buyerPhone: z.string().optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  buyerCity: z.string().optional().nullable(),
  buyerCountry: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'BANK_TRANSFER']).default('CASH_ON_DELIVERY'),
  bankAccountId: z.string().uuid('ID de cuenta bancaria inválido').optional().nullable(),
  transferReceipt: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod !== 'BANK_TRANSFER') return;

  if (!data.bankAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La cuenta bancaria es requerida para pago con transferencia',
      path: ['bankAccountId'],
    });
  }

  if (typeof data.transferReceipt !== 'string' || data.transferReceipt.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El comprobante de transferencia es requerido',
      path: ['transferReceipt'],
    });
  } else if (!data.transferReceipt.startsWith('/uploads/transfer-receipt-')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El comprobante debe cargarse mediante el servicio de comprobantes',
      path: ['transferReceipt'],
    });
  }
});

const bankAccountFields = {
  kind: z.enum(['QR', 'NORMAL']),
  financialInstitution: z.string().trim().min(1, 'La institución financiera es requerida').max(200),
  qrImageUrl: z.string().url('La imagen QR debe ser una URL válida').optional().nullable(),
  beneficiaryRucCi: z.string().trim().min(1, 'El RUC/CI del beneficiario es requerido').max(50).optional().nullable(),
  beneficiaryName: z.string().trim().min(1, 'El nombre del beneficiario es requerido').max(200),
  accountNumber: z.string().trim().min(1, 'El número de cuenta es requerido').max(100).optional().nullable(),
  accountType: z.enum(['SAVINGS', 'CHECKING']).optional().nullable(),
  isActive: z.boolean().optional(),
};

export const createBankAccountSchema = z.object(bankAccountFields).strict().superRefine((data, ctx) => {
  if (data.kind === 'QR') {
    if (!data.qrImageUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La imagen QR es requerida', path: ['qrImageUrl'] });
    }
    if (data.beneficiaryRucCi || data.accountNumber || data.accountType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Una cuenta QR no admite datos de cuenta normal', path: ['kind'] });
    }
    return;
  }

  if (!data.beneficiaryRucCi) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El RUC/CI del beneficiario es requerido', path: ['beneficiaryRucCi'] });
  }
  if (!data.accountNumber) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El número de cuenta es requerido', path: ['accountNumber'] });
  }
  if (!data.accountType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El tipo de cuenta es requerido', path: ['accountType'] });
  }
  if (data.qrImageUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Una cuenta normal no admite imagen QR', path: ['qrImageUrl'] });
  }
});

export const updateBankAccountSchema = z.object(bankAccountFields).partial().strict();

export const createWebhookSchema = z.object({
  url: z.string().url('URL de webhook inválida'),
  events: z.array(z.enum(['order.created', 'order.confirmed', 'drop.stock.low'])).min(1),
});

export const createVisitorSchema = z.object({
  dropId: z.string().uuid(),
  sessionId: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateDropInput = z.infer<typeof createDropSchema>;
export type UpdateDropInput = z.infer<typeof updateDropSchema>;
export type CreateDiscountCodeInput = z.infer<typeof createDiscountCodeSchema>;
export type UpdateDiscountCodeInput = z.infer<typeof updateDiscountCodeSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
