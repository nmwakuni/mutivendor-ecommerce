import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';

// Types
export interface Vendor {
  id: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  description?: string;
  logo?: string;
  banner?: string;
  status: string;
  rating: number;
  totalSales: number;
  totalOrders: number;
  totalReviews: number;
  commissionRate: number;
}

interface VendorApplicationData {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  description: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  registrationNumber?: string;
  taxId?: string;
}

// API functions
const vendorsApi = {
  apply: async (data: VendorApplicationData): Promise<ApiResponse<Vendor>> => {
    return apiClient.post('/vendors/apply', data);
  },

  getProfile: async (): Promise<ApiResponse<Vendor>> => {
    return apiClient.get('/vendors/profile/me');
  },

  getById: async (id: string): Promise<ApiResponse<Vendor>> => {
    return apiClient.get(`/vendors/${id}`);
  },

  update: async (id: string, data: Partial<VendorApplicationData>): Promise<ApiResponse<Vendor>> => {
    return apiClient.patch(`/vendors/${id}`, data);
  },

  getStatistics: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.get(`/vendors/${id}/statistics`);
  },

  // Admin endpoints
  getAll: async (filters?: { status?: string; search?: string; page?: number; pageSize?: number }): Promise<ApiResponse<Vendor[]>> => {
    return apiClient.get('/vendors', { params: filters });
  },

  approve: async (vendorId: string, commissionRate: number): Promise<ApiResponse<Vendor>> => {
    return apiClient.post('/vendors/approve', { vendorId, commissionRate });
  },

  reject: async (vendorId: string, reason: string): Promise<ApiResponse<Vendor>> => {
    return apiClient.post('/vendors/reject', { vendorId, reason });
  },

  suspend: async (id: string): Promise<ApiResponse<Vendor>> => {
    return apiClient.post(`/vendors/${id}/suspend`);
  },
};

// Hooks
export function useApplyVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorsApi.apply,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-profile'] });
      toast.success(response.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Application failed');
    },
  });
}

export function useVendorProfile() {
  return useQuery({
    queryKey: ['vendor-profile'],
    queryFn: async () => {
      const response = await vendorsApi.getProfile();
      return response.data;
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const response = await vendorsApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VendorApplicationData> }) =>
      vendorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-profile'] });
      toast.success('Vendor updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Update failed');
    },
  });
}

export function useVendorStatistics(id: string) {
  return useQuery({
    queryKey: ['vendor-statistics', id],
    queryFn: async () => {
      const response = await vendorsApi.getStatistics(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// Admin hooks
export function useVendors(filters?: { status?: string; search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['vendors', filters],
    queryFn: async () => {
      const response = await vendorsApi.getAll(filters);
      return {
        vendors: response.data || [],
        meta: response.meta,
      };
    },
  });
}

export function useApproveVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendorId, commissionRate }: { vendorId: string; commissionRate: number }) =>
      vendorsApi.approve(vendorId, commissionRate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor approved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Approval failed');
    },
  });
}

export function useRejectVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendorId, reason }: { vendorId: string; reason: string }) =>
      vendorsApi.reject(vendorId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Rejection failed');
    },
  });
}

export function useSuspendVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorsApi.suspend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor suspended');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Suspension failed');
    },
  });
}
