import express, { Application } from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { logger } from './config/logger';
import { initSentry, Sentry } from './config/sentry';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { generalLimiter } from './middleware/rate-limit';
import { inngestHandler } from './inngest';

// Import routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import vendorRoutes from './routes/vendor.routes';
import paymentRoutes from './routes/payment.routes';
import categoryRoutes from './routes/category.routes';
import reviewRoutes from './routes/review.routes';
import couponRoutes from './routes/coupon.routes';
import advancedRoutes from './routes/index'; // Advanced features routes

export const createApp = (): Application => {
  const app = express();

  // Initialize Sentry
  initSentry();
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  app.use(
    cors({
      origin: config.app.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Compression
  app.use(compression());

  // Rate limiting
  app.use(generalLimiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.app.env,
    });
  });

  // Inngest endpoint (background jobs)
  app.use('/api/inngest', inngestHandler);

  // API Routes
  const apiRouter = express.Router();

  // API v1 routes
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/products', productRoutes);
  apiRouter.use('/orders', orderRoutes);
  apiRouter.use('/vendors', vendorRoutes);
  apiRouter.use('/payments', paymentRoutes);
  apiRouter.use('/categories', categoryRoutes);
  apiRouter.use('/reviews', reviewRoutes);
  apiRouter.use('/coupons', couponRoutes);

  // Advanced features routes (loyalty, affiliates, livestreams, chatbot, social, escrow, verification, notifications, analytics)
  apiRouter.use('/', advancedRoutes);

  app.use('/api/v1', apiRouter);

  logger.info('All API routes registered');

  // Sentry error handler (must be before other error handlers)
  app.use(Sentry.Handlers.errorHandler());

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('Express app initialized');

  return app;
};
