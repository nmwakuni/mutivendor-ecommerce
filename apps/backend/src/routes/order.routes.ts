import { Router } from 'express';
import { orderController } from '@/controllers/order.controller';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paymentLimiter } from '@/middleware/rate-limit';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  getOrdersSchema,
} from '@/validations/order.validation';

const router = Router();

// Customer routes
router.post('/', authenticate, paymentLimiter, validate(createOrderSchema), orderController.create);
router.get('/', authenticate, validate(getOrdersSchema), orderController.getAll);
router.get('/:id', authenticate, orderController.getById);
router.post('/:id/cancel', authenticate, authorize('CUSTOMER'), orderController.cancel);

// Vendor routes
router.patch('/:id/status', authenticate, authorize('VENDOR'), validate(updateOrderStatusSchema), orderController.updateStatus);

export default router;
