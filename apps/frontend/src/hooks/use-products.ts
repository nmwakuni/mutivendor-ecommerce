import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';

// Types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  images: string[];
  thumbnail?: string;
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  totalReviews: number;
  categoryId: string;
  vendorId: string;
  vendor: {
    id: string;
    businessName: string;
    logo?: string;
    rating: number;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
}

interface ProductsFilters {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  vendorId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateProductData {
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  lowStockThreshold?: number;
  categoryId: string;
  isFeatured?: boolean;
}

// API functions
const productsApi = {
  getAll: async (filters?: ProductsFilters): Promise<ApiResponse<Product[]>> => {
    return apiClient.get('/products', { params: filters });
  },

  getById: async (id: string): Promise<ApiResponse<Product>> => {
    return apiClient.get(`/products/${id}`);
  },

  create: async (data: CreateProductData): Promise<ApiResponse<Product>> => {
    return apiClient.post('/products', data);
  },

  update: async (id: string, data: Partial<CreateProductData>): Promise<ApiResponse<Product>> => {
    return apiClient.patch(`/products/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse> => {
    return apiClient.delete(`/products/${id}`);
  },

  uploadImages: async (id: string, files: File[]): Promise<ApiResponse<Product>> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return apiClient.post(`/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateStock: async (id: string, quantity: number, type: 'add' | 'subtract'): Promise<ApiResponse<Product>> => {
    return apiClient.patch(`/products/${id}/stock`, { quantity, type });
  },
};

// Hooks
export function useProducts(filters?: ProductsFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const response = await productsApi.getAll(filters);
      return {
        products: response.data || [],
        meta: response.meta,
      };
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await productsApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductData> }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    },
  });
}

export function useUploadProductImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      productsApi.uploadImages(id, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Images uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload images');
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity, type }: { id: string; quantity: number; type: 'add' | 'subtract' }) =>
      productsApi.updateStock(id, quantity, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update stock');
    },
  });
}
