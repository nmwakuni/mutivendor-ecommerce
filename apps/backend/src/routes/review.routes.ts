import { Router } from 'express';
import multer from 'multer';
import { reviewController } from '@/controllers/review.controller';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { getReviewsSchema } from '@/validations/review.validation';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });

// Public routes
router.get('/', validate(getReviewsSchema), reviewController.getAll);
router.get('/:id', reviewController.getById);

// Customer routes
router.post('/', authenticate, reviewController.create);
router.patch('/:id', authenticate, reviewController.update);
router.delete('/:id', authenticate, reviewController.delete);
router.post('/:id/images', authenticate, upload.array('images', 3), reviewController.uploadImages);
router.post('/:id/helpful', reviewController.markHelpful);

// Admin routes
router.post('/:id/approve', authenticate, authorize('ADMIN'), reviewController.approve);
router.post('/:id/reject', authenticate, authorize('ADMIN'), reviewController.reject);

export default router;
