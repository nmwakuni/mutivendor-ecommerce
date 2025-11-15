import { prisma } from '../config/database';
import { CreateReviewData, UpdateReviewData } from '../validations/review.validation';
import { ApiError } from '../middleware/error-handler';

interface ReviewFilters {
  productId?: string;
  userId?: string;
  rating?: number;
  isApproved?: boolean;
  page?: number;
  pageSize?: number;
}

class ReviewService {
  async getAll(filters?: ReviewFilters) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.rating) {
      where.rating = filters.rating;
    }

    if (filters?.isApproved !== undefined) {
      where.isApproved = filters.isApproved;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string) {
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    return review;
  }

  async create(userId: string, data: CreateReviewData) {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Check if user has already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId: data.productId,
          userId,
        },
      },
    });

    if (existingReview) {
      throw new ApiError(400, 'You have already reviewed this product');
    }

    // Check if user has purchased this product (verified purchase)
    const order = await prisma.order.findFirst({
      where: {
        userId,
        status: 'DELIVERED',
        items: {
          some: {
            productId: data.productId,
          },
        },
      },
    });

    const isVerified = !!order;

    // Create review
    const review = await prisma.review.create({
      data: {
        userId,
        productId: data.productId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        isVerified,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Update product rating and review count
    await this.updateProductRating(data.productId);

    return review;
  }

  async update(id: string, userId: string, data: UpdateReviewData) {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    if (review.userId !== userId) {
      throw new ApiError(403, 'You can only update your own reviews');
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Update product rating
    await this.updateProductRating(review.productId);

    return updatedReview;
  }

  async delete(id: string, userId: string, userRole: string) {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    // Only the review owner or admin can delete
    if (review.userId !== userId && userRole !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to delete this review');
    }

    const productId = review.productId;

    await prisma.review.delete({
      where: { id },
    });

    // Update product rating
    await this.updateProductRating(productId);

    return { message: 'Review deleted successfully' };
  }

  async uploadImages(id: string, userId: string, imageUrls: string[]) {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    if (review.userId !== userId) {
      throw new ApiError(403, 'You can only upload images to your own reviews');
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        images: {
          push: imageUrls,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return updatedReview;
  }

  async markHelpful(id: string) {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        helpfulCount: {
          increment: 1,
        },
      },
    });

    return updatedReview;
  }

  // Admin functions
  async approve(id: string) {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        isApproved: true,
      },
    });

    return updatedReview;
  }

  async reject(id: string) {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        isApproved: false,
      },
    });

    return updatedReview;
  }

  // Helper function to update product rating
  private async updateProductRating(productId: string) {
    const reviews = await prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
      },
      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews,
      },
    });
  }
}

export const reviewService = new ReviewService();
