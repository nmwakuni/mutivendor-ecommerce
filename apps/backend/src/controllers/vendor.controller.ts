import { Request, Response } from 'express';
import { vendorService } from '@/services/vendor.service';
import { ApiResponseHelper } from '@/utils/response';

export class VendorController {
  /**
   * Apply to become a vendor
   */
  async apply(req: Request, res: Response) {
    const userId = req.user!.id;

    const vendor = await vendorService.applyAsVendor(userId, req.body);

    return ApiResponseHelper.created(
      res,
      vendor,
      'Vendor application submitted successfully. Awaiting admin approval.'
    );
  }

  /**
   * Get vendor by ID
   */
  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const vendor = await vendorService.getById(id);

    return ApiResponseHelper.success(res, vendor);
  }

  /**
   * Get current vendor profile
   */
  async getProfile(req: Request, res: Response) {
    const userId = req.user!.id;

    const vendor = await vendorService.getByUserId(userId);

    return ApiResponseHelper.success(res, vendor);
  }

  /**
   * Get all vendors (admin)
   */
  async getAll(req: Request, res: Response) {
    const { status, search, page, pageSize } = req.query;

    const result = await vendorService.getAll({
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    return ApiResponseHelper.paginated(res, result.vendors, result.meta);
  }

  /**
   * Update vendor
   */
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const vendor = await vendorService.update(id, userId, req.body);

    return ApiResponseHelper.success(res, vendor, 'Vendor updated successfully');
  }

  /**
   * Approve vendor (admin)
   */
  async approve(req: Request, res: Response) {
    const { vendorId, commissionRate } = req.body;

    const vendor = await vendorService.approve(vendorId, commissionRate);

    return ApiResponseHelper.success(res, vendor, 'Vendor approved successfully');
  }

  /**
   * Reject vendor (admin)
   */
  async reject(req: Request, res: Response) {
    const { vendorId, reason } = req.body;

    const vendor = await vendorService.reject(vendorId, reason);

    return ApiResponseHelper.success(res, vendor, 'Vendor rejected');
  }

  /**
   * Suspend vendor (admin)
   */
  async suspend(req: Request, res: Response) {
    const { id } = req.params;

    const vendor = await vendorService.suspend(id);

    return ApiResponseHelper.success(res, vendor, 'Vendor suspended');
  }

  /**
   * Get vendor statistics
   */
  async getStatistics(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const stats = await vendorService.getStatistics(id, userId);

    return ApiResponseHelper.success(res, stats);
  }
}

export const vendorController = new VendorController();
