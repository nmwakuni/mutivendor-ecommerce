import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth';

// Import all controllers
import loyaltyController from '../controllers/loyalty.controller';
import affiliateController from '../controllers/affiliate.controller';
import livestreamController from '../controllers/livestream.controller';

const router = Router();

// ============================================
// LOYALTY & REWARDS ROUTES
// ============================================
const loyaltyRouter = Router();

// User routes
loyaltyRouter.get('/balance', authenticate, loyaltyController.getBalance);
loyaltyRouter.get('/transactions', authenticate, loyaltyController.getTransactions);
loyaltyRouter.get('/rewards', loyaltyController.getRewards);
loyaltyRouter.post('/rewards/:rewardId/redeem', authenticate, loyaltyController.redeemReward);
loyaltyRouter.get('/my-rewards', authenticate, loyaltyController.getMyRewards);
loyaltyRouter.post('/use-reward', authenticate, loyaltyController.useReward);
loyaltyRouter.get('/tiers', loyaltyController.getTiers);

// Admin routes
loyaltyRouter.post('/admin/tiers', authenticate, authorizeRoles('ADMIN'), loyaltyController.createTier);
loyaltyRouter.patch('/admin/tiers/:tierId', authenticate, authorizeRoles('ADMIN'), loyaltyController.updateTier);
loyaltyRouter.post('/admin/rewards', authenticate, authorizeRoles('ADMIN'), loyaltyController.createReward);
loyaltyRouter.patch('/admin/rewards/:rewardId', authenticate, authorizeRoles('ADMIN'), loyaltyController.updateReward);
loyaltyRouter.delete('/admin/rewards/:rewardId', authenticate, authorizeRoles('ADMIN'), loyaltyController.deleteReward);
loyaltyRouter.post('/admin/award-points', authenticate, authorizeRoles('ADMIN'), loyaltyController.awardPoints);

router.use('/loyalty', loyaltyRouter);

// ============================================
// AFFILIATE PROGRAM ROUTES
// ============================================
const affiliateRouter = Router();

// Public routes
affiliateRouter.post('/track-click', affiliateController.trackClick);

// User routes
affiliateRouter.post('/apply', authenticate, affiliateController.apply);
affiliateRouter.get('/me', authenticate, affiliateController.getMyAffiliate);
affiliateRouter.get('/dashboard', authenticate, affiliateController.getDashboard);
affiliateRouter.get('/commissions', authenticate, affiliateController.getCommissions);
affiliateRouter.patch('/profile', authenticate, affiliateController.updateProfile);

// Admin routes
affiliateRouter.get('/admin/pending', authenticate, authorizeRoles('ADMIN'), affiliateController.getPending);
affiliateRouter.get('/admin/all', authenticate, authorizeRoles('ADMIN'), affiliateController.getAll);
affiliateRouter.post('/admin/:affiliateId/approve', authenticate, authorizeRoles('ADMIN'), affiliateController.approve);
affiliateRouter.post('/admin/:affiliateId/reject', authenticate, authorizeRoles('ADMIN'), affiliateController.reject);
affiliateRouter.post('/admin/:affiliateId/suspend', authenticate, authorizeRoles('ADMIN'), affiliateController.suspend);
affiliateRouter.patch('/admin/:affiliateId/commission-rate', authenticate, authorizeRoles('ADMIN'), affiliateController.updateCommissionRate);
affiliateRouter.post('/admin/commissions/approve', authenticate, authorizeRoles('ADMIN'), affiliateController.approveCommissions);
affiliateRouter.post('/admin/commissions/pay', authenticate, authorizeRoles('ADMIN'), affiliateController.payCommissions);
affiliateRouter.get('/admin/top', authenticate, authorizeRoles('ADMIN'), affiliateController.getTopAffiliates);

router.use('/affiliates', affiliateRouter);

// ============================================
// LIVE STREAMING ROUTES
// ============================================
const livestreamRouter = Router();

// Public/User routes
livestreamRouter.get('/', livestreamController.getLiveStreams);
livestreamRouter.get('/:streamId', livestreamController.getStream);
livestreamRouter.post('/:streamId/join', authenticate, livestreamController.joinStream);
livestreamRouter.post('/views/:viewId/leave', authenticate, livestreamController.leaveStream);
livestreamRouter.post('/:streamId/comments', authenticate, livestreamController.postComment);
livestreamRouter.get('/:streamId/comments', livestreamController.getComments);

// Vendor routes
livestreamRouter.post('/create', authenticate, authorizeRoles('VENDOR'), livestreamController.createStream);
livestreamRouter.patch('/:streamId', authenticate, authorizeRoles('VENDOR'), livestreamController.updateStream);
livestreamRouter.post('/:streamId/start', authenticate, authorizeRoles('VENDOR'), livestreamController.startStream);
livestreamRouter.post('/:streamId/end', authenticate, authorizeRoles('VENDOR'), livestreamController.endStream);
livestreamRouter.get('/vendor/my-streams', authenticate, authorizeRoles('VENDOR'), livestreamController.getVendorStreams);
livestreamRouter.post('/:streamId/products', authenticate, authorizeRoles('VENDOR'), livestreamController.addProducts);
livestreamRouter.get('/:streamId/analytics', authenticate, authorizeRoles('VENDOR'), livestreamController.getAnalytics);

router.use('/livestreams', livestreamRouter);

// Export for use in app.ts
export default router;
