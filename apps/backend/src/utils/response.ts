import { Response } from 'express';
import { ApiResponse } from '@/types';

export class ApiResponseHelper {
  static success<T>(
    res: Response,
    data?: T,
    message = 'Success',
    statusCode = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data?: T, message = 'Created'): Response {
    return this.success(res, data, message, 201);
  }

  static error(
    res: Response,
    message = 'Error occurred',
    statusCode = 500,
    errors?: unknown
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    },
    message = 'Success'
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      meta,
    };
    return res.status(200).json(response);
  }
}
