import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  authController.login
);

router.post(
  '/refresh',
  authRateLimiter,
  validate(refreshTokenSchema),
  authController.refreshToken
);

router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.getMe);

export default router;
