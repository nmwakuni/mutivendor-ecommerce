import { prisma } from '../lib/prisma';
import { ChatRole } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import axios from 'axios';

// Configure AI provider (OpenAI, Anthropic, etc.)
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4';

class ChatbotService {
  /**
   * Get or create conversation
   */
  async getOrCreateConversation(userId?: string, sessionId?: string) {
    if (userId) {
      let conversation = await prisma.chatConversation.findFirst({
        where: { userId, isActive: true },
        orderBy: { lastMessageAt: 'desc' },
      });

      if (!conversation) {
        conversation = await prisma.chatConversation.create({
          data: {
            userId,
            sessionId: sessionId || this.generateSessionId(),
          },
        });
      }

      return conversation;
    }

    // Anonymous user
    if (!sessionId) {
      sessionId = this.generateSessionId();
    }

    let conversation = await prisma.chatConversation.findUnique({
      where: { sessionId },
    });

    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: { sessionId },
      });
    }

    return conversation;
  }

  /**
   * Send message and get AI response
   */
  async chat(message: string, userId?: string, sessionId?: string) {
    const conversation = await this.getOrCreateConversation(userId, sessionId);

    // Save user message
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatRole.USER,
        content: message,
      },
    });

    // Get conversation history
    const history = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20, // Last 20 messages for context
    });

    // Get user context for personalization
    const userContext = userId ? await this.getUserContext(userId) : null;

    // Generate AI response
    const aiResponse = await this.generateResponse(message, history, userContext);

    // Save AI response
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatRole.ASSISTANT,
        content: aiResponse.content,
        metadata: aiResponse.metadata,
      },
    });

    // Update conversation
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        title: conversation.title || this.generateTitle(message),
      },
    });

    return {
      message: aiResponse.content,
      metadata: aiResponse.metadata,
      conversationId: conversation.id,
    };
  }

  /**
   * Generate AI response
   */
  private async generateResponse(
    userMessage: string,
    history: any[],
    userContext: any
  ) {
    // Check for intent
    const intent = this.detectIntent(userMessage);

    // Handle specific intents
    if (intent.type === 'product_search') {
      return await this.handleProductSearch(intent.query, userContext);
    }

    if (intent.type === 'order_tracking') {
      return await this.handleOrderTracking(intent.orderNumber, userContext);
    }

    if (intent.type === 'product_recommendation') {
      return await this.handleProductRecommendation(userContext);
    }

    // General conversation with AI
    return await this.callAI(userMessage, history, userContext);
  }

  /**
   * Detect user intent from message
   */
  private detectIntent(message: string): { type: string; query?: string; orderNumber?: string } {
    const lowerMessage = message.toLowerCase();

    // Product search patterns
    const searchPatterns = [
      /(?:looking for|search|find|show me|need)\s+(.+)/i,
      /(?:do you have|got any)\s+(.+)/i,
    ];

    for (const pattern of searchPatterns) {
      const match = message.match(pattern);
      if (match) {
        return { type: 'product_search', query: match[1].trim() };
      }
    }

    // Order tracking patterns
    const orderPatterns = [
      /(?:track|where is|status of)\s+(?:order|my order)\s*#?(\w+)/i,
      /order\s+#?(\w+)/i,
    ];

    for (const pattern of orderPatterns) {
      const match = message.match(pattern);
      if (match) {
        return { type: 'order_tracking', orderNumber: match[1] };
      }
    }

    // Recommendation patterns
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      return { type: 'product_recommendation' };
    }

    return { type: 'general' };
  }

  /**
   * Handle product search
   */
  private async handleProductSearch(query: string, userContext: any) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        vendor: {
          select: {
            businessName: true,
          },
        },
      },
      take: 5,
    });

    if (products.length === 0) {
      return {
        content: `I couldn't find any products matching "${query}". Would you like to browse our categories or try a different search?`,
        metadata: { type: 'no_results' },
      };
    }

    const productList = products.map((p, i) =>
      `${i + 1}. **${p.name}** - KES ${p.price} (by ${p.vendor.businessName})\n   ${process.env.FRONTEND_URL}/products/${p.slug}`
    ).join('\n\n');

    return {
      content: `Here are some products I found for "${query}":\n\n${productList}\n\nWould you like more details about any of these?`,
      metadata: { type: 'product_results', products: products.map(p => p.id) },
    };
  }

  /**
   * Handle order tracking
   */
  private async handleOrderTracking(orderNumber: string, userContext: any) {
    if (!userContext) {
      return {
        content: 'Please log in to track your orders.',
        metadata: { type: 'auth_required' },
      };
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: { contains: orderNumber, mode: 'insensitive' },
        userId: userContext.userId,
      },
      include: {
        delivery: true,
      },
    });

    if (!order) {
      return {
        content: `I couldn't find order #${orderNumber} in your account. Please check the order number and try again.`,
        metadata: { type: 'order_not_found' },
      };
    }

    let statusMessage = '';
    switch (order.status) {
      case 'PENDING':
        statusMessage = 'Your order is pending confirmation.';
        break;
      case 'CONFIRMED':
        statusMessage = 'Your order has been confirmed and is being prepared.';
        break;
      case 'PROCESSING':
        statusMessage = 'Your order is being processed.';
        break;
      case 'SHIPPED':
        statusMessage = `Your order has been shipped! ${order.delivery?.trackingNumber ? `Tracking: ${order.delivery.trackingNumber}` : ''}`;
        break;
      case 'DELIVERED':
        statusMessage = 'Your order has been delivered!';
        break;
      case 'CANCELLED':
        statusMessage = 'This order has been cancelled.';
        break;
    }

    return {
      content: `Order #${order.orderNumber}\n\nStatus: ${order.status}\n${statusMessage}\n\nTotal: KES ${order.total}\nPlaced: ${order.createdAt.toLocaleDateString()}`,
      metadata: { type: 'order_status', orderId: order.id },
    };
  }

  /**
   * Handle product recommendations
   */
  private async handleProductRecommendation(userContext: any) {
    if (!userContext) {
      // Recommend trending products for anonymous users
      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: [{ totalSales: 'desc' }, { rating: 'desc' }],
        take: 5,
        include: {
          vendor: {
            select: {
              businessName: true,
            },
          },
        },
      });

      const productList = products.map((p, i) =>
        `${i + 1}. **${p.name}** - KES ${p.price}\n   ${process.env.FRONTEND_URL}/products/${p.slug}`
      ).join('\n\n');

      return {
        content: `Here are our trending products:\n\n${productList}`,
        metadata: { type: 'recommendations', products: products.map(p => p.id) },
      };
    }

    // Personalized recommendations
    const userOrders = await prisma.order.findMany({
      where: { userId: userContext.userId },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
      take: 5,
    });

    const categoryIds = new Set(
      userOrders.flatMap(order =>
        order.items.map(item => item.product.categoryId)
      )
    );

    const products = await prisma.product.findMany({
      where: {
        categoryId: { in: Array.from(categoryIds) },
        isActive: true,
      },
      orderBy: { rating: 'desc' },
      take: 5,
      include: {
        vendor: {
          select: {
            businessName: true,
          },
        },
      },
    });

    if (products.length === 0) {
      return this.handleProductRecommendation(null); // Fallback to trending
    }

    const productList = products.map((p, i) =>
      `${i + 1}. **${p.name}** - KES ${p.price}\n   ${process.env.FRONTEND_URL}/products/${p.slug}`
    ).join('\n\n');

    return {
      content: `Based on your purchase history, here are some products you might like:\n\n${productList}`,
      metadata: { type: 'personalized_recommendations', products: products.map(p => p.id) },
    };
  }

  /**
   * Call AI service (OpenAI, Anthropic, etc.)
   */
  private async callAI(message: string, history: any[], userContext: any) {
    if (!AI_API_KEY) {
      // Fallback response when AI is not configured
      return {
        content: 'I can help you find products, track orders, and get recommendations. What are you looking for today?',
        metadata: { type: 'fallback' },
      };
    }

    try {
      const systemPrompt = `You are a helpful shopping assistant for an East African e-commerce marketplace.
You help customers find products, track orders, and make purchase decisions.
Be friendly, concise, and helpful. Use Kenyan Shillings (KES) for prices.
${userContext ? `User context: ${JSON.stringify(userContext)}` : ''}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({
          role: h.role === ChatRole.USER ? 'user' : 'assistant',
          content: h.content,
        })),
      ];

      if (AI_PROVIDER === 'openai') {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: AI_MODEL,
            messages,
            max_tokens: 500,
            temperature: 0.7,
          },
          {
            headers: {
              'Authorization': `Bearer ${AI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return {
          content: response.data.choices[0].message.content,
          metadata: { provider: 'openai', model: AI_MODEL },
        };
      } else if (AI_PROVIDER === 'anthropic') {
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: AI_MODEL || 'claude-3-sonnet-20240229',
            messages: messages.filter(m => m.role !== 'system'),
            system: systemPrompt,
            max_tokens: 500,
          },
          {
            headers: {
              'x-api-key': AI_API_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
          }
        );

        return {
          content: response.data.content[0].text,
          metadata: { provider: 'anthropic', model: AI_MODEL },
        };
      }

      return {
        content: 'I apologize, but I\'m having trouble processing your request. Please try again.',
        metadata: { type: 'error' },
      };
    } catch (error: any) {
      console.error('AI service error:', error.response?.data || error.message);
      return {
        content: 'I can help you find products, track orders, and answer questions. What would you like to know?',
        metadata: { type: 'error_fallback' },
      };
    }
  }

  /**
   * Get user context for personalization
   */
  private async getUserContext(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        cart: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      userId: user.id,
      firstName: user.firstName,
      orderCount: user.orders.length,
      cartItemCount: user.cart.length,
    };
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: string, limit = 50) {
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages;
  }

  /**
   * Get user conversations
   */
  async getUserConversations(userId: string, limit = 20) {
    const conversations = await prisma.chatConversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
    });

    return conversations;
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string) {
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { isActive: false },
    });
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate conversation title from first message
   */
  private generateTitle(message: string): string {
    return message.length > 50 ? message.substring(0, 47) + '...' : message;
  }
}

export default new ChatbotService();
