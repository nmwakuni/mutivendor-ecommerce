'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useVendorProfile, useVendorStatistics } from '@/hooks/use-vendors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, Star } from 'lucide-react';

export default function VendorDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data: vendor, isLoading: vendorLoading } = useVendorProfile();
  const { data: stats, isLoading: statsLoading } = useVendorStatistics(vendor?.id || '');

  useEffect(() => {
    if (!user || user.role !== 'VENDOR') {
      router.push('/');
    }
  }, [user, router]);

  if (vendorLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Vendor Application Required</h2>
            <p className="text-muted-foreground mb-4">
              You need to apply as a vendor to access the dashboard.
            </p>
            <button
              onClick={() => router.push('/vendor/apply')}
              className="w-full bg-primary text-white py-2 rounded-lg"
            >
              Apply as Vendor
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vendor.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Application Pending</h2>
            <p className="text-muted-foreground">
              Your vendor application is under review. We'll notify you once it's approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vendor.status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Application Rejected</h2>
            <p className="text-muted-foreground">
              Unfortunately, your vendor application was not approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vendor.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4 text-orange-600">Account Suspended</h2>
            <p className="text-muted-foreground">
              Your vendor account has been suspended. Please contact support for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Sales',
      value: `KES ${vendor.totalSales.toLocaleString()}`,
      icon: DollarSign,
      description: `Commission rate: ${vendor.commissionRate}%`,
    },
    {
      title: 'Total Orders',
      value: vendor.totalOrders.toString(),
      icon: ShoppingCart,
      description: stats?.pendingOrders ? `${stats.pendingOrders} pending` : 'No pending orders',
    },
    {
      title: 'Products',
      value: stats?.totalProducts?.toString() || '0',
      icon: Package,
      description: stats?.activeProducts ? `${stats.activeProducts} active` : 'No active products',
    },
    {
      title: 'Rating',
      value: vendor.rating.toFixed(1),
      icon: Star,
      description: `${vendor.totalReviews} reviews`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Vendor Dashboard</h1>
          <p className="text-muted-foreground">{vendor.businessName}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/vendor/products')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Manage Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add, edit, or remove your products
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/vendor/orders')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                View Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track and manage your orders
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/vendor/profile')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Vendor Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Update your business information
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
