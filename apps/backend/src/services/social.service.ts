import { prisma } from '../lib/prisma';
import { GiftRegistryType, GiftRegistryPrivacy, SharePlatform, GiftItemStatus } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

class SocialService {
  // ============================================
  // GIFT REGISTRY
  // ============================================

  /**
   * Create gift registry
   */
  async createRegistry(userId: string, data: {
    name: string;
    type: GiftRegistryType;
    description?: string;
    eventDate: Date;
    privacy?: GiftRegistryPrivacy;
    shippingAddressId?: string;
  }) {
    const slug = await this.generateUniqueSlug(data.name);

    const registry = await prisma.giftRegistry.create({
      data: {
        userId,
        ...data,
        slug,
        privacy: data.privacy || GiftRegistryPrivacy.UNLISTED,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        shippingAddress: true,
      },
    });

    return registry;
  }

  /**
   * Get registry by slug
   */
  async getRegistryBySlug(slug: string) {
    const registry = await prisma.giftRegistry.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                vendor: {
                  select: {
                    businessName: true,
                  },
                },
              },
            },
          },
          orderBy: { priority: 'desc' },
        },
        shippingAddress: true,
      },
    });

    if (!registry) {
      throw new ApiError(404, 'Registry not found');
    }

    return registry;
  }

  /**
   * Get user's registries
   */
  async getUserRegistries(userId: string) {
    const registries = await prisma.giftRegistry.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { eventDate: 'desc' },
    });

    return registries;
  }

  /**
   * Add item to registry
   */
  async addItemToRegistry(
    registryId: string,
    userId: string,
    productId: string,
    quantity = 1,
    priority = 0
  ) {
    // Verify registry belongs to user
    const registry = await prisma.giftRegistry.findUnique({
      where: { id: registryId },
    });

    if (!registry) {
      throw new ApiError(404, 'Registry not found');
    }

    if (registry.userId !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    // Check if item already exists
    const existing = await prisma.giftRegistryItem.findUnique({
      where: {
        registryId_productId: {
          registryId,
          productId,
        },
      },
    });

    if (existing) {
      // Update quantity
      const item = await prisma.giftRegistryItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
        },
        include: {
          product: true,
        },
      });

      return item;
    }

    const item = await prisma.giftRegistryItem.create({
      data: {
        registryId,
        productId,
        quantity,
        priority,
      },
      include: {
        product: true,
      },
    });

    return item;
  }

  /**
   * Remove item from registry
   */
  async removeItemFromRegistry(
    registryId: string,
    userId: string,
    productId: string
  ) {
    // Verify registry belongs to user
    const registry = await prisma.giftRegistry.findUnique({
      where: { id: registryId },
    });

    if (!registry) {
      throw new ApiError(404, 'Registry not found');
    }

    if (registry.userId !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    await prisma.giftRegistryItem.delete({
      where: {
        registryId_productId: {
          registryId,
          productId,
        },
      },
    });
  }

  /**
   * Mark item as purchased (by gift giver)
   */
  async purchaseRegistryItem(
    slug: string,
    productId: string,
    quantity: number
  ) {
    const registry = await prisma.giftRegistry.findUnique({
      where: { slug },
    });

    if (!registry) {
      throw new ApiError(404, 'Registry not found');
    }

    const item = await prisma.giftRegistryItem.findUnique({
      where: {
        registryId_productId: {
          registryId: registry.id,
          productId,
        },
      },
    });

    if (!item) {
      throw new ApiError(404, 'Item not found in registry');
    }

    const newPurchased = item.purchased + quantity;

    let status = GiftItemStatus.NEEDED;
    if (newPurchased >= item.quantity) {
      status = GiftItemStatus.FULFILLED;
    } else if (newPurchased > 0) {
      status = GiftItemStatus.PARTIALLY_FULFILLED;
    }

    const updated = await prisma.giftRegistryItem.update({
      where: { id: item.id },
      data: {
        purchased: newPurchased,
        status,
      },
      include: {
        product: true,
      },
    });

    return updated;
  }

  /**
   * Update registry
   */
  async updateRegistry(
    registryId: string,
    userId: string,
    data: Partial<{
      name: string;
      description: string;
      eventDate: Date;
      privacy: GiftRegistryPrivacy;
      shippingAddressId: string;
    }>
  ) {
    const registry = await prisma.giftRegistry.findUnique({
      where: { id: registryId },
    });

    if (!registry) {
      throw new ApiError(404, 'Registry not found');
    }

    if (registry.userId !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    const updated = await prisma.giftRegistry.update({
      where: { id: registryId },
      data,
    });

    return updated;
  }

  /**
   * Delete registry
   */
  async deleteRegistry(registryId: string, userId: string) {
    const registry = await prisma.giftRegistry.findUnique({
      where: { id: registryId },
    });

    if (!registry) {
      throw new ApiError(404, 'Registry not found');
    }

    if (registry.userId !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    await prisma.giftRegistry.delete({
      where: { id: registryId },
    });
  }

  /**
   * Search registries
   */
  async searchRegistries(query: string, type?: GiftRegistryType) {
    const registries = await prisma.giftRegistry.findMany({
      where: {
        privacy: { in: [GiftRegistryPrivacy.PUBLIC, GiftRegistryPrivacy.UNLISTED] },
        ...(type && { type }),
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      take: 20,
    });

    return registries;
  }

  // ============================================
  // PRODUCT SHARING
  // ============================================

  /**
   * Share product
   */
  async shareProduct(
    productId: string,
    platform: SharePlatform,
    userId?: string
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new ApiError(404, 'Product not found');
    }

    const share = await prisma.productShare.create({
      data: {
        productId,
        platform,
        userId,
      },
    });

    return share;
  }

  /**
   * Get product share count
   */
  async getProductShareCount(productId: string) {
    const total = await prisma.productShare.count({
      where: { productId },
    });

    const byPlatform = await prisma.productShare.groupBy({
      by: ['platform'],
      where: { productId },
      _count: true,
    });

    return {
      total,
      byPlatform: byPlatform.map((item) => ({
        platform: item.platform,
        count: item._count,
      })),
    };
  }

  /**
   * Get trending shared products
   */
  async getTrendingSharedProducts(days = 7, limit = 10) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const shares = await prisma.productShare.groupBy({
      by: ['productId'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: limit,
    });

    const productIds = shares.map((s) => s.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        vendor: {
          select: {
            businessName: true,
          },
        },
      },
    });

    return products.map((product) => ({
      ...product,
      shareCount: shares.find((s) => s.productId === product.id)?._count || 0,
    }));
  }

  // ============================================
  // HELPERS
  // ============================================

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.giftRegistry.findUnique({
        where: { slug },
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}

export default new SocialService();
