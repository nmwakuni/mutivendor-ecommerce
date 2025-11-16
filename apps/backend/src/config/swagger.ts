import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Multi-Vendor Marketplace API',
    version: '1.0.0',
    description: `
      **Complete REST API for a cutting-edge multi-vendor e-commerce marketplace**

      This API provides comprehensive endpoints for:
      - Authentication & Authorization
      - Product Management
      - Order Processing & Payments
      - Multi-Vendor Operations
      - Loyalty & Rewards Program
      - Affiliate Marketing
      - Live Shopping/Streaming
      - AI Chatbot Assistant
      - Social Shopping (Gift Registries, Wishlists)
      - Escrow & Dispute Resolution
      - Vendor Verification (KYC/KYB)
      - Smart Notifications (Multi-channel)
      - Advanced Vendor Analytics
      - And much more!

      ## Authentication
      Most endpoints require authentication using JWT tokens.
      Include the token in the Authorization header:
      \`Authorization: Bearer <your_jwt_token>\`

      ## Rate Limiting
      API requests are rate-limited to prevent abuse.

      ## Pagination
      List endpoints support pagination with \`page\` and \`limit\` query parameters.
    `,
    contact: {
      name: 'API Support',
      email: 'support@marketplace.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `${config.app.backendUrl}/api/v1`,
      description: 'Development server',
    },
    {
      url: 'https://api.marketplace.com/api/v1',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
    },
    schemas: {
      // Common schemas
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'Error message',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Operation successful',
          },
          data: {
            type: 'object',
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1,
          },
          limit: {
            type: 'integer',
            example: 20,
          },
          total: {
            type: 'integer',
            example: 100,
          },
          totalPages: {
            type: 'integer',
            example: 5,
          },
        },
      },

      // User & Auth schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          firstName: {
            type: 'string',
          },
          lastName: {
            type: 'string',
          },
          phone: {
            type: 'string',
          },
          role: {
            type: 'string',
            enum: ['CUSTOMER', 'VENDOR', 'ADMIN'],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      // Product schemas
      Product: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          name: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          price: {
            type: 'number',
            format: 'decimal',
          },
          stock: {
            type: 'integer',
          },
          images: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uri',
            },
          },
          vendorId: {
            type: 'string',
            format: 'uuid',
          },
          categoryId: {
            type: 'string',
            format: 'uuid',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      // Order schemas
      Order: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          userId: {
            type: 'string',
            format: 'uuid',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
          },
          total: {
            type: 'number',
            format: 'decimal',
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      // Loyalty schemas
      LoyaltyBalance: {
        type: 'object',
        properties: {
          balance: {
            type: 'integer',
            description: 'Current loyalty points balance',
          },
          tier: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              name: {
                type: 'string',
              },
              benefits: {
                type: 'string',
              },
            },
          },
        },
      },

      // Chatbot schemas
      ChatMessage: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
          response: {
            type: 'string',
          },
          sessionId: {
            type: 'string',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      // Notification schemas
      Notification: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          type: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
          isRead: {
            type: 'boolean',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      ValidationError: {
        description: 'Invalid request data',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
    parameters: {
      pageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Products',
      description: 'Product management endpoints',
    },
    {
      name: 'Orders',
      description: 'Order processing and management',
    },
    {
      name: 'Vendors',
      description: 'Vendor account management',
    },
    {
      name: 'Payments',
      description: 'Payment processing endpoints',
    },
    {
      name: 'Categories',
      description: 'Product category management',
    },
    {
      name: 'Reviews',
      description: 'Product reviews and ratings',
    },
    {
      name: 'Coupons',
      description: 'Discount coupons and promotions',
    },
    {
      name: 'Loyalty & Rewards',
      description: 'Loyalty points and rewards program',
    },
    {
      name: 'Affiliates',
      description: 'Affiliate marketing program',
    },
    {
      name: 'Live Streaming',
      description: 'Live shopping and streaming platform',
    },
    {
      name: 'Chatbot',
      description: 'AI-powered chatbot assistance',
    },
    {
      name: 'Social Shopping',
      description: 'Gift registries, wishlists, and social features',
    },
    {
      name: 'Escrow & Disputes',
      description: 'Payment escrow and dispute resolution',
    },
    {
      name: 'Verification',
      description: 'Vendor KYC/KYB verification',
    },
    {
      name: 'Notifications',
      description: 'Multi-channel notification system',
    },
    {
      name: 'Vendor Analytics',
      description: 'Advanced analytics and reporting for vendors',
    },
  ],
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
