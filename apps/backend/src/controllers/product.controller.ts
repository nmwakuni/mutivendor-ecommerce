import { Request, Response } from 'express';
import { productService } from '@/services/product.service';
import { ApiResponseHelper } from '@/utils/response';
import { ForbiddenError } from '@/middleware/error-handler';

export class ProductController {
  /**
   * Create product
   */
  async create(req: Request, res: Response) {
    const userId = req.user!.id;
    const vendorId = req.user!.vendorId;

    if (!vendorId) {
      throw new ForbiddenError('Only vendors can create products');
    }

    const product = await productService.create(vendorId, req.body);

    return ApiResponseHelper.created(res, product, 'Product created successfully');
  }

  /**
   * Get all products
   */
  async getAll(req: Request, res: Response) {
    const result = await productService.getAll(req.query);

    return ApiResponseHelper.paginated(
      res,
      result.products,
      result.meta,
      'Products fetched successfully'
    );
  }

  /**
   * Get product by ID or slug
   */
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    const product = await productService.getById(id, userId);

    return ApiResponseHelper.success(res, product);
  }

  /**
   * Update product
   */
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const vendorId = req.user!.vendorId;

    if (!vendorId) {
      throw new ForbiddenError('Only vendors can update products');
    }

    const product = await productService.update(id, vendorId, req.body);

    return ApiResponseHelper.success(res, product, 'Product updated successfully');
  }

  /**
   * Delete product
   */
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const vendorId = req.user!.vendorId;

    if (!vendorId) {
      throw new ForbiddenError('Only vendors can delete products');
    }

    const result = await productService.delete(id, vendorId);

    return ApiResponseHelper.success(res, result);
  }

  /**
   * Upload product images
   */
  async uploadImages(req: Request, res: Response) {
    const { id } = req.params;
    const vendorId = req.user!.vendorId;
    const files = req.files as Express.Multer.File[];

    if (!vendorId) {
      throw new ForbiddenError('Only vendors can upload product images');
    }

    if (!files || files.length === 0) {
      return ApiResponseHelper.error(res, 'No files provided', 400);
    }

    const product = await productService.uploadImages(id, vendorId, files);

    return ApiResponseHelper.success(res, product, 'Images uploaded successfully');
  }

  /**
   * Update stock
   */
  async updateStock(req: Request, res: Response) {
    const { id } = req.params;
    const { quantity, type } = req.body;
    const vendorId = req.user!.vendorId;

    if (!vendorId) {
      throw new ForbiddenError('Only vendors can update stock');
    }

    const product = await productService.updateStock(id, vendorId, quantity, type);

    return ApiResponseHelper.success(res, product, 'Stock updated successfully');
  }
}

export const productController = new ProductController();
