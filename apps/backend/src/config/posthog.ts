import { PostHog } from 'posthog-node';
import { config } from './env';
import { logger } from './logger';

let posthogClient: PostHog | null = null;

export const initPostHog = () => {
  if (!config.posthog.apiKey || !config.posthog.host) {
    logger.warn('PostHog not configured, analytics disabled');
    return null;
  }

  posthogClient = new PostHog(config.posthog.apiKey, {
    host: config.posthog.host,
  });

  logger.info('PostHog initialized');
  return posthogClient;
};

export const posthog = {
  capture: (event: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }) => {
    if (!posthogClient) return;

    try {
      posthogClient.capture(event);
    } catch (error) {
      logger.error('PostHog capture error:', error);
    }
  },

  identify: (userId: string, properties?: Record<string, unknown>) => {
    if (!posthogClient) return;

    try {
      posthogClient.identify({
        distinctId: userId,
        properties,
      });
    } catch (error) {
      logger.error('PostHog identify error:', error);
    }
  },

  async shutdown() {
    if (posthogClient) {
      await posthogClient.shutdown();
    }
  },
};

export default posthog;
