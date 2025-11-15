import { prisma } from '@/config/database';
import { slugify } from '@/utils/slugify';
import { getPaginationParams, calculatePagination } from '@/utils/pagination';
import { NotFoundError, ForbiddenError, ConflictError } from '@/middleware/error-handler';
import { imagekitService } from '@/services/imagekit.service';
import { inngest } from '@/inngest/client';
import { logger } from '@/config/logger';
import { Prisma } from '@prisma/client';

interface CreateProductData {
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  sku: string;
  barcode?: string;
  trackInventory: boolean;
  stock: number;
  lowStockThreshold: number;
  categoryId: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  isFeatured: boolean;
}

export class ProductService {
  /**
   * Create product
   */
  async create(vendorId: string, data: CreateProductData) {
    // Check if SKU already exists
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      throw new ConflictError('SKU already exists');
    }

    // Generate slug
    const slug = slugify(data.name);

    // Create product
    const product = await prisma.product.create({
      data: {
        ...data,
        slug: `${slug}-${Date.now()}`,
        vendorId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
        category: true,
      },
    });

    logger.info('Product created', { productId: product.id, vendorId });

    return product;
  }

  /**
   * Get all products with filters and pagination
   */
  async getAll(query: Record<string, unknown>) {
    const {
      page,
      pageSize,
      categoryId,
      vendorId,
      search,
      minPrice,
      maxPrice,
      isActive,
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const { skip, take, meta } = calculatePagination(
      0,
      parseInt(String(page || 1), 10),
      parseInt(String(pageSize || 20), 10)
    );

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      ...(categoryId && { categoryId: String(categoryId) }),
      ...(vendorId && { vendorId: String(vendorId) }),
      ...(search && {
        OR: [
          { name: { contains: String(search), mode: 'insensitive' } },
          { description: { contains: String(search), mode: 'insensitive' } },
        ],
      }),
      ...(minPrice && { price: { gte: parseFloat(String(minPrice)) } }),
      ...(maxPrice && { price: { lte: parseFloat(String(maxPrice)) } }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(isFeatured !== undefined && { isFeatured: isFeatured === 'true' }),
    };

    // Get total count
    const total = await prisma.product.count({ where });

    // Calculate pagination meta
    const paginationMeta = calculatePagination(total, meta.page, meta.pageSize);

    // Get products
    const products = await prisma.product.findMany({
      where,
      skip: paginationMeta.skip,
      take: paginationMeta.take,
      orderBy: { [String(sortBy)]: sortOrder },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
            rating: true,
          },
        },
        category: true,
      },
    });

    return {
      products,
      meta: paginationMeta.meta,
    };
  }

  /**
   * Get product by ID or slug
   */
  async getById(identifier: string, userId?: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
            rating: true,
            totalReviews: true,
          },
        },
        category: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Increment view count
    await prisma.product.update({
      where: { id: product.id },
      data: { views: { increment: 1 } },
    });

    // Track analytics
    await inngest.send({
      name: 'analytics/product.viewed',
      data: {
        productId: product.id,
        userId,
        timestamp: new Date().toISOString(),
      },
    });

    return product;
  }

  /**
   * Update product
   */
  async update(productId: string, vendorId: string, data: Partial<CreateProductData>) {
    // Check if product exists and belongs to vendor
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenError('You can only update your own products');
    }

    // Update slug if name changed
    const updateData: any = { ...data };
    if (data.name) {
      updateData.slug = `${slugify(data.name)}-${Date.now()}`;
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
        category: true,
      },
    });

    logger.info('Product updated', { productId, vendorId });

    return updatedProduct;
  }

  /**
   * Delete product
   */
  async delete(productId: string, vendorId: string) {
    // Check if product exists and belongs to vendor
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenError('You can only delete your own products');
    }

    // Delete product images from ImageKit
    if (product.images.length > 0) {
      // Extract file IDs from URLs if stored
      // For now, just log
      logger.info('Deleting product images', { productId });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    logger.info('Product deleted', { productId, vendorId });

    return { message: 'Product deleted successfully' };
  }

  /**
   * Upload product images
   */
  async uploadImages(productId: string, vendorId: string, files: Express.Multer.File[]) {
    // Check if product exists and belongs to vendor
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenError('You can only update your own products');
    }

    // Upload images to ImageKit
    const uploadPromises = files.map((file) =>
      imagekitService.uploadProductImage({
        file: file.buffer,
        fileName: file.originalname,
        productId,
      })
    );

    const uploadResults = await Promise.all(uploadPromises);
    const imageUrls = uploadResults.map((result) => result.url);

    // Update product with new images
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        images: [...product.images, ...imageUrls],
        thumbnail: product.thumbnail || imageUrls[0],
      },
    });

    logger.info('Product images uploaded', { productId, count: files.length });

    return updatedProduct;
  }

  /**
   * Update stock
   */
  async updateStock(productId: string, vendorId: string, quantity: number, type: 'add' | 'subtract') {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenError('You can only update your own products');
    }

    const newStock = type === 'add' ? product.stock + quantity : product.stock - quantity;

    if (newStock < 0) {
      throw new ConflictError('Insufficient stock');
    }

    // Trigger inventory update via Inngest
    await inngest.send({
      name: 'inventory/update',
      data: {
        productId,
        quantity: type === 'add' ? quantity : -quantity,
        type: 'ADJUSTMENT',
      },
    });

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    return updatedProduct;
  }
}

export const productService = new ProductService();
