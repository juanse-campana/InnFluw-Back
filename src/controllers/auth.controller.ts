import { Response } from 'express';
import { AuthRequest } from '../utils/jwt.js';
import { asyncHandler } from '../utils/errors.js';
import { registerSchema, loginSchema, verifyOtpSchema } from '../utils/schemas.js';
import { createUser, findUserByEmail, comparePassword, createOtpCode, verifyOtpCode, logAudit } from '../services/auth.service.js';
import { sendWelcomeEmail, sendOtpEmail } from '../services/email.service.js';
import { generateToken } from '../utils/jwt.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/constants.js';
import { prisma } from '../config/database.js';

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = registerSchema.parse(req.body);

  const user = await createUser({
    email: data.email,
    password: data.password,
    name: data.name,
  });

  await sendWelcomeEmail(user.email, user.name);

  await logAudit('user.created', 'User', user.id, user.id);

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.USER_CREATED,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    },
  });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await findUserByEmail(data.email);
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
      },
    });
    return;
  }

  const isValidPassword = await comparePassword(data.password, user.password);
  if (!isValidPassword) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
      },
    });
    return;
  }

  const code = await createOtpCode(user.email, user.id);
  await sendOtpEmail(user.email, code);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.OTP_SENT,
  });
});

export const verifyOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = verifyOtpSchema.parse(req.body);

  const result = await verifyOtpCode(data.email, data.code);
  if (!result.valid) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_OTP',
        message: ERROR_MESSAGES.INVALID_OTP,
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
      },
    });
    return;
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  await logAudit('user.login', 'User', user.id, user.id);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.OTP_VERIFIED,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      createdAt: true,
    },
  });

  res.json({
    success: true,
    data: { user },
  });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, avatar } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name, avatar },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
    },
  });

  res.json({
    success: true,
    message: 'Perfil actualizado',
    data: { user },
  });
});
