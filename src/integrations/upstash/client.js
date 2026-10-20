import { Redis } from '@upstash/redis';
import { env } from '../../config/env.js';

// Shared Upstash Redis client for durable state that must survive stateless Vercel invocations.
export const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
});
