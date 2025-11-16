import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';

// Types
export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  isVerified: boolean;
  isApproved: boolean;
  helpfulCount: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  product?: {
    id: string;
    name: string;
    slug: string;
    thumbnail?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateReviewData {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
}

interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
}

interface ReviewFilters {
  productId?: string;
  userId?: string;
  rating?: number;
  isApproved?: boolean;
  page?: number;
  pageSize?: number;
}

// API functions
const reviewsApi = {
  getAll: async (filters?: ReviewFilters): Promise<ApiResponse<Review[]>> => {
    return apiClient.get('/reviews', { params: filters });
  },

  getById: async (id: string): Promise<ApiResponse<Review>> => {
    return apiClient.get(`/reviews/${id}`);
  },

  create: async (data: CreateReviewData): Promise<ApiResponse<Review>> => {
    return apiClient.post('/reviews', data);
  },

  update: async (id: string, data: UpdateReviewData): Promise<ApiResponse<Review>> => {
    return apiClient.patch(`/reviews/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse> => {
    return apiClient.delete(`/reviews/${id}`);
  },

  uploadImages: async (id: string, files: File[]): Promise<ApiResponse<Review>> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return apiClient.post(`/reviews/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  markHelpful: async (id: string): Promise<ApiResponse<Review>> => {
    return apiClient.post(`/reviews/${id}/helpful`);
  },

  // Admin
  approve: async (id: string): Promise<ApiResponse<Review>> => {
    return apiClient.post(`/reviews/${id}/approve`);
  },

  reject: async (id: string): Promise<ApiResponse<Review>> => {
    return apiClient.post(`/reviews/${id}/reject`);
  },
};

// Hooks
export function useReviews(filters?: ReviewFilters) {
  return useQuery({
    queryKey: ['reviews', filters],
    queryFn: async () => {
      const response = await reviewsApi.getAll(filters);
      return {
        reviews: response.data || [],
        meta: response.meta,
      };
    },
  });
}

export function useReview(id: string) {
  return useQuery({
    queryKey: ['review', id],
    queryFn: async () => {
      const response = await reviewsApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewsApi.create,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(response.message || 'Review submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReviewData }) =>
      reviewsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Review updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update review');
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Review deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete review');
    },
  });
}

export function useUploadReviewImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      reviewsApi.uploadImages(id, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Images uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload images');
    },
  });
}

export function useMarkReviewHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewsApi.markHelpful,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Thanks for your feedback!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark review as helpful');
    },
  });
}

// Admin hooks
export function useApproveReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewsApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve review');
    },
  });
}

export function useRejectReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewsApi.reject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject review');
    },
  });
}
