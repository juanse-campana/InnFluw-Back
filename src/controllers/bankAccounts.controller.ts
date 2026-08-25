import { Response } from 'express';
import { AuthRequest } from '../utils/jwt.js';
import { asyncHandler, AppError, NotFoundError } from '../utils/errors.js';
import { createBankAccountSchema, updateBankAccountSchema } from '../utils/schemas.js';
import { prisma } from '../config/database.js';
import { logAudit } from '../services/auth.service.js';

const publicBankAccountSelect = {
  id: true,
  kind: true,
  financialInstitution: true,
  qrImageUrl: true,
  beneficiaryRucCi: true,
  beneficiaryName: true,
  accountNumber: true,
  accountType: true,
} as const;

export const getBankAccounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: { bankAccounts } });
});

export const getPublicBankAccounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sellerId = req.params.sellerId as string;
  const kind = req.query.kind as string | undefined;

  if (kind && kind !== 'QR' && kind !== 'NORMAL') {
    throw new AppError(400, 'El tipo de cuenta debe ser QR o NORMAL');
  }

  const bankAccounts = await prisma.bankAccount.findMany({
    where: {
      userId: sellerId,
      isActive: true,
      ...(kind ? { kind: kind as 'QR' | 'NORMAL' } : {}),
    },
    select: publicBankAccountSelect,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: { bankAccounts } });
});

export const createBankAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = createBankAccountSchema.parse(req.body);
  const bankAccount = await prisma.bankAccount.create({
    data: {
      ...data,
      userId: req.user!.userId,
    },
  });

  await logAudit('bank_account.created', 'BankAccount', bankAccount.id, req.user!.userId, data);

  res.status(201).json({
    success: true,
    message: 'Cuenta bancaria creada exitosamente',
    data: { bankAccount },
  });
});

export const updateBankAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const changes = updateBankAccountSchema.parse(req.body);
  const existing = await prisma.bankAccount.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!existing) {
    throw new NotFoundError('Cuenta bancaria no encontrada');
  }

  const { id: _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, ...existingData } = existing;
  const data = createBankAccountSchema.parse({ ...existingData, ...changes });
  const bankAccount = await prisma.bankAccount.update({
    where: { id },
    data,
  });

  await logAudit('bank_account.updated', 'BankAccount', bankAccount.id, req.user!.userId, changes);

  res.json({
    success: true,
    message: 'Cuenta bancaria actualizada exitosamente',
    data: { bankAccount },
  });
});

export const deleteBankAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!bankAccount) {
    throw new NotFoundError('Cuenta bancaria no encontrada');
  }

  const orderCount = await prisma.order.count({ where: { bankAccountId: id } });
  if (orderCount > 0) {
    throw new AppError(400, 'No se puede eliminar una cuenta con órdenes asociadas. Desactívala en su lugar.');
  }

  await prisma.bankAccount.delete({ where: { id } });
  await logAudit('bank_account.deleted', 'BankAccount', id, req.user!.userId);

  res.json({ success: true, message: 'Cuenta bancaria eliminada exitosamente' });
});
