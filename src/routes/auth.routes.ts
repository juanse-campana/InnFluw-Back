import { Router } from 'express';
import { register, login, verifyOtp, getProfile, updateProfile } from '../controllers/auth.controller.js';
import { validate } from '../utils/errors.js';
import { registerSchema, loginSchema, verifyOtpSchema } from '../utils/schemas.js';
import { authMiddleware, authRateLimit, otpRateLimit } from '../middleware/index.js';

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), register);
router.post('/login', authRateLimit, validate(loginSchema), login);
router.post('/verify-otp', otpRateLimit, validate(verifyOtpSchema), verifyOtp);

router.get('/profile', authMiddleware, getProfile);
router.patch('/profile', authMiddleware, updateProfile);

export default router;
