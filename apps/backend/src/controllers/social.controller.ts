import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import socialService from '../services/social.service';
import {
  createGiftRegistrySchema,
  shareProductSchema,
} from '../validations/social.validation';

class SocialController {
  // ============================================
  // GIFT REGISTRIES
  // ============================================

  /**
   * Create gift registry
   * POST /api/social/registries
   */
  createRegistry = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const data = createGiftRegistrySchema.parse(req.body);

    const registry = await socialService.createGiftRegistry(userId, data);

    res.status(201).json({
      success: true,
      data: registry,
    });
  });

  /**
   * Get user's gift registries
   * GET /api/social/registries
   */
  getMyRegistries = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const registries = await socialService.getUserGiftRegistries(userId);

    res.json({
      success: true,
      data: registries,
    });
  });

  /**
   * Get public gift registry by ID
   * GET /api/social/registries/:registryId
   */
  getRegistry = asyncHandler(async (req: Request, res: Response) => {
    const { registryId } = req.params;

    const registry = await socialService.getGiftRegistry(registryId);

    res.json({
      success: true,
      data: registry,
    });
  });

  /**
   * Update gift registry
   * PUT /api/social/registries/:registryId
   */
  updateRegistry = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { registryId } = req.params;
    const updates = req.body;

    const registry = await socialService.updateGiftRegistry(
      userId,
      registryId,
      updates
    );

    res.json({
      success: true,
      data: registry,
    });
  });

  /**
   * Delete gift registry
   * DELETE /api/social/registries/:registryId
   */
  deleteRegistry = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { registryId } = req.params;

    await socialService.deleteGiftRegistry(userId, registryId);

    res.json({
      success: true,
      message: 'Gift registry deleted',
    });
  });

  /**
   * Add product to gift registry
   * POST /api/social/registries/:registryId/products
   */
  addProductToRegistry = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { registryId } = req.params;
    const { productId, quantity, priority } = req.body;

    const item = await socialService.addProductToRegistry(
      userId,
      registryId,
      productId,
      quantity,
      priority
    );

    res.status(201).json({
      success: true,
      data: item,
    });
  });

  /**
   * Remove product from gift registry
   * DELETE /api/social/registries/:registryId/products/:itemId
   */
  removeProductFromRegistry = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const { registryId, itemId } = req.params;

      await socialService.removeProductFromRegistry(userId, registryId, itemId);

      res.json({
        success: true,
        message: 'Product removed from registry',
      });
    }
  );

  /**
   * Mark registry item as purchased
   * POST /api/social/registries/:registryId/items/:itemId/purchase
   */
  markItemPurchased = asyncHandler(async (req: Request, res: Response) => {
    const { registryId, itemId } = req.params;
    const { purchaserName, quantity } = req.body;

    const item = await socialService.markRegistryItemPurchased(
      registryId,
      itemId,
      purchaserName,
      quantity
    );

    res.json({
      success: true,
      data: item,
    });
  });

  /**
   * Search gift registries
   * GET /api/social/registries/search
   */
  searchRegistries = asyncHandler(async (req: Request, res: Response) => {
    const { query, type } = req.query;

    const registries = await socialService.searchGiftRegistries(
      query as string,
      type as string | undefined
    );

    res.json({
      success: true,
      data: registries,
    });
  });

  // ============================================
  // WISHLISTS
  // ============================================

  /**
   * Get user's wishlist
   * GET /api/social/wishlist
   */
  getWishlist = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const wishlist = await socialService.getUserWishlist(userId);

    res.json({
      success: true,
      data: wishlist,
    });
  });

  /**
   * Add product to wishlist
   * POST /api/social/wishlist
   */
  addToWishlist = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { productId } = req.body;

    const item = await socialService.addToWishlist(userId, productId);

    res.status(201).json({
      success: true,
      data: item,
    });
  });

  /**
   * Remove product from wishlist
   * DELETE /api/social/wishlist/:itemId
   */
  removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { itemId } = req.params;

    await socialService.removeFromWishlist(userId, itemId);

    res.json({
      success: true,
      message: 'Product removed from wishlist',
    });
  });

  /**
   * Get public wishlist by user ID
   * GET /api/social/wishlist/:userId/public
   */
  getPublicWishlist = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const wishlist = await socialService.getPublicWishlist(userId);

    res.json({
      success: true,
      data: wishlist,
    });
  });

  /**
   * Move wishlist item to cart
   * POST /api/social/wishlist/:itemId/move-to-cart
   */
  moveToCart = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { itemId } = req.params;

    await socialService.moveWishlistToCart(userId, itemId);

    res.json({
      success: true,
      message: 'Product moved to cart',
    });
  });

  // ============================================
  // PRODUCT SHARING
  // ============================================

  /**
   * Share product
   * POST /api/social/share
   */
  shareProduct = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { productId, platform } = shareProductSchema.parse(req.body);

    const share = await socialService.shareProduct(userId, productId, platform);

    res.json({
      success: true,
      data: share,
    });
  });

  /**
   * Get product share count
   * GET /api/social/products/:productId/shares
   */
  getProductShares = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;

    const shares = await socialService.getProductShareCount(productId);

    res.json({
      success: true,
      data: shares,
    });
  });

  /**
   * Get user's shared products
   * GET /api/social/shares
   */
  getMyShares = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const shares = await socialService.getUserShares(userId);

    res.json({
      success: true,
      data: shares,
    });
  });

  // ============================================
  // PRODUCT COLLECTIONS
  // ============================================

  /**
   * Create product collection
   * POST /api/social/collections
   */
  createCollection = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { name, description, isPublic } = req.body;

    const collection = await socialService.createCollection(
      userId,
      name,
      description,
      isPublic
    );

    res.status(201).json({
      success: true,
      data: collection,
    });
  });

  /**
   * Get user's collections
   * GET /api/social/collections
   */
  getMyCollections = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const collections = await socialService.getUserCollections(userId);

    res.json({
      success: true,
      data: collections,
    });
  });

  /**
   * Add product to collection
   * POST /api/social/collections/:collectionId/products
   */
  addToCollection = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { collectionId } = req.params;
    const { productId } = req.body;

    await socialService.addProductToCollection(userId, collectionId, productId);

    res.json({
      success: true,
      message: 'Product added to collection',
    });
  });

  /**
   * Remove product from collection
   * DELETE /api/social/collections/:collectionId/products/:productId
   */
  removeFromCollection = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { collectionId, productId } = req.params;

    await socialService.removeProductFromCollection(
      userId,
      collectionId,
      productId
    );

    res.json({
      success: true,
      message: 'Product removed from collection',
    });
  });
}

export default new SocialController();
