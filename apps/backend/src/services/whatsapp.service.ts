import { prisma } from '../lib/prisma';
import { WhatsAppMessageType, WhatsAppMessageStatus } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import axios from 'axios';

// WhatsApp Business API Configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

class WhatsAppService {
  /**
   * Send WhatsApp message
   */
  async sendMessage(
    phoneNumber: string,
    content: string,
    type: WhatsAppMessageType = WhatsAppMessageType.TEXT,
    mediaUrl?: string
  ) {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      console.warn('WhatsApp API not configured, skipping message send');
      return null;
    }

    // Format phone number (remove + and spaces)
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');

    try {
      let messagePayload: any = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
      };

      if (type === WhatsAppMessageType.TEXT) {
        messagePayload.type = 'text';
        messagePayload.text = { body: content };
      } else if (type === WhatsAppMessageType.IMAGE) {
        messagePayload.type = 'image';
        messagePayload.image = {
          link: mediaUrl,
          caption: content,
        };
      } else if (type === WhatsAppMessageType.DOCUMENT) {
        messagePayload.type = 'document';
        messagePayload.document = {
          link: mediaUrl,
          caption: content,
        };
      }

      const response = await axios.post(
        `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        messagePayload,
        {
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('WhatsApp send error:', error.response?.data || error.message);
      throw new ApiError(500, 'Failed to send WhatsApp message');
    }
  }

  /**
   * Get or create conversation
   */
  async getOrCreateConversation(phoneNumber: string, userId?: string) {
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');

    let conversation = await prisma.whatsAppConversation.findFirst({
      where: { phoneNumber: formattedPhone },
    });

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          phoneNumber: formattedPhone,
          userId,
          isActive: true,
        },
      });
    } else if (userId && !conversation.userId) {
      // Link user if not already linked
      conversation = await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { userId },
      });
    }

    return conversation;
  }

  /**
   * Save incoming message
   */
  async saveIncomingMessage(
    phoneNumber: string,
    waMessageId: string,
    content: string,
    type: WhatsAppMessageType = WhatsAppMessageType.TEXT,
    mediaUrl?: string
  ) {
    const conversation = await this.getOrCreateConversation(phoneNumber);

    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        waMessageId,
        type,
        content,
        mediaUrl,
        isFromCustomer: true,
        status: WhatsAppMessageStatus.DELIVERED,
      },
    });

    // Update conversation last message time
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  /**
   * Save outgoing message
   */
  async saveOutgoingMessage(
    conversationId: string,
    waMessageId: string,
    content: string,
    type: WhatsAppMessageType = WhatsAppMessageType.TEXT,
    mediaUrl?: string
  ) {
    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId,
        waMessageId,
        type,
        content,
        mediaUrl,
        isFromCustomer: false,
        status: WhatsAppMessageStatus.SENT,
      },
    });

    // Update conversation last message time
    await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string, limit = 50, offset = 0) {
    const messages = await prisma.whatsAppMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.whatsAppMessage.count({
      where: { conversationId },
    });

    return { messages: messages.reverse(), total };
  }

  /**
   * Get all active conversations
   */
  async getActiveConversations(limit = 50, offset = 0) {
    const conversations = await prisma.whatsAppConversation.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.whatsAppConversation.count({
      where: { isActive: true },
    });

    return { conversations, total };
  }

  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order || !order.user.phone) {
      throw new ApiError(404, 'Order or user phone not found');
    }

    const itemsList = order.items
      .map((item) => `• ${item.product.name} x${item.quantity} - KES ${item.total}`)
      .join('\n');

    const message = `
🛍️ *Order Confirmation*

Order #: ${order.orderNumber}
Total: KES ${order.total}

Items:
${itemsList}

Status: ${order.status}

Thank you for shopping with us!
    `.trim();

    const conversation = await this.getOrCreateConversation(
      order.user.phone,
      order.userId
    );

    const response = await this.sendMessage(order.user.phone, message);

    if (response) {
      await this.saveOutgoingMessage(
        conversation.id,
        response.messages[0].id,
        message
      );
    }

    return { success: true };
  }

  /**
   * Send delivery update via WhatsApp
   */
  async sendDeliveryUpdate(orderId: string, status: string, message: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order || !order.user.phone) {
      return { success: false, error: 'Order or phone not found' };
    }

    const fullMessage = `
📦 *Delivery Update*

Order #: ${order.orderNumber}
Status: ${status}

${message}
    `.trim();

    const conversation = await this.getOrCreateConversation(
      order.user.phone,
      order.userId
    );

    const response = await this.sendMessage(order.user.phone, fullMessage);

    if (response) {
      await this.saveOutgoingMessage(
        conversation.id,
        response.messages[0].id,
        fullMessage
      );
    }

    return { success: true };
  }

  /**
   * Send product availability notification
   */
  async sendProductAvailabilityNotification(userId: string, productName: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.phone) {
      return { success: false };
    }

    const message = `
✨ *Product Back in Stock!*

${productName} is now available!

Shop now: ${process.env.FRONTEND_URL}/products
    `.trim();

    const conversation = await this.getOrCreateConversation(user.phone, userId);

    const response = await this.sendMessage(user.phone, message);

    if (response) {
      await this.saveOutgoingMessage(
        conversation.id,
        response.messages[0].id,
        message
      );
    }

    return { success: true };
  }

  /**
   * Send cart abandonment reminder
   */
  async sendCartAbandonmentReminder(userId: string, cartItems: any[]) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.phone) {
      return { success: false };
    }

    const itemsList = cartItems
      .map((item) => `• ${item.product.name} - KES ${item.product.price}`)
      .join('\n');

    const message = `
🛒 *You left items in your cart!*

${itemsList}

Complete your purchase now and get them delivered!

Checkout: ${process.env.FRONTEND_URL}/checkout
    `.trim();

    const conversation = await this.getOrCreateConversation(user.phone, userId);

    const response = await this.sendMessage(user.phone, message);

    if (response) {
      await this.saveOutgoingMessage(
        conversation.id,
        response.messages[0].id,
        message
      );
    }

    return { success: true };
  }

  /**
   * Handle incoming webhook from WhatsApp
   */
  async handleWebhook(webhookData: any) {
    // Webhook verification
    if (webhookData.object !== 'whatsapp_business_account') {
      return { success: false };
    }

    const entry = webhookData.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return { success: false };

    // Handle message status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        await this.updateMessageStatus(status.id, status.status);
      }
    }

    // Handle incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        await this.processIncomingMessage(message, value.contacts?.[0]);
      }
    }

    return { success: true };
  }

  /**
   * Process incoming WhatsApp message
   */
  private async processIncomingMessage(message: any, contact: any) {
    const phoneNumber = message.from;
    const type = message.type;
    let content = '';
    let mediaUrl: string | undefined;

    switch (type) {
      case 'text':
        content = message.text.body;
        break;
      case 'image':
        content = message.image.caption || 'Image';
        mediaUrl = message.image.id; // In production, download this
        break;
      case 'document':
        content = message.document.caption || message.document.filename;
        mediaUrl = message.document.id;
        break;
      default:
        content = `Unsupported message type: ${type}`;
    }

    await this.saveIncomingMessage(
      phoneNumber,
      message.id,
      content,
      type.toUpperCase() as WhatsAppMessageType,
      mediaUrl
    );

    // Auto-respond with menu or forward to support
    await this.autoRespond(phoneNumber, content);
  }

  /**
   * Auto-respond to common queries
   */
  private async autoRespond(phoneNumber: string, message: string) {
    const lowerMessage = message.toLowerCase();

    let response = '';

    if (lowerMessage.includes('help') || lowerMessage === 'hi' || lowerMessage === 'hello') {
      response = `
👋 Welcome to our marketplace!

Reply with:
1️⃣ Browse products
2️⃣ Track order
3️⃣ Support

How can we help you today?
      `.trim();
    } else if (lowerMessage.includes('order') || lowerMessage === '2') {
      response = `
📦 Track your order:

Please provide your order number or visit:
${process.env.FRONTEND_URL}/orders
      `.trim();
    } else if (lowerMessage.includes('products') || lowerMessage === '1') {
      response = `
🛍️ Browse our products:

${process.env.FRONTEND_URL}/products

Or tell us what you're looking for!
      `.trim();
    } else if (lowerMessage.includes('support') || lowerMessage === '3') {
      response = `
💬 Our support team will respond shortly.

For urgent issues, call: ${process.env.SUPPORT_PHONE || '+254712345678'}
      `.trim();
    }

    if (response) {
      await this.sendMessage(phoneNumber, response);
    }
  }

  /**
   * Update message status
   */
  private async updateMessageStatus(waMessageId: string, status: string) {
    const statusMap: Record<string, WhatsAppMessageStatus> = {
      sent: WhatsAppMessageStatus.SENT,
      delivered: WhatsAppMessageStatus.DELIVERED,
      read: WhatsAppMessageStatus.READ,
      failed: WhatsAppMessageStatus.FAILED,
    };

    const mappedStatus = statusMap[status] || WhatsAppMessageStatus.SENT;

    await prisma.whatsAppMessage.updateMany({
      where: { waMessageId },
      data: { status: mappedStatus },
    });
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string) {
    await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { isActive: false },
    });
  }

  /**
   * Search conversations
   */
  async searchConversations(query: string) {
    const conversations = await prisma.whatsAppConversation.findMany({
      where: {
        OR: [
          { phoneNumber: { contains: query } },
          { customerName: { contains: query, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        ],
      },
      include: {
        user: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: 20,
    });

    return conversations;
  }
}

export default new WhatsAppService();
