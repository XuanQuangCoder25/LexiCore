import { Router } from 'express';
import { 
    register, 
    login, 
    logout,
    refreshTokenHandler,
    changePasswordHandler,
    verifyEmailHandler, 
    getMeHandler, 
    forgotPasswordHandler, 
    resetPasswordHandler, 
    resendOtpHandler, 
    verifyOtpHandler 
} from './auth-controller';
import { requireAuth } from '../../middlewares/requireAuth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshTokenHandler);
router.post('/change-password', requireAuth, changePasswordHandler);
router.post('/verify-email', verifyEmailHandler);
router.get('/me', requireAuth, getMeHandler);          // Cần JWT hợp lệ
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.post('/resend-otp', resendOtpHandler);
router.post('/verify-otp', verifyOtpHandler);

export default router;
