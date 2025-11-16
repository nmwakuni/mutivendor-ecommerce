import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { imagekitService } from '../services/imagekit.service';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validations/category.validation';
import { ApiError } from '../middleware/error-handler';

export const categoryController = {
  async getAll(req: Request, res: Response) {
    const { isActive, parentId } = req.query;

    const filters: any = {};

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    if (parentId !== undefined) {
      filters.parentId = parentId === 'null' ? null : String(parentId);
    }

    const categories = await categoryService.getAll(filters);

    res.json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
    });
  },

  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const category = await categoryService.getById(id);

    res.json({
      success: true,
      message: 'Category retrieved successfully',
      data: category,
    });
  },

  async getBySlug(req: Request, res: Response) {
    const { slug } = req.params;

    const category = await categoryService.getBySlug(slug);

    res.json({
      success: true,
      message: 'Category retrieved successfully',
      data: category,
    });
  },

  async create(req: Request, res: Response) {
    const validatedData = createCategorySchema.parse(req.body);

    const category = await categoryService.create(validatedData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updateCategorySchema.parse(req.body);

    const category = await categoryService.update(id, validatedData);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  },

  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await categoryService.delete(id);

    res.json({
      success: true,
      message: result.message,
    });
  },

  async uploadImage(req: Request, res: Response) {
    const { id } = req.params;

    if (!req.file) {
      throw new ApiError(400, 'Image file is required');
    }

    // Upload to ImageKit
    const uploadResult = await imagekitService.upload({
      file: req.file.buffer,
      fileName: `category-${id}-${Date.now()}.${req.file.mimetype.split('/')[1]}`,
      folder: '/categories',
      tags: ['category', id],
    });

    // Update category with image URL
    const category = await categoryService.uploadImage(id, uploadResult.url);

    res.json({
      success: true,
      message: 'Category image uploaded successfully',
      data: category,
    });
  },
};
