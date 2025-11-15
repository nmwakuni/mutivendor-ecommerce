import { Router } from 'express';
import { paymentController } from '@/controllers/payment.controller';

const router = Router();

// M-Pesa webhook endpoints (public)
router.post('/mpesa/callback', paymentController.mpesaCallback);
router.post('/mpesa/timeout', paymentController.mpesaTimeout);

export default router;
