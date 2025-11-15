import { Router } from 'express';
import multer from 'multer';
import { authController } from '@/controllers/auth.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { authLimiter } from '@/middleware/rate-limit';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '@/validations/auth.validation';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes (with auth rate limiting)
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.post('/upload-avatar', authenticate, upload.single('avatar'), authController.uploadAvatar);

export default router;
