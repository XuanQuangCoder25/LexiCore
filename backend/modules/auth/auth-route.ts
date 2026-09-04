import { Router } from 'express';
import { register, login, verifyEmailHandler } from './auth-controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmailHandler);

export default router;
