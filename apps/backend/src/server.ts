import { createApp } from './app';
import { config } from './config/env';
import { logger } from './config/logger';
import { initPostHog, posthog } from './config/posthog';
import { redis } from './config/redis';
import { prisma } from './config/database';

const app = createApp();

// Initialize PostHog
initPostHog();

const server = app.listen(config.app.port, () => {
  logger.info(`🚀 Server running on port ${config.app.port}`);
  logger.info(`📝 Environment: ${config.app.env}`);
  logger.info(`🌍 API URL: ${config.app.apiUrl}`);
  logger.info(`🖥️  Frontend URL: ${config.app.frontendUrl}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connections
      await prisma.$disconnect();
      logger.info('Database connection closed');

      // Close Redis connection
      await redis.quit();
      logger.info('Redis connection closed');

      // Shutdown PostHog
      await posthog.shutdown();
      logger.info('PostHog client shut down');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
  throw reason;
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default server;
