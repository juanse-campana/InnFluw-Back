import { Router } from 'express';
import { register, login, verifyOtp, resendOtp, getProfile, updateProfile, verifyEmailController, resendVerificationController } from '../controllers/auth.controller.js';
import { validate } from '../utils/errors.js';
import { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema } from '../utils/schemas.js';
import { authMiddleware, authRateLimit, otpRateLimit } from '../middleware/index.js';

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), register);
router.post('/login', authRateLimit, validate(loginSchema), login);
router.post('/verify-otp', otpRateLimit, validate(verifyOtpSchema), verifyOtp);
router.post('/resend-otp', otpRateLimit, validate(resendOtpSchema), resendOtp);
router.get('/verify-email', verifyEmailController);
router.post('/resend-verification', authRateLimit, resendVerificationController);

router.get('/profile', authMiddleware, getProfile);
router.patch('/profile', authMiddleware, updateProfile);

export default router;
