import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

/**
 * BACKEND JWT VERIFICATION MIDDLEWARE
 * ===================================
 * Verify Supabase JWT tokens on every API request
 * Protects sensitive routes and ensures user identity
 */

// Initialize Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '', // Use service role key for admin operations
);

// ============================================
// TYPE DEFINITIONS
// ============================================

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
        metadata?: Record<string, unknown>;
      };
    }
  }
}

interface AuthToken {
  sub: string;
  email: string;
  role?: string;
  aud: string;
  iat: number;
  exp: number;
}

// ============================================
// JWT VERIFICATION MIDDLEWARE
// ============================================

/**
 * Main authentication middleware
 * Verifies JWT and attaches user data to request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: data.user.id,
      email: data.user.email || '',
      role: data.user.user_metadata?.role as string | undefined,
      metadata: data.user.user_metadata,
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

// ============================================
// OPTIONAL AUTH MIDDLEWARE
// ============================================

/**
 * Optional authentication middleware
 * Doesn't fail if token is missing, but verifies if present
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      const { data, error } = await supabase.auth.getUser(token);

      if (data.user) {
        req.user = {
          id: data.user.id,
          email: data.user.email || '',
          role: data.user.user_metadata?.role as string | undefined,
          metadata: data.user.user_metadata,
        };
      }
    }

    next();
  } catch (error) {
    console.error('[Optional Auth Middleware] Error:', error);
    next(); // Continue even if error
  }
};

// ============================================
// ROLE-BASED MIDDLEWARE
// ============================================

/**
 * Require specific role
 * Use: app.get('/admin', requireRole('admin'), handler)
 */
export const requireRole =
  (requiredRole: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    if (req.user.role !== requiredRole) {
      res.status(403).json({
        success: false,
        error: `Role '${requiredRole}' required`,
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }

    next();
  };

/**
 * Require one of multiple roles
 * Use: app.get('/admin', requireRoles(['admin', 'moderator']), handler)
 */
export const requireRoles =
  (requiredRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    if (!req.user.role || !requiredRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `One of roles [${requiredRoles.join(', ')}] required`,
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }

    next();
  };

// ============================================
// USER DATA FETCH MIDDLEWARE
// ============================================

/**
 * Fetch user profile from database
 * Automatically populates req.user.profile
 */
export const fetchUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user?.id) {
      next();
      return;
    }

    // Fetch user profile from public.users table
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.warn('[Fetch Profile] Error:', error.message);
      // Continue without profile
      next();
      return;
    }

    // Attach profile to user object
    (req.user as any).profile = profile;

    next();
  } catch (error) {
    console.error('[Fetch Profile] Error:', error);
    next(); // Continue even if error
  }
};

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limit by user ID
 * Use: app.use('/api', rateLimitByUser(100, 60)) // 100 requests per 60 seconds
 */
export const rateLimitByUser =
  (maxRequests: number, windowSeconds: number) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let userLimit = requestCounts.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      userLimit = { count: 0, resetTime: now + windowMs };
      requestCounts.set(userId, userLimit);
    }

    userLimit.count++;

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - userLimit.count));
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(userLimit.resetTime).toISOString(),
    );

    if (userLimit.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };

// ============================================
// CORS & SECURITY HEADERS
// ============================================

/**
 * Security headers middleware
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
  res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Enable XSS protection
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // HTTPS only
  res.setHeader('Content-Security-Policy', "default-src 'self'"); // CSP policy

  next();
};

// ============================================
// ERROR HANDLERS
// ============================================

/**
 * 404 handler
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
  });
};

/**
 * Global error handler
 */
export const errorHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('[Error Handler]', error);

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
  });
};

// ============================================
// MIDDLEWARE SETUP FUNCTION
// ============================================

/**
 * Setup all auth-related middleware
 * Use: setupAuthMiddleware(app)
 */
export const setupAuthMiddleware = (app: any): void => {
  app.use(securityHeaders);
  app.use(authMiddleware); // Require auth on all routes
  app.use(rateLimitByUser(100, 60)); // 100 requests per minute
  app.use(fetchUserProfile); // Fetch user profile if authenticated
};

export default authMiddleware;
