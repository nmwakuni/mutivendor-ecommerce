import { inngest } from '../client';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

/**
 * Alert vendor of low stock
 */
export const alertLowStock = inngest.createFunction(
  {
    id: 'alert-low-stock',
    name: 'Alert Low Stock',
  },
  { event: 'inventory/low-stock' },
  async ({ event, step }) => {
    const { productId, vendorId, currentStock, threshold } = event.data;

    await step.run('send-low-stock-alert', async () => {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { vendor: { include: { user: true } } },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Send email to vendor
      logger.warn('Low stock alert', {
        productId,
        productName: product.name,
        currentStock,
        threshold,
      });

      // TODO: Send email notification to vendor
    });
  }
);

/**
 * Process inventory update
 */
export const processInventoryUpdate = inngest.createFunction(
  {
    id: 'process-inventory-update',
    name: 'Process Inventory Update',
  },
  { event: 'inventory/update' },
  async ({ event, step }) => {
    const { productId, quantity, type } = event.data;

    await step.run('update-inventory', async () => {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const previousStock = product.stock;
      const newStock = previousStock + quantity;

      // Update product stock
      await prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      // Create inventory log
      await prisma.inventoryLog.create({
        data: {
          productId,
          type,
          quantity,
          previousStock,
          newStock,
        },
      });

      logger.info('Inventory updated', { productId, previousStock, newStock, type });

      // Check if stock is low
      if (newStock <= product.lowStockThreshold && product.trackInventory) {
        await inngest.send({
          name: 'inventory/low-stock',
          data: {
            productId,
            vendorId: product.vendorId,
            currentStock: newStock,
            threshold: product.lowStockThreshold,
          },
        });
      }
    });
  }
);
