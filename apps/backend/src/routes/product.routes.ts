import { Router } from 'express';
import multer from 'multer';
import { productController } from '@/controllers/product.controller';
import { validate } from '@/middleware/validate';
import { authenticate, authorize, optionalAuth } from '@/middleware/auth';
import {
  createProductSchema,
  updateProductSchema,
  getProductsSchema,
} from '@/validations/product.validation';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public routes
router.get('/', validate(getProductsSchema), productController.getAll);
router.get('/:id', optionalAuth, productController.getById);

// Vendor routes
router.post('/', authenticate, authorize('VENDOR'), validate(createProductSchema), productController.create);
router.patch('/:id', authenticate, authorize('VENDOR'), validate(updateProductSchema), productController.update);
router.delete('/:id', authenticate, authorize('VENDOR'), productController.delete);
router.post('/:id/images', authenticate, authorize('VENDOR'), upload.array('images', 5), productController.uploadImages);
router.patch('/:id/stock', authenticate, authorize('VENDOR'), productController.updateStock);

export default router;
