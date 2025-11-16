import { Request, Response } from 'express';
import { orderService } from '@/services/order.service';
import { ApiResponseHelper } from '@/utils/response';

export class OrderController {
  /**
   * Create order
   */
  async create(req: Request, res: Response) {
    const userId = req.user!.id;

    const result = await orderService.create(userId, req.body);

    return ApiResponseHelper.created(
      res,
      result,
      'Order created successfully. Please complete M-Pesa payment on your phone.'
    );
  }

  /**
   * Get order by ID
   */
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const order = await orderService.getById(id, userId, userRole);

    return ApiResponseHelper.success(res, order);
  }

  /**
   * Get all orders
   */
  async getAll(req: Request, res: Response) {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { page, pageSize, status, paymentStatus, vendorId, sortBy, sortOrder } = req.query;

    const result = await orderService.getAll(userId, userRole, {
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      status: status as string,
      paymentStatus: paymentStatus as string,
      vendorId: vendorId as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    return ApiResponseHelper.paginated(res, result.orders, result.meta);
  }

  /**
   * Update order status (vendor)
   */
  async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;
    const { status, vendorNotes } = req.body;

    const order = await orderService.updateStatus(id, userId, status, vendorNotes);

    return ApiResponseHelper.success(res, order, 'Order status updated successfully');
  }

  /**
   * Cancel order (customer)
   */
  async cancel(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const order = await orderService.cancel(id, userId);

    return ApiResponseHelper.success(res, order, 'Order cancelled successfully');
  }
}

export const orderController = new OrderController();
