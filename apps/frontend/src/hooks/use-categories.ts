import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';

// Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  isActive: boolean;
  order: number;
  parent?: {
    id: string;
    name: string;
    slug: string;
  };
  children?: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  }>;
  _count?: {
    products: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  order?: number;
}

interface UpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
  order?: number;
}

interface CategoryFilters {
  isActive?: boolean;
  parentId?: string | null;
}

// API functions
const categoriesApi = {
  getAll: async (filters?: CategoryFilters): Promise<ApiResponse<Category[]>> => {
    return apiClient.get('/categories', { params: filters });
  },

  getById: async (id: string): Promise<ApiResponse<Category>> => {
    return apiClient.get(`/categories/${id}`);
  },

  getBySlug: async (slug: string): Promise<ApiResponse<Category>> => {
    return apiClient.get(`/categories/slug/${slug}`);
  },

  create: async (data: CreateCategoryData): Promise<ApiResponse<Category>> => {
    return apiClient.post('/categories', data);
  },

  update: async (id: string, data: UpdateCategoryData): Promise<ApiResponse<Category>> => {
    return apiClient.patch(`/categories/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse> => {
    return apiClient.delete(`/categories/${id}`);
  },

  uploadImage: async (id: string, file: File): Promise<ApiResponse<Category>> => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post(`/categories/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Hooks
export function useCategories(filters?: CategoryFilters) {
  return useQuery({
    queryKey: ['categories', filters],
    queryFn: async () => {
      const response = await categoriesApi.getAll(filters);
      return response.data || [];
    },
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      const response = await categoriesApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCategoryBySlug(slug: string) {
  return useQuery({
    queryKey: ['category-slug', slug],
    queryFn: async () => {
      const response = await categoriesApi.getBySlug(slug);
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create category');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryData }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update category');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    },
  });
}

export function useUploadCategoryImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      categoriesApi.uploadImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category image uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    },
  });
}
