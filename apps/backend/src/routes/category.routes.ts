import { Router } from 'express';
import multer from 'multer';
import { categoryController } from '@/controllers/category.controller';
import { authenticate, authorize } from '@/middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// Public routes
router.get('/', categoryController.getAll);
router.get('/slug/:slug', categoryController.getBySlug);
router.get('/:id', categoryController.getById);

// Admin routes
router.post('/', authenticate, authorize('ADMIN'), categoryController.create);
router.patch('/:id', authenticate, authorize('ADMIN'), categoryController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), categoryController.delete);
router.post('/:id/image', authenticate, authorize('ADMIN'), upload.single('image'), categoryController.uploadImage);

export default router;
