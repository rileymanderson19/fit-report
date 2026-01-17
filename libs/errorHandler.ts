import { NextResponse } from 'next/server';

/**
 * Centralized error handler for API routes
 * Ensures sensitive error details are not leaked to clients in production
 */

export interface ApiError {
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Handles API errors and returns appropriate NextResponse
 * In production: Returns generic error messages
 * In development: Returns detailed error information
 *
 * @param error - Error object or unknown error
 * @param context - Optional context about where the error occurred
 * @returns NextResponse with appropriate error message and status code
 */
export function handleApiError(
  error: unknown,
  context?: string
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error server-side (always log, regardless of environment)
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

  // Determine status code and message
  let statusCode = 500;
  let clientMessage = 'An error occurred';
  let details: unknown = undefined;

  if (error instanceof Error) {
    clientMessage = error.message;

    // Check for specific error types
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      statusCode = 400;
    } else if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      statusCode = 401;
      clientMessage = 'Unauthorized';
    } else if (error.message.includes('forbidden') || error.message.includes('Forbidden')) {
      statusCode = 403;
      clientMessage = 'Forbidden';
    } else if (error.message.includes('not found') || error.message.includes('Not found')) {
      statusCode = 404;
      clientMessage = 'Not found';
    }

    // In development, include stack trace
    if (!isProduction) {
      details = {
        message: error.message,
        name: error.name,
        stack: error.stack
      };
    }
  } else if (typeof error === 'object' && error !== null) {
    // Handle error objects from external services
    if (!isProduction) {
      details = error;
    }
  }

  // In production, use generic messages for 500 errors
  if (isProduction && statusCode === 500) {
    clientMessage = 'An internal error occurred';
  }

  const responseBody: {
    error: string;
    details?: unknown;
    context?: string;
  } = {
    error: clientMessage
  };

  if (details) {
    responseBody.details = details;
  }

  if (context && !isProduction) {
    responseBody.context = context;
  }

  return NextResponse.json(responseBody, { status: statusCode });
}

/**
 * Creates a standardized error response for common HTTP status codes
 */
export const ApiErrorResponses = {
  unauthorized: (message = 'Unauthorized') =>
    NextResponse.json({ error: message }, { status: 401 }),

  forbidden: (message = 'Forbidden') =>
    NextResponse.json({ error: message }, { status: 403 }),

  notFound: (message = 'Not found') =>
    NextResponse.json({ error: message }, { status: 404 }),

  badRequest: (message = 'Bad request', details?: unknown) =>
    NextResponse.json(
      { error: message, ...(details && { details }) },
      { status: 400 }
    ),

  tooManyRequests: (message = 'Too many requests', retryAfter?: number) => {
    const headers: HeadersInit = {};
    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString();
    }
    return NextResponse.json({ error: message }, { status: 429, headers });
  },

  internalServerError: (message?: string) => {
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      { error: isProduction ? 'Internal server error' : message || 'Internal server error' },
      { status: 500 }
    );
  }
} as const;

/**
 * Validates that a user is authenticated
 * @param user - User object from Supabase auth
 * @returns NextResponse with 401 if not authenticated, null otherwise
 */
export function requireAuth(user: unknown): NextResponse | null {
  if (!user) {
    return ApiErrorResponses.unauthorized('You must be logged in');
  }
  return null;
}

/**
 * Validates that a user owns a resource
 * @param userId - Authenticated user's ID
 * @param resourceOwnerId - ID of the resource owner
 * @returns NextResponse with 403 if not authorized, null otherwise
 */
export function requireOwnership(
  userId: string,
  resourceOwnerId: string
): NextResponse | null {
  if (userId !== resourceOwnerId) {
    return ApiErrorResponses.forbidden('You do not have access to this resource');
  }
  return null;
}
