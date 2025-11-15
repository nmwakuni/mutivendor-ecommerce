import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cart.store';

// Types
export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number;
    thumbnail?: string;
    stock: number;
    isActive: boolean;
    vendor: {
      id: string;
      businessName: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface AddToCartData {
  productId: string;
  quantity: number;
}

interface UpdateCartItemData {
  quantity: number;
}

// API functions (for authenticated users with server-side cart)
const cartApi = {
  getCart: async (): Promise<ApiResponse<CartItem[]>> => {
    return apiClient.get('/cart');
  },

  addItem: async (data: AddToCartData): Promise<ApiResponse<CartItem>> => {
    return apiClient.post('/cart', data);
  },

  updateItem: async (productId: string, data: UpdateCartItemData): Promise<ApiResponse<CartItem>> => {
    return apiClient.patch(`/cart/${productId}`, data);
  },

  removeItem: async (productId: string): Promise<ApiResponse> => {
    return apiClient.delete(`/cart/${productId}`);
  },

  clearCart: async (): Promise<ApiResponse> => {
    return apiClient.delete('/cart');
  },
};

// Hooks for server-side cart (authenticated users)
export function useServerCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await cartApi.getCart();
      return response.data || [];
    },
    // Only fetch if user is authenticated
    enabled: false, // Will be enabled conditionally based on auth state
  });
}

export function useAddToServerCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cartApi.addItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.updateItem(productId, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Cart updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update cart');
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cartApi.removeItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Removed from cart');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove item');
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cartApi.clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Cart cleared');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to clear cart');
    },
  });
}

// Hooks for client-side cart (using Zustand store for guest users)
export function useCart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const total = useCartStore((state) => state.getTotal());
  const itemCount = useCartStore((state) => state.getItemCount());

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
  };
}

// Utility hook to add to cart (handles both local and server cart)
export function useAddToCart() {
  const addToLocalCart = useCartStore((state) => state.addItem);
  const { mutate: addToServer } = useAddToServerCart();

  return (product: any, quantity: number = 1, isAuthenticated: boolean = false) => {
    if (isAuthenticated) {
      // Add to server cart
      addToServer({ productId: product.id, quantity });
    } else {
      // Add to local cart
      addToLocalCart({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.thumbnail || product.images?.[0],
        stock: product.stock,
      });
      toast.success('Added to cart');
    }
  };
}
