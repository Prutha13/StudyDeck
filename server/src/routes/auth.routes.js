import { Router } from 'express';
import { register, login, sendOtp, verifyOtp, getMe, updateProfile } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.patch('/profile', authMiddleware, updateProfile);
router.get('/me', authMiddleware, getMe);

export default router;
