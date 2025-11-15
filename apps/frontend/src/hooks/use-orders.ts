import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';

// Types
export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  product: {
    id: string;
    name: string;
    thumbnail?: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  shippingFee: number;
  total: number;
  customerNotes?: string;
  items: OrderItem[];
  shippingAddress: {
    address1: string;
    city: string;
    phone: string;
  };
  payment?: {
    status: string;
    method: string;
  };
  createdAt: string;
}

interface CreateOrderData {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddressId: string;
  phoneNumber: string;
  customerNotes?: string;
}

// API functions
const ordersApi = {
  create: async (data: CreateOrderData): Promise<ApiResponse<{ order: Order; payment: any }>> => {
    return apiClient.post('/orders', data);
  },

  getAll: async (filters?: {
    page?: number;
    pageSize?: number;
    status?: string;
    paymentStatus?: string;
  }): Promise<ApiResponse<Order[]>> => {
    return apiClient.get('/orders', { params: filters });
  },

  getById: async (id: string): Promise<ApiResponse<Order>> => {
    return apiClient.get(`/orders/${id}`);
  },

  updateStatus: async (id: string, status: string, vendorNotes?: string): Promise<ApiResponse<Order>> => {
    return apiClient.patch(`/orders/${id}/status`, { status, vendorNotes });
  },

  cancel: async (id: string): Promise<ApiResponse<Order>> => {
    return apiClient.post(`/orders/${id}/cancel`);
  },
};

// Hooks
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(response.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create order');
    },
  });
}

export function useOrders(filters?: { page?: number; pageSize?: number; status?: string; paymentStatus?: string }) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const response = await ordersApi.getAll(filters);
      return {
        orders: response.data || [],
        meta: response.meta,
      };
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await ordersApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, vendorNotes }: { id: string; status: string; vendorNotes?: string }) =>
      ordersApi.updateStatus(id, status, vendorNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update order');
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });
}
