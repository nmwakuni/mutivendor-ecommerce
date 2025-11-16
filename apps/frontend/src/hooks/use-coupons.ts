import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';

// Types
export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  description?: string;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usagePerUser?: number;
  isActive: boolean;
  startDate?: string;
  expiryDate?: string;
  timesUsed: number;
  category?: {
    id: string;
    name: string;
  };
  vendor?: {
    id: string;
    businessName: string;
  };
}

interface ValidateCouponData {
  code: string;
  orderTotal: number;
  productIds?: string[];
}

interface ValidateCouponResponse {
  coupon: {
    id: string;
    code: string;
    type: string;
    description?: string;
  };
  discount: number;
  finalTotal: number;
}

// API functions
const couponsApi = {
  getAll: async (filters?: { isActive?: boolean; vendorId?: string }): Promise<ApiResponse<Coupon[]>> => {
    return apiClient.get('/coupons', { params: filters });
  },

  getById: async (id: string): Promise<ApiResponse<Coupon>> => {
    return apiClient.get(`/coupons/${id}`);
  },

  create: async (data: any): Promise<ApiResponse<Coupon>> => {
    return apiClient.post('/coupons', data);
  },

  update: async (id: string, data: any): Promise<ApiResponse<Coupon>> => {
    return apiClient.patch(`/coupons/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse> => {
    return apiClient.delete(`/coupons/${id}`);
  },

  validate: async (data: ValidateCouponData): Promise<ApiResponse<ValidateCouponResponse>> => {
    return apiClient.post('/coupons/validate', data);
  },
};

// Hooks
export function useCoupons(filters?: { isActive?: boolean; vendorId?: string }) {
  return useQuery({
    queryKey: ['coupons', filters],
    queryFn: async () => {
      const response = await couponsApi.getAll(filters);
      return response.data || [];
    },
  });
}

export function useCoupon(id: string) {
  return useQuery({
    queryKey: ['coupon', id],
    queryFn: async () => {
      const response = await couponsApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: couponsApi.validate,
    onSuccess: (response) => {
      toast.success(response.message || 'Coupon applied successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to apply coupon');
    },
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: couponsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create coupon');
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      couponsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update coupon');
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: couponsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete coupon');
    },
  });
}
