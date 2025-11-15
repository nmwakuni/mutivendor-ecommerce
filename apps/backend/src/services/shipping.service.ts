import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

// Carrier configurations for checkout selection
const CARRIERS = {
  G4S: {
    name: 'G4S Courier',
    logo: '/carriers/g4s.png',
    description: 'Fast and reliable delivery across Kenya',
    estimatedDays: '1-3 business days',
    baseRate: 350,
    domestic: true,
    international: false,
  },
  MTAANI: {
    name: 'Mtaani Express',
    logo: '/carriers/mtaani.png',
    description: 'Budget-friendly delivery, great for Nairobi area',
    estimatedDays: 'Same day - 2 days',
    baseRate: 250,
    domestic: true,
    international: false,
  },
  DHL: {
    name: 'DHL Express',
    logo: '/carriers/dhl.png',
    description: 'Premium express delivery, domestic and international',
    estimatedDays: '1-2 days (domestic), 3-5 days (international)',
    baseRate: 900,
    domestic: true,
    international: true,
  },
  ARAMEX: {
    name: 'Aramex',
    logo: '/carriers/aramex.png',
    description: 'Reliable courier service with international coverage',
    estimatedDays: '2-3 days (domestic), 4-7 days (international)',
    baseRate: 650,
    domestic: true,
    international: true,
  },
  POSTA: {
    name: 'Posta Kenya',
    logo: '/carriers/posta.png',
    description: 'Nationwide coverage at affordable rates',
    estimatedDays: '3-7 business days',
    baseRate: 300,
    domestic: true,
    international: true,
  },
  FARGO: {
    name: 'Fargo Courier',
    logo: '/carriers/fargo.png',
    description: 'Quality courier service across major cities',
    estimatedDays: '2-4 business days',
    baseRate: 450,
    domestic: true,
    international: false,
  },
};

interface CarrierOption {
  code: string;
  name: string;
  logo: string;
  description: string;
  estimatedDays: string;
  baseRate: number;
  domestic: boolean;
  international: boolean;
}

interface TrackingEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
}

class ShippingService {
  /**
   * Get all available carriers for checkout selection
   * Filters based on domestic/international requirement
   */
  getAvailableCarriers(isDomestic: boolean = true): CarrierOption[] {
    return Object.entries(CARRIERS)
      .filter(([_, config]) => {
        if (isDomestic) return config.domestic;
        return config.international;
      })
      .map(([code, config]) => ({
        code,
        name: config.name,
        logo: config.logo,
        description: config.description,
        estimatedDays: config.estimatedDays,
        baseRate: config.baseRate,
        domestic: config.domestic,
        international: config.international,
      }))
      .sort((a, b) => a.baseRate - b.baseRate); // Sort by price, cheapest first
  }

  /**
   * Get specific carrier details
   */
  getCarrier(carrierCode: string): CarrierOption | null {
    const config = CARRIERS[carrierCode as keyof typeof CARRIERS];
    if (!config) return null;

    return {
      code: carrierCode,
      name: config.name,
      logo: config.logo,
      description: config.description,
      estimatedDays: config.estimatedDays,
      baseRate: config.baseRate,
      domestic: config.domestic,
      international: config.international,
    };
  }

  /**
   * Assign carrier to order
   * Creates or updates delivery record with selected carrier
   */
  async assignCarrierToOrder(orderId: string, carrierCode: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const carrier = this.getCarrier(carrierCode);
    if (!carrier) {
      throw new ApiError(400, 'Invalid carrier code');
    }

    // Generate tracking number (vendor will update this later with actual tracking number)
    const trackingNumber = this.generateTrackingNumber(carrierCode);

    // Create or update delivery record
    const delivery = await prisma.delivery.upsert({
      where: { orderId },
      create: {
        orderId,
        trackingNumber,
        courier: carrier.name,
        status: 'PENDING',
      },
      update: {
        courier: carrier.name,
        status: 'PENDING',
      },
    });

    // Create initial tracking event
    await prisma.deliveryTracking.create({
      data: {
        deliveryId: delivery.id,
        status: 'PENDING',
        description: `Shipment assigned to ${carrier.name}`,
      },
    });

    return {
      delivery,
      carrier,
    };
  }

  /**
   * Update tracking number (vendor enters actual tracking number from carrier)
   */
  async updateTrackingNumber(orderId: string, trackingNumber: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { orderId },
    });

    if (!delivery) {
      throw new ApiError(404, 'Delivery not found for this order');
    }

    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { trackingNumber },
    });

    await prisma.deliveryTracking.create({
      data: {
        deliveryId: delivery.id,
        status: 'PENDING',
        description: 'Tracking number updated',
      },
    });

    return { success: true, trackingNumber };
  }

  /**
   * Track shipment by tracking number
   */
  async trackShipment(trackingNumber: string): Promise<{
    carrier: string;
    status: string;
    estimatedDelivery?: Date;
    events: TrackingEvent[];
  }> {
    const delivery = await prisma.delivery.findUnique({
      where: { trackingNumber },
      include: {
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
        },
        order: {
          include: {
            user: {
              select: { firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
    });

    if (!delivery) {
      throw new ApiError(404, 'Tracking number not found');
    }

    const events: TrackingEvent[] = delivery.trackingEvents.map((event) => ({
      timestamp: event.createdAt,
      status: event.status,
      location: event.location || 'Kenya',
      description: event.description || '',
    }));

    return {
      carrier: delivery.courier || 'Unknown',
      status: delivery.status,
      estimatedDelivery: delivery.estimatedDelivery || undefined,
      events,
    };
  }

  /**
   * Update delivery status (vendor/admin updates)
   */
  async updateDeliveryStatus(
    trackingNumber: string,
    newStatus: string,
    location?: string,
    description?: string
  ) {
    const delivery = await prisma.delivery.findUnique({
      where: { trackingNumber },
    });

    if (!delivery) {
      throw new ApiError(404, 'Delivery not found');
    }

    // Update delivery status
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: newStatus as any },
    });

    // Add tracking event
    await prisma.deliveryTracking.create({
      data: {
        deliveryId: delivery.id,
        status: newStatus as any,
        location,
        description: description || this.getStatusDescription(newStatus),
      },
    });

    // If delivered, update order status
    if (newStatus === 'DELIVERED') {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });
    }

    return delivery;
  }

  /**
   * Validate delivery address
   */
  async validateAddress(address: any) {
    const required = ['firstName', 'lastName', 'phone', 'address1', 'city', 'country'];
    const missing = required.filter((field) => !address[field]);

    if (missing.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missing.join(', ')}`);
    }

    return { valid: true, address };
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateTrackingNumber(carrier: string): string {
    const prefix = carrier.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().substring(7);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      PENDING: 'Shipment created, awaiting pickup',
      PICKED_UP: 'Package picked up by courier',
      IN_TRANSIT: 'Package in transit to destination',
      OUT_FOR_DELIVERY: 'Out for delivery',
      DELIVERED: 'Package delivered successfully',
      FAILED: 'Delivery attempt failed',
    };

    return descriptions[status] || status;
  }
}

export default new ShippingService();
