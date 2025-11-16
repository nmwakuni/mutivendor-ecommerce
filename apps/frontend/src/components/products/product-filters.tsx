'use client';

import { useState } from 'react';
import { useCategories } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface ProductFiltersProps {
  onFilterChange: (filters: any) => void;
}

export function ProductFilters({ onFilterChange }: ProductFiltersProps) {
  const { data: categories } = useCategories({ isActive: true, parentId: null });
  const [filters, setFilters] = useState({
    categoryId: '',
    minPrice: 0,
    maxPrice: 100000,
    isFeatured: false,
  });

  const handleCategoryChange = (categoryId: string) => {
    const newFilters = { ...filters, categoryId };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handlePriceChange = (values: number[]) => {
    const newFilters = { ...filters, minPrice: values[0], maxPrice: values[1] };
    setFilters(newFilters);
  };

  const handlePriceChangeComplete = () => {
    onFilterChange(filters);
  };

  const handleFeaturedChange = (checked: boolean) => {
    const newFilters = { ...filters, isFeatured: checked };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      categoryId: '',
      minPrice: 0,
      maxPrice: 100000,
      isFeatured: false,
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Categories */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Categories</Label>
          <div className="space-y-2">
            {categories?.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={category.id}
                  checked={filters.categoryId === category.id}
                  onCheckedChange={() =>
                    handleCategoryChange(
                      filters.categoryId === category.id ? '' : category.id
                    )
                  }
                />
                <label
                  htmlFor={category.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {category.name}
                  {category._count && (
                    <span className="text-muted-foreground ml-1">
                      ({category._count.products})
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Price Range</Label>
          <div className="px-2">
            <Slider
              min={0}
              max={100000}
              step={1000}
              value={[filters.minPrice, filters.maxPrice]}
              onValueChange={handlePriceChange}
              onValueCommit={handlePriceChangeComplete}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="minPrice" className="text-xs">Min</Label>
              <Input
                id="minPrice"
                type="number"
                value={filters.minPrice}
                onChange={(e) => {
                  const newFilters = { ...filters, minPrice: Number(e.target.value) };
                  setFilters(newFilters);
                }}
                onBlur={handlePriceChangeComplete}
                className="h-8"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="maxPrice" className="text-xs">Max</Label>
              <Input
                id="maxPrice"
                type="number"
                value={filters.maxPrice}
                onChange={(e) => {
                  const newFilters = { ...filters, maxPrice: Number(e.target.value) };
                  setFilters(newFilters);
                }}
                onBlur={handlePriceChangeComplete}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Featured */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="featured"
            checked={filters.isFeatured}
            onCheckedChange={handleFeaturedChange}
          />
          <label
            htmlFor="featured"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Featured products only
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
