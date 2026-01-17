import { NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter
 * For production with multiple servers, consider using Redis-based rate limiting
 * such as @upstash/ratelimit with @upstash/redis
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  max: number;
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  /**
   * Custom message to return when rate limit is exceeded
   */
  message?: string;
}

/**
 * Rate limiting middleware for API routes
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns NextResponse with 429 status if rate limit exceeded, null otherwise
 */
export async function rateLimitMiddleware(
  identifier: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  // Initialize or get existing rate limit data
  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + config.windowMs
    };
    return null; // Allow request
  }

  // Increment request count
  store[key].count++;

  // Check if limit exceeded
  if (store[key].count > config.max) {
    const remaining = 0;
    const resetTime = Math.ceil((store[key].resetTime - now) / 1000);

    return NextResponse.json(
      {
        error: config.message || 'Too many requests',
        retryAfter: resetTime
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': store[key].resetTime.toString(),
          'Retry-After': resetTime.toString()
        }
      }
    );
  }

  // Allow request
  return null;
}

/**
 * Get client identifier from request (IP address or user ID)
 * @param request - Next.js request object
 * @param userId - Optional user ID for authenticated requests
 * @returns Identifier string
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from headers (common proxy headers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown';

  return `ip:${ip}`;
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /** Very strict - 3 requests per minute (for sensitive operations like lead capture) */
  strict: {
    max: 3,
    windowMs: 60 * 1000
  },
  /** Standard - 10 requests per minute (for public endpoints) */
  standard: {
    max: 10,
    windowMs: 60 * 1000
  },
  /** Moderate - 30 requests per minute (for authenticated endpoints) */
  moderate: {
    max: 30,
    windowMs: 60 * 1000
  },
  /** Relaxed - 100 requests per minute (for high-traffic authenticated endpoints) */
  relaxed: {
    max: 100,
    windowMs: 60 * 1000
  }
} as const;
