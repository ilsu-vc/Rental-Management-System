import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'super_admin' | 'tenant';
        tenantId?: string;
        accountId?: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token from Supabase Auth
 * and attach user info to the request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // TOUR MODE BYPASS
    if (token === 'mock-tour-token') {
      req.user = {
        id: '6181e844-8626-499b-929c-bd9918ed5a51',
        email: 'luisyuvicente04@gmail.com',
        role: 'admin',
      };
      next();
      return;
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Check if user is an admin
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (adminProfile) {
      req.user = {
        id: user.id,
        email: user.email!,
        role: adminProfile.role as 'admin' | 'super_admin',
      };
      next();
      return;
    }

    // Check if user is a tenant
    const { data: tenantProfile } = await supabaseAdmin
      .from('tenants')
      .select('id, account_id')
      .eq('auth_user_id', user.id)
      .single();

    if (tenantProfile) {
      req.user = {
        id: user.id,
        email: user.email!,
        role: 'tenant',
        tenantId: tenantProfile.id,
        accountId: tenantProfile.account_id,
      };
      next();
      return;
    }

    res.status(403).json({ error: 'User profile not found' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to restrict access to admin-only routes
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

/**
 * Middleware to restrict access to tenant-only routes
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'tenant') {
    res.status(403).json({ error: 'Tenant access required' });
    return;
  }
  next();
};
