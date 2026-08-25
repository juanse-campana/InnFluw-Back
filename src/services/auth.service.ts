import bcrypt from 'bcrypt';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/errors.js';
import { ERROR_MESSAGES } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { UserRole } from '@prisma/client';
import { createAvailableSellerSlug } from './sellerSlug.service.js';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createOtpCode = async (
  email: string,
  userId?: string
): Promise<string> => {
  const code = generateOtp();
  const expiresAt = new Date(
    Date.now() + config.otp.expiresInMinutes * 60 * 1000
  );

  await prisma.otpCode.create({
    data: {
      email,
      code,
      expiresAt,
      userId,
    },
  });

  return code;
};

export const verifyOtpCode = async (
  email: string,
  code: string
): Promise<{ valid: boolean; userId?: string }> => {
  const otp = await prisma.otpCode.findFirst({
    where: {
      email,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otp) {
    return { valid: false };
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { used: true },
  });

  return { valid: true, userId: otp.userId || undefined };
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
};

export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
}) => {
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    throw new AppError(400, ERROR_MESSAGES.EMAIL_EXISTS);
  }

  const hashedPassword = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
    },
  });
};

export const generateConfirmationToken = (): string => {
  return uuidv4();
};

export const logAudit = async (
  action: string,
  entity: string,
  entityId: string,
  userId?: string,
  changes?: object,
  metadata?: object
) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        changes,
        metadata,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error });
  }
};

export const generateVerificationToken = (): string => {
  return uuidv4();
};

export const createUserWithVerification = async (data: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}) => {
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    throw new AppError(400, ERROR_MESSAGES.EMAIL_EXISTS);
  }

  const hashedPassword = await hashPassword(data.password);
  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const role = data.role ?? UserRole.INFLUENCER;
  const sellerSlug = role === UserRole.INFLUENCER
    ? await createAvailableSellerSlug(data.name)
    : undefined;

  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role,
      sellerSlug,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: expiresAt,
    },
  });
};

export const verifyEmail = async (token: string): Promise<boolean> => {
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerified: false,
    },
  });

  if (!user) {
    return false;
  }

  if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
    return false;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  return true;
};

export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; reason?: string }> => {
  const user = await findUserByEmail(email);

  if (!user) {
    return { success: false, reason: 'Usuario no encontrado' };
  }

  if (user.emailVerified) {
    return { success: false, reason: 'El email ya ha sido verificado' };
  }

  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: expiresAt,
    },
  });

  return { success: true, reason: verificationToken };
};
