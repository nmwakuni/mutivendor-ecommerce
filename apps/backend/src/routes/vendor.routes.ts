import { Router } from 'express';
import { vendorController } from '@/controllers/vendor.controller';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import {
  applyVendorSchema,
  updateVendorSchema,
  approveVendorSchema,
  rejectVendorSchema,
} from '@/validations/vendor.validation';

const router = Router();

// Public routes
router.get('/:id', vendorController.getById);

// Customer/Vendor routes
router.post('/apply', authenticate, validate(applyVendorSchema), vendorController.apply);
router.get('/profile/me', authenticate, authorize('VENDOR'), vendorController.getProfile);
router.patch('/:id', authenticate, authorize('VENDOR'), validate(updateVendorSchema), vendorController.update);
router.get('/:id/statistics', authenticate, authorize('VENDOR'), vendorController.getStatistics);

// Admin routes
router.get('/', authenticate, authorize('ADMIN'), vendorController.getAll);
router.post('/approve', authenticate, authorize('ADMIN'), validate(approveVendorSchema), vendorController.approve);
router.post('/reject', authenticate, authorize('ADMIN'), validate(rejectVendorSchema), vendorController.reject);
router.post('/:id/suspend', authenticate, authorize('ADMIN'), vendorController.suspend);

export default router;
