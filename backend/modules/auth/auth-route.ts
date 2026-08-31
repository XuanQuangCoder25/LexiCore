import { Router } from 'express';
import { register } from './auth-controller';

const router = Router();

// Định nghĩa API Endpoint: POST /api/auth/register
router.post('/register', register);

export default router;
