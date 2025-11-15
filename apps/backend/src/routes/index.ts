import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth';

// Import all controllers
import loyaltyController from '../controllers/loyalty.controller';
import affiliateController from '../controllers/affiliate.controller';
import livestreamController from '../controllers/livestream.controller';
import chatbotController from '../controllers/chatbot.controller';
import socialController from '../controllers/social.controller';
import escrowController from '../controllers/escrow.controller';
import verificationController from '../controllers/verification.controller';
import notificationController from '../controllers/notification.controller';
import vendorAnalyticsController from '../controllers/vendor-analytics.controller';

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

// ============================================
// CHATBOT ROUTES
// ============================================
const chatbotRouter = Router();

// User routes
chatbotRouter.post('/message', authenticate, chatbotController.sendMessage);
chatbotRouter.get('/history', authenticate, chatbotController.getHistory);
chatbotRouter.get('/sessions', authenticate, chatbotController.getSessions);
chatbotRouter.delete('/session/:sessionId', authenticate, chatbotController.clearSession);
chatbotRouter.get('/suggestions', authenticate, chatbotController.getSuggestions);
chatbotRouter.post('/rate/:messageId', authenticate, chatbotController.rateResponse);

// Admin routes
chatbotRouter.get('/admin/analytics', authenticate, authorizeRoles('ADMIN'), chatbotController.getAnalytics);
chatbotRouter.get('/admin/conversations', authenticate, authorizeRoles('ADMIN'), chatbotController.getAllConversations);
chatbotRouter.get('/admin/problem-queries', authenticate, authorizeRoles('ADMIN'), chatbotController.getProblemQueries);

router.use('/chatbot', chatbotRouter);

// ============================================
// SOCIAL SHOPPING ROUTES
// ============================================
const socialRouter = Router();

// Gift registry routes
socialRouter.post('/registries', authenticate, socialController.createRegistry);
socialRouter.get('/registries', authenticate, socialController.getMyRegistries);
socialRouter.get('/registries/search', socialController.searchRegistries);
socialRouter.get('/registries/:registryId', socialController.getRegistry);
socialRouter.put('/registries/:registryId', authenticate, socialController.updateRegistry);
socialRouter.delete('/registries/:registryId', authenticate, socialController.deleteRegistry);
socialRouter.post('/registries/:registryId/products', authenticate, socialController.addProductToRegistry);
socialRouter.delete('/registries/:registryId/products/:itemId', authenticate, socialController.removeProductFromRegistry);
socialRouter.post('/registries/:registryId/items/:itemId/purchase', socialController.markItemPurchased);

// Wishlist routes
socialRouter.get('/wishlist', authenticate, socialController.getWishlist);
socialRouter.post('/wishlist', authenticate, socialController.addToWishlist);
socialRouter.delete('/wishlist/:itemId', authenticate, socialController.removeFromWishlist);
socialRouter.get('/wishlist/:userId/public', socialController.getPublicWishlist);
socialRouter.post('/wishlist/:itemId/move-to-cart', authenticate, socialController.moveToCart);

// Product sharing routes
socialRouter.post('/share', authenticate, socialController.shareProduct);
socialRouter.get('/products/:productId/shares', socialController.getProductShares);
socialRouter.get('/shares', authenticate, socialController.getMyShares);

// Collection routes
socialRouter.post('/collections', authenticate, socialController.createCollection);
socialRouter.get('/collections', authenticate, socialController.getMyCollections);
socialRouter.post('/collections/:collectionId/products', authenticate, socialController.addToCollection);
socialRouter.delete('/collections/:collectionId/products/:productId', authenticate, socialController.removeFromCollection);

router.use('/social', socialRouter);

// ============================================
// ESCROW & DISPUTES ROUTES
// ============================================
const escrowRouter = Router();

// User routes
escrowRouter.get('/order/:orderId', authenticate, escrowController.getOrderEscrow);
escrowRouter.get('/buyer', authenticate, escrowController.getBuyerEscrows);
escrowRouter.get('/vendor', authenticate, escrowController.getVendorEscrows);
escrowRouter.post('/:escrowId/release', authenticate, escrowController.releaseEscrow);
escrowRouter.post('/:escrowId/refund', authenticate, escrowController.requestRefund);

// Dispute routes
escrowRouter.post('/disputes', authenticate, escrowController.raiseDispute);
escrowRouter.get('/disputes', authenticate, escrowController.getMyDisputes);
escrowRouter.get('/disputes/vendor', authenticate, escrowController.getVendorDisputes);
escrowRouter.get('/disputes/:disputeId', authenticate, escrowController.getDispute);
escrowRouter.post('/disputes/:disputeId/evidence', authenticate, escrowController.addEvidence);
escrowRouter.post('/disputes/:disputeId/respond', authenticate, escrowController.respondToDispute);

// Admin routes
escrowRouter.get('/admin/disputes', authenticate, authorizeRoles('ADMIN'), escrowController.getAllDisputes);
escrowRouter.post('/admin/disputes/:disputeId/resolve', authenticate, authorizeRoles('ADMIN'), escrowController.resolveDispute);
escrowRouter.get('/admin/analytics', authenticate, authorizeRoles('ADMIN'), escrowController.getAnalytics);
escrowRouter.get('/admin/pending-releases', authenticate, authorizeRoles('ADMIN'), escrowController.getPendingReleases);
escrowRouter.post('/admin/:escrowId/release', authenticate, authorizeRoles('ADMIN'), escrowController.adminReleaseEscrow);
escrowRouter.post('/admin/:escrowId/refund', authenticate, authorizeRoles('ADMIN'), escrowController.adminRefundEscrow);

router.use('/escrow', escrowRouter);

// ============================================
// VENDOR VERIFICATION ROUTES
// ============================================
const verificationRouter = Router();

// Vendor routes
verificationRouter.post('/submit', authenticate, verificationController.submitVerification);
verificationRouter.get('/status', authenticate, verificationController.getVerificationStatus);
verificationRouter.post('/documents', authenticate, verificationController.uploadDocument);
verificationRouter.get('/:verificationId/documents', authenticate, verificationController.getDocuments);
verificationRouter.delete('/documents/:documentId', authenticate, verificationController.deleteDocument);
verificationRouter.get('/requirements', verificationController.getRequirements);

// Admin routes
verificationRouter.get('/admin/pending', authenticate, authorizeRoles('ADMIN'), verificationController.getPendingVerifications);
verificationRouter.get('/admin/all', authenticate, authorizeRoles('ADMIN'), verificationController.getAllVerifications);
verificationRouter.get('/admin/:verificationId', authenticate, authorizeRoles('ADMIN'), verificationController.getVerificationDetails);
verificationRouter.post('/admin/:verificationId/approve', authenticate, authorizeRoles('ADMIN'), verificationController.approveVerification);
verificationRouter.post('/admin/:verificationId/reject', authenticate, authorizeRoles('ADMIN'), verificationController.rejectVerification);
verificationRouter.post('/admin/:verificationId/request-documents', authenticate, authorizeRoles('ADMIN'), verificationController.requestMoreDocuments);
verificationRouter.get('/admin/analytics', authenticate, authorizeRoles('ADMIN'), verificationController.getAnalytics);
verificationRouter.post('/admin/:verificationId/revoke', authenticate, authorizeRoles('ADMIN'), verificationController.revokeVerification);
verificationRouter.get('/admin/expiring', authenticate, authorizeRoles('ADMIN'), verificationController.getExpiringVerifications);

router.use('/verification', verificationRouter);

// ============================================
// NOTIFICATION ROUTES
// ============================================
const notificationRouter = Router();

// User routes
notificationRouter.get('/', authenticate, notificationController.getNotifications);
notificationRouter.get('/unread-count', authenticate, notificationController.getUnreadCount);
notificationRouter.put('/:notificationId/read', authenticate, notificationController.markAsRead);
notificationRouter.put('/read-all', authenticate, notificationController.markAllAsRead);
notificationRouter.delete('/:notificationId', authenticate, notificationController.deleteNotification);
notificationRouter.delete('/clear-all', authenticate, notificationController.clearAllNotifications);

// Preferences routes
notificationRouter.get('/preferences', authenticate, notificationController.getPreferences);
notificationRouter.put('/preferences', authenticate, notificationController.updatePreferences);

// Price alerts routes
notificationRouter.post('/price-alerts', authenticate, notificationController.createPriceAlert);
notificationRouter.get('/price-alerts', authenticate, notificationController.getPriceAlerts);
notificationRouter.delete('/price-alerts/:alertId', authenticate, notificationController.deletePriceAlert);

// Device registration routes
notificationRouter.post('/devices', authenticate, notificationController.registerDevice);
notificationRouter.delete('/devices/:token', authenticate, notificationController.unregisterDevice);

// Admin routes
notificationRouter.post('/admin/send', authenticate, authorizeRoles('ADMIN'), notificationController.sendNotification);
notificationRouter.post('/admin/broadcast', authenticate, authorizeRoles('ADMIN'), notificationController.broadcastNotification);
notificationRouter.get('/admin/analytics', authenticate, authorizeRoles('ADMIN'), notificationController.getAnalytics);
notificationRouter.get('/admin/templates', authenticate, authorizeRoles('ADMIN'), notificationController.getTemplates);
notificationRouter.post('/admin/templates', authenticate, authorizeRoles('ADMIN'), notificationController.createTemplate);

router.use('/notifications', notificationRouter);

// ============================================
// VENDOR ANALYTICS ROUTES
// ============================================
const vendorAnalyticsRouter = Router();

// Vendor routes
vendorAnalyticsRouter.get('/dashboard', authenticate, vendorAnalyticsController.getDashboard);
vendorAnalyticsRouter.get('/sales', authenticate, vendorAnalyticsController.getSalesAnalytics);
vendorAnalyticsRouter.get('/forecast', authenticate, vendorAnalyticsController.getRevenueForecast);
vendorAnalyticsRouter.get('/products', authenticate, vendorAnalyticsController.getProductPerformance);
vendorAnalyticsRouter.get('/customers', authenticate, vendorAnalyticsController.getCustomerAnalytics);
vendorAnalyticsRouter.get('/customers/top', authenticate, vendorAnalyticsController.getTopCustomers);
vendorAnalyticsRouter.get('/traffic', authenticate, vendorAnalyticsController.getTrafficAnalytics);
vendorAnalyticsRouter.get('/conversions', authenticate, vendorAnalyticsController.getConversionAnalytics);
vendorAnalyticsRouter.get('/inventory', authenticate, vendorAnalyticsController.getInventoryAnalytics);
vendorAnalyticsRouter.get('/reviews', authenticate, vendorAnalyticsController.getReviewAnalytics);
vendorAnalyticsRouter.get('/comparative', authenticate, vendorAnalyticsController.getComparativeAnalytics);
vendorAnalyticsRouter.get('/metrics', authenticate, vendorAnalyticsController.getPerformanceMetrics);
vendorAnalyticsRouter.get('/export', authenticate, vendorAnalyticsController.exportReport);

// Admin routes
vendorAnalyticsRouter.get('/admin/platform', authenticate, authorizeRoles('ADMIN'), vendorAnalyticsController.getPlatformAnalytics);
vendorAnalyticsRouter.get('/admin/top-vendors', authenticate, authorizeRoles('ADMIN'), vendorAnalyticsController.getTopVendors);
vendorAnalyticsRouter.get('/admin/vendor/:vendorId', authenticate, authorizeRoles('ADMIN'), vendorAnalyticsController.getVendorAnalytics);

router.use('/vendor-analytics', vendorAnalyticsRouter);

// Export for use in app.ts
export default router;
