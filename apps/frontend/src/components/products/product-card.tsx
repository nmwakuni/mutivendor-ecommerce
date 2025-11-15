import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingCart } from 'lucide-react';
import { Product } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {product.thumbnail || product.images?.[0] ? (
            <Image
              src={product.thumbnail || product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute top-2 right-2 bg-red-500">
              -{discountPercentage}%
            </Badge>
          )}
          {!product.isActive && (
            <Badge className="absolute top-2 left-2 bg-gray-500">
              Unavailable
            </Badge>
          )}
          {product.isFeatured && (
            <Badge className="absolute top-2 left-2 bg-yellow-500">
              Featured
            </Badge>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <Link href={`/vendors/${product.vendor.id}`}>
          <p className="text-sm text-muted-foreground hover:text-primary mt-1">
            {product.vendor.businessName}
          </p>
        </Link>
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">
              ({product.totalReviews})
            </span>
          </div>
        )}
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">
              KES {product.price.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                KES {product.compareAtPrice!.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        {product.stock <= 0 && (
          <p className="text-sm text-red-500 mt-2">Out of stock</p>
        )}
        {product.stock > 0 && product.stock <= 10 && (
          <p className="text-sm text-orange-500 mt-2">
            Only {product.stock} left
          </p>
        )}
      </CardContent>
      {product.isActive && product.stock > 0 && (
        <CardFooter className="p-4 pt-0">
          <Button
            className="w-full"
            onClick={() => onAddToCart?.(product)}
            size="sm"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
