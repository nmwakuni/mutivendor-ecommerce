import { Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { imagekitService } from '../services/imagekit.service';
import {
  createReviewSchema,
  updateReviewSchema,
  getReviewsSchema,
} from '../validations/review.validation';
import { ApiError } from '../middleware/error-handler';

export const reviewController = {
  async getAll(req: Request, res: Response) {
    const validatedQuery = getReviewsSchema.parse(req.query);

    const result = await reviewService.getAll(validatedQuery);

    res.json({
      success: true,
      message: 'Reviews retrieved successfully',
      data: result.reviews,
      meta: result.meta,
    });
  },

  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const review = await reviewService.getById(id);

    res.json({
      success: true,
      message: 'Review retrieved successfully',
      data: review,
    });
  },

  async create(req: Request, res: Response) {
    const validatedData = createReviewSchema.parse(req.body);
    const userId = req.user!.id;

    const review = await reviewService.create(userId, validatedData);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updateReviewSchema.parse(req.body);
    const userId = req.user!.id;

    const review = await reviewService.update(id, userId, validatedData);

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  },

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await reviewService.delete(id, userId, userRole);

    res.json({
      success: true,
      message: result.message,
    });
  },

  async uploadImages(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new ApiError(400, 'At least one image is required');
    }

    // Upload images to ImageKit
    const uploadPromises = req.files.map((file) =>
      imagekitService.upload({
        file: file.buffer,
        fileName: `review-${id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.mimetype.split('/')[1]}`,
        folder: '/reviews',
        tags: ['review', id],
      })
    );

    const uploadResults = await Promise.all(uploadPromises);
    const imageUrls = uploadResults.map((result) => result.url);

    // Update review with image URLs
    const review = await reviewService.uploadImages(id, userId, imageUrls);

    res.json({
      success: true,
      message: 'Review images uploaded successfully',
      data: review,
    });
  },

  async markHelpful(req: Request, res: Response) {
    const { id } = req.params;

    const review = await reviewService.markHelpful(id);

    res.json({
      success: true,
      message: 'Review marked as helpful',
      data: review,
    });
  },

  // Admin functions
  async approve(req: Request, res: Response) {
    const { id } = req.params;

    const review = await reviewService.approve(id);

    res.json({
      success: true,
      message: 'Review approved successfully',
      data: review,
    });
  },

  async reject(req: Request, res: Response) {
    const { id } = req.params;

    const review = await reviewService.reject(id);

    res.json({
      success: true,
      message: 'Review rejected successfully',
      data: review,
    });
  },
};
