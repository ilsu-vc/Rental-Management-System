import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    // Determine user role
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    let role = 'tenant';
    let profile: any = null;

    if (adminProfile) {
      role = adminProfile.role;
      profile = adminProfile;
    } else {
      const { data: tenantProfile } = await supabaseAdmin
        .from('tenants')
        .select(`
          *,
          account:accounts(
            *,
            room:rooms(
              *,
              building:buildings(*)
            )
          )
        `)
        .eq('auth_user_id', data.user.id)
        .single();

      if (tenantProfile) {
        profile = tenantProfile;
      }
    }

    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
        profile,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/register
 * Public registration for building admins (landlords)
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      res.status(400).json({ error: authError.message });
      return;
    }

    // Create admin profile
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({
        auth_user_id: authData.user.id,
        full_name: fullName,
        email,
        role: 'admin',
      })
      .select()
      .single();

    if (adminError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      res.status(400).json({ error: adminError.message });
      return;
    }

    res.status(201).json({ admin });
  } catch (err) {
    console.error('Public registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/register-tenant
 * Register a new tenant user account (admin creates this)
 */
router.post('/register-tenant', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      res.status(403).json({ error: 'Only admins can register tenants' });
      return;
    }

    const { email, password, firstName, lastName, phone, accountId, isPrimary } = req.body;

    if (!email || !password || !firstName || !lastName || !accountId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      res.status(400).json({ error: authError.message });
      return;
    }

    // Create tenant record
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        account_id: accountId,
        auth_user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        is_primary: isPrimary || false,
      })
      .select()
      .single();

    if (tenantError) {
      // Clean up auth user if tenant creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      res.status(400).json({ error: tenantError.message });
      return;
    }

    // If primary, update account primary email
    if (isPrimary) {
      await supabaseAdmin
        .from('accounts')
        .update({ primary_email: email })
        .eq('id', accountId);
    }

    // Update room status to occupied
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('room_id')
      .eq('id', accountId)
      .single();

    if (account) {
      await supabaseAdmin
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', account.room_id);
    }

    res.status(201).json({ tenant });
  } catch (err) {
    console.error('Register tenant error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/register-admin
 * Register a new admin user (super_admin only)
 */
router.post('/register-admin', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ error: 'Only super admins can register admins' });
      return;
    }

    const { email, password, fullName } = req.body;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      res.status(400).json({ error: authError.message });
      return;
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({
        auth_user_id: authData.user.id,
        full_name: fullName,
        email,
        role: 'admin',
      })
      .select()
      .single();

    if (adminError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      res.status(400).json({ error: adminError.message });
      return;
    }

    res.status(201).json({ admin });
  } catch (err) {
    console.error('Register admin error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role === 'admin' || req.user?.role === 'super_admin') {
      const { data: profile } = await supabaseAdmin
        .from('admin_profiles')
        .select('*')
        .eq('auth_user_id', req.user.id)
        .single();

      res.json({ user: { ...req.user, profile } });
    } else {
      const { data: profile } = await supabaseAdmin
        .from('tenants')
        .select(`
          *,
          account:accounts(
            *,
            room:rooms(
              *,
              building:buildings(*)
            )
          )
        `)
        .eq('auth_user_id', req.user!.id)
        .single();

      res.json({ user: { ...req.user, profile } });
    }
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
