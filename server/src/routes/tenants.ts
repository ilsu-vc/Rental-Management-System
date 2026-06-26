import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/tenants
 * Get all tenants with optional account filter
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, buildingId, status } = req.query;

    let query = supabaseAdmin
      .from('tenants')
      .select(`
        *,
        account:accounts(
          id,
          primary_email,
          room:rooms(
            id,
            room_number,
            building:buildings(id, name)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId as string);
    }

    if (status) {
      query = query.eq('status', status as string);
    }

    const { data: tenants, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // If buildingId filter, filter in memory (Supabase doesn't support deep nested filters easily)
    let filteredTenants = tenants;
    if (buildingId) {
      filteredTenants = tenants.filter((t: any) =>
        t.account?.room?.building?.id === buildingId
      );
    }

    res.json({ tenants: filteredTenants });
  } catch (err) {
    console.error('Get tenants error:', err);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

/**
 * GET /api/tenants/:id
 * Get a single tenant with full details
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select(`
        *,
        account:accounts(
          *,
          room:rooms(
            *,
            building:buildings(*)
          ),
          tenants(id, first_name, last_name, email, is_primary, status)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json({ tenant });
  } catch (err) {
    console.error('Get tenant error:', err);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

/**
 * POST /api/tenants
 * Add a new tenant to an account (without creating auth user)
 * Use /api/auth/register-tenant to create with login access
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, firstName, lastName, email, phone, isPrimary } = req.body;

    if (!accountId || !firstName || !lastName || !email) {
      res.status(400).json({ error: 'Missing required fields: accountId, firstName, lastName, email' });
      return;
    }

    // Check account exists
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id, room_id')
      .eq('id', accountId)
      .single();

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    // Check room capacity
    const { data: existingTenants } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('account_id', accountId)
      .eq('status', 'active');

    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('capacity')
      .eq('id', account.room_id)
      .single();

    if (room && existingTenants && existingTenants.length >= room.capacity) {
      res.status(400).json({ error: `Room capacity (${room.capacity}) reached` });
      return;
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        account_id: accountId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        is_primary: isPrimary || false,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // If this is primary, update account primary email
    if (isPrimary) {
      await supabaseAdmin
        .from('accounts')
        .update({ primary_email: email })
        .eq('id', accountId);
    }

    // Update room status
    await supabaseAdmin
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', account.room_id);

    res.status(201).json({ tenant });
  } catch (err) {
    console.error('Create tenant error:', err);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

/**
 * PUT /api/tenants/:id
 * Update a tenant
 */
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, isPrimary, status } = req.body;

    const updateData: any = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (isPrimary !== undefined) updateData.is_primary = isPrimary;
    if (status !== undefined) updateData.status = status;

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // If set as primary, update account and remove primary from others
    if (isPrimary && email) {
      await supabaseAdmin
        .from('accounts')
        .update({ primary_email: email })
        .eq('id', tenant.account_id);

      await supabaseAdmin
        .from('tenants')
        .update({ is_primary: false })
        .eq('account_id', tenant.account_id)
        .neq('id', id);
    }

    res.json({ tenant });
  } catch (err) {
    console.error('Update tenant error:', err);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

/**
 * DELETE /api/tenants/:id
 * Remove a tenant (soft delete by setting status to inactive)
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    // Get tenant info before deletion
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('account_id')
      .eq('id', id)
      .single();

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    if (hard === 'true') {
      // Hard delete
      const { error } = await supabaseAdmin
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
    } else {
      // Soft delete
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ status: 'inactive' })
        .eq('id', id);

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
    }

    // Check if account has any active tenants left, if not set room to vacant
    const { data: remainingTenants } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('account_id', tenant.account_id)
      .eq('status', 'active');

    if (!remainingTenants || remainingTenants.length === 0) {
      const { data: account } = await supabaseAdmin
        .from('accounts')
        .select('room_id')
        .eq('id', tenant.account_id)
        .single();

      if (account) {
        await supabaseAdmin
          .from('rooms')
          .update({ status: 'vacant' })
          .eq('id', account.room_id);
      }
    }

    res.json({ message: 'Tenant removed successfully' });
  } catch (err) {
    console.error('Delete tenant error:', err);
    res.status(500).json({ error: 'Failed to remove tenant' });
  }
});

export default router;
