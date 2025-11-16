import { Router } from 'express';
import { couponController } from '@/controllers/coupon.controller';
import { authenticate, authorize } from '@/middleware/auth';

const router = Router();

// Public routes
router.post('/validate', authenticate, couponController.validate);

// Admin routes
router.get('/', authenticate, authorize('ADMIN', 'VENDOR'), couponController.getAll);
router.get('/:id', authenticate, authorize('ADMIN', 'VENDOR'), couponController.getById);
router.post('/', authenticate, authorize('ADMIN', 'VENDOR'), couponController.create);
router.patch('/:id', authenticate, authorize('ADMIN', 'VENDOR'), couponController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), couponController.delete);

export default router;
