'use client';

import { useState } from 'react';
import { useVendors, useApproveVendor, useRejectVendor, useSuspendVendor } from '@/hooks/use-vendors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, Ban } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminVendorsPage() {
  const [status, setStatus] = useState<string>('');
  const { data } = useVendors({ status });
  const { mutate: approveVendor } = useApproveVendor();
  const { mutate: rejectVendor } = useRejectVendor();
  const { mutate: suspendVendor } = useSuspendVendor();

  const [approveDialog, setApproveDialog] = useState<{ open: boolean; vendorId: string; businessName: string }>({
    open: false,
    vendorId: '',
    businessName: '',
  });
  const [commissionRate, setCommissionRate] = useState('15');

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; vendorId: string; businessName: string }>({
    open: false,
    vendorId: '',
    businessName: '',
  });
  const [rejectionReason, setRejectionReason] = useState('');

  const vendors = data?.vendors || [];

  const handleApprove = () => {
    approveVendor(
      { vendorId: approveDialog.vendorId, commissionRate: parseFloat(commissionRate) },
      {
        onSuccess: () => {
          setApproveDialog({ open: false, vendorId: '', businessName: '' });
          setCommissionRate('15');
        },
      }
    );
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) return;

    rejectVendor(
      { vendorId: rejectDialog.vendorId, reason: rejectionReason },
      {
        onSuccess: () => {
          setRejectDialog({ open: false, vendorId: '', businessName: '' });
          setRejectionReason('');
        },
      }
    );
  };

  const handleSuspend = (vendorId: string) => {
    if (!confirm('Are you sure you want to suspend this vendor?')) return;
    suspendVendor(vendorId);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string }> = {
      PENDING: { className: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { className: 'bg-green-100 text-green-800' },
      REJECTED: { className: 'bg-red-100 text-red-800' },
      SUSPENDED: { className: 'bg-orange-100 text-orange-800' },
    };

    return (
      <Badge className={variants[status]?.className || ''}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Vendor Management</h1>

        <Tabs defaultValue="all" onValueChange={(value) => setStatus(value === 'all' ? '' : value)}>
          <TabsList>
            <TabsTrigger value="all">All Vendors</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            <TabsTrigger value="SUSPENDED">Suspended</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <VendorsList
              vendors={vendors}
              onApprove={(id, name) => setApproveDialog({ open: true, vendorId: id, businessName: name })}
              onReject={(id, name) => setRejectDialog({ open: true, vendorId: id, businessName: name })}
              onSuspend={handleSuspend}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
          <TabsContent value="PENDING" className="mt-6">
            <VendorsList
              vendors={vendors}
              onApprove={(id, name) => setApproveDialog({ open: true, vendorId: id, businessName: name })}
              onReject={(id, name) => setRejectDialog({ open: true, vendorId: id, businessName: name })}
              onSuspend={handleSuspend}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
          <TabsContent value="APPROVED" className="mt-6">
            <VendorsList
              vendors={vendors}
              onApprove={(id, name) => setApproveDialog({ open: true, vendorId: id, businessName: name })}
              onReject={(id, name) => setRejectDialog({ open: true, vendorId: id, businessName: name })}
              onSuspend={handleSuspend}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
          <TabsContent value="REJECTED" className="mt-6">
            <VendorsList
              vendors={vendors}
              onApprove={(id, name) => setApproveDialog({ open: true, vendorId: id, businessName: name })}
              onReject={(id, name) => setRejectDialog({ open: true, vendorId: id, businessName: name })}
              onSuspend={handleSuspend}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
          <TabsContent value="SUSPENDED" className="mt-6">
            <VendorsList
              vendors={vendors}
              onApprove={(id, name) => setApproveDialog({ open: true, vendorId: id, businessName: name })}
              onReject={(id, name) => setRejectDialog({ open: true, vendorId: id, businessName: name })}
              onSuspend={handleSuspend}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
        </Tabs>

        {/* Approve Dialog */}
        <Dialog open={approveDialog.open} onOpenChange={(open) => !open && setApproveDialog({ open: false, vendorId: '', businessName: '' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Vendor</DialogTitle>
              <DialogDescription>
                Set commission rate for {approveDialog.businessName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Default is 15%. This will be deducted from each sale.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialog({ open: false, vendorId: '', businessName: '' })}>
                Cancel
              </Button>
              <Button onClick={handleApprove}>Approve Vendor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, vendorId: '', businessName: '' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Vendor</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting {rejectDialog.businessName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason</Label>
                <Input
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Incomplete documentation"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog({ open: false, vendorId: '', businessName: '' })}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
                Reject Vendor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function VendorsList({
  vendors,
  onApprove,
  onReject,
  onSuspend,
  getStatusBadge,
}: {
  vendors: any[];
  onApprove: (id: string, name: string) => void;
  onReject: (id: string, name: string) => void;
  onSuspend: (id: string) => void;
  getStatusBadge: (status: string) => JSX.Element;
}) {
  if (vendors.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No vendors found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {vendors.map((vendor) => (
        <Card key={vendor.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{vendor.businessName}</h3>
                  {getStatusBadge(vendor.status)}
                </div>
                <p className="text-sm text-muted-foreground">{vendor.businessEmail}</p>
                <p className="text-sm text-muted-foreground">{vendor.businessPhone}</p>
                {vendor.description && (
                  <p className="text-sm mt-2">{vendor.description}</p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                  <span>Commission: {vendor.commissionRate}%</span>
                  <span>Sales: KES {vendor.totalSales.toLocaleString()}</span>
                  <span>Orders: {vendor.totalOrders}</span>
                  <span>Rating: {vendor.rating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied: {format(new Date(vendor.createdAt), 'MMM dd, yyyy')}
                </p>
              </div>

              <div className="flex gap-2">
                {vendor.status === 'PENDING' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onApprove(vendor.id, vendor.businessName)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject(vendor.id, vendor.businessName)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
                {vendor.status === 'APPROVED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSuspend(vendor.id)}
                  >
                    <Ban className="w-4 h-4 mr-1" />
                    Suspend
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
