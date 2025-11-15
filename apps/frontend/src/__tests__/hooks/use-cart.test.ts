import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '@/store/cart.store';

describe('useCartStore', () => {
  beforeEach(() => {
    // Clear cart before each test
    const { clearCart } = useCartStore.getState();
    clearCart();
  });

  it('should add item to cart', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem({
        id: '1',
        name: 'Test Product',
        price: 1000,
        quantity: 1,
        stock: 10,
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Test Product');
  });

  it('should increment quantity when adding existing item', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem({
        id: '1',
        name: 'Test Product',
        price: 1000,
        quantity: 1,
        stock: 10,
      });
      result.current.addItem({
        id: '1',
        name: 'Test Product',
        price: 1000,
        quantity: 1,
        stock: 10,
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });

  it('should remove item from cart', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem({
        id: '1',
        name: 'Test Product',
        price: 1000,
        quantity: 1,
        stock: 10,
      });
      result.current.removeItem('1');
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('should calculate total correctly', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem({
        id: '1',
        name: 'Product 1',
        price: 1000,
        quantity: 2,
        stock: 10,
      });
      result.current.addItem({
        id: '2',
        name: 'Product 2',
        price: 500,
        quantity: 1,
        stock: 10,
      });
    });

    expect(result.current.getTotal()).toBe(2500);
  });

  it('should calculate item count correctly', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem({
        id: '1',
        name: 'Product 1',
        price: 1000,
        quantity: 2,
        stock: 10,
      });
      result.current.addItem({
        id: '2',
        name: 'Product 2',
        price: 500,
        quantity: 3,
        stock: 10,
      });
    });

    expect(result.current.getItemCount()).toBe(5);
  });

  it('should clear cart', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem({
        id: '1',
        name: 'Test Product',
        price: 1000,
        quantity: 1,
        stock: 10,
      });
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
  });
});
