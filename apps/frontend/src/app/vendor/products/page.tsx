'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useProducts, useDeleteProduct } from '@/hooks/use-products';
import { useVendorProfile } from '@/hooks/use-vendors';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Eye } from 'lucide-react';
import Image from 'next/image';

export default function VendorProductsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data: vendor } = useVendorProfile();
  const { data, isLoading } = useProducts({ vendorId: vendor?.id });
  const { mutate: deleteProduct } = useDeleteProduct();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    setDeletingId(productId);
    deleteProduct(productId, {
      onSettled: () => setDeletingId(null),
    });
  };

  const products = data?.products || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Products</h1>
            <p className="text-muted-foreground">{products.length} products</p>
          </div>
          <Button onClick={() => router.push('/vendor/products/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg h-96 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't added any products yet</p>
              <Button onClick={() => router.push('/vendor/products/new')}>
                Add Your First Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="relative aspect-square bg-gray-100">
                  {product.thumbnail || product.images?.[0] ? (
                    <Image
                      src={product.thumbnail || product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {product.isActive ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {product.isFeatured && (
                      <Badge className="bg-yellow-500">Featured</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    SKU: {product.sku}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold">
                      KES {product.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Stock: {product.stock}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/products/${product.slug}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/vendor/products/${product.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
