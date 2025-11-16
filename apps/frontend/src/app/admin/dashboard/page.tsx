'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useVendors } from '@/hooks/use-vendors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store, Package, ShoppingCart } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data: vendorsData } = useVendors();

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, router]);

  const vendors = vendorsData?.vendors || [];
  const pendingVendors = vendors.filter((v) => v.status === 'PENDING').length;
  const approvedVendors = vendors.filter((v) => v.status === 'APPROVED').length;

  const statCards = [
    {
      title: 'Total Vendors',
      value: vendors.length.toString(),
      icon: Store,
      description: `${approvedVendors} approved, ${pendingVendors} pending`,
    },
    {
      title: 'Pending Approvals',
      value: pendingVendors.toString(),
      icon: Users,
      description: 'Vendors awaiting approval',
      link: '/admin/vendors?status=PENDING',
    },
    {
      title: 'Active Vendors',
      value: approvedVendors.toString(),
      icon: Store,
      description: 'Currently selling',
      link: '/admin/vendors?status=APPROVED',
    },
    {
      title: 'Platform Revenue',
      value: 'KES 0',
      icon: ShoppingCart,
      description: 'Total commission earned',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your marketplace</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              className={stat.link ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
              onClick={() => stat.link && router.push(stat.link)}
            >
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
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/admin/vendors')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Manage Vendors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Approve, reject, or suspend vendor accounts
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/admin/categories')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Manage Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add, edit, or remove product categories
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/admin/reviews')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Moderate Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Approve or reject customer reviews
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
