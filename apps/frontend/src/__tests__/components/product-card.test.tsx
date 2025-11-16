import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/products/product-card';
import { Product } from '@/hooks/use-products';

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  slug: 'test-product',
  description: 'Test description',
  price: 1000,
  compareAtPrice: 1500,
  sku: 'TEST-001',
  stock: 10,
  images: ['https://example.com/image.jpg'],
  thumbnail: 'https://example.com/thumbnail.jpg',
  isActive: true,
  isFeatured: false,
  rating: 4.5,
  totalReviews: 10,
  categoryId: 'cat-1',
  vendorId: 'vendor-1',
  vendor: {
    id: 'vendor-1',
    businessName: 'Test Vendor',
    rating: 4.8,
  },
  category: {
    id: 'cat-1',
    name: 'Test Category',
    slug: 'test-category',
  },
  createdAt: '2024-01-01',
};

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    expect(screen.getByText(/KES 1,000/)).toBeInTheDocument();
  });

  it('shows discount badge when compareAtPrice is higher', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText(/-33%/)).toBeInTheDocument();
  });

  it('shows out of stock message when stock is 0', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    render(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('shows low stock warning when stock is low', () => {
    const lowStockProduct = { ...mockProduct, stock: 5 };
    render(<ProductCard product={lowStockProduct} />);

    expect(screen.getByText(/Only 5 left/)).toBeInTheDocument();
  });
});
