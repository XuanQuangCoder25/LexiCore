import { Router } from 'express';
import { register, login, verifyEmailHandler, getMeHandler, forgotPasswordHandler, resetPasswordHandler, resendOtpHandler } from './auth-controller';
import { requireAuth } from '../../middlewares/requireAuth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmailHandler);
router.get('/me', requireAuth, getMeHandler);          // Cần JWT hợp lệ
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.post('/resend-otp', resendOtpHandler);

export default router;
