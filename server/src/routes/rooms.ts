import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/rooms
 * Get all rooms with optional building filter
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { buildingId, status } = req.query;

    let query = supabaseAdmin
      .from('rooms')
      .select(`
        *,
        building:buildings(id, name),
        account:accounts(
          id,
          primary_email,
          status,
          move_in_date,
          tenants(id, first_name, last_name, email, is_primary, status)
        )
      `)
      .order('room_number');

    if (buildingId) {
      query = query.eq('building_id', buildingId as string);
    }

    if (status) {
      query = query.eq('status', status as string);
    }

    const { data: rooms, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Flatten account array (since it's a one-to-one relation via unique constraint)
    const roomsFormatted = rooms.map((room: any) => ({
      ...room,
      account: room.account?.[0] || null,
    }));

    res.json({ rooms: roomsFormatted });
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

/**
 * GET /api/rooms/:id
 * Get a single room with full details
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .select(`
        *,
        building:buildings(*),
        account:accounts(
          *,
          tenants(*),
          bills:bills(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Flatten account
    const formattedRoom = {
      ...room,
      account: room.account?.[0] || null,
    };

    res.json({ room: formattedRoom });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

/**
 * PUT /api/rooms/:id
 * Update a room
 */
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { roomNumber, floor, capacity, status, monthlyRate } = req.body;

    const updateData: any = {};
    if (roomNumber !== undefined) updateData.room_number = roomNumber;
    if (floor !== undefined) updateData.floor = floor;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (status !== undefined) updateData.status = status;
    if (monthlyRate !== undefined) updateData.monthly_rate = monthlyRate;

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ room });
  } catch (err) {
    console.error('Update room error:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

/**
 * POST /api/rooms/:id/account
 * Create an account for a room (when first tenant moves in)
 */
router.post('/:id/account', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { primaryEmail, moveInDate } = req.body;

    if (!primaryEmail) {
      res.status(400).json({ error: 'Primary email is required' });
      return;
    }

    // Check if room already has an account
    const { data: existing } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('room_id', id)
      .single();

    if (existing) {
      res.status(400).json({ error: 'Room already has an account' });
      return;
    }

    const { data: account, error } = await supabaseAdmin
      .from('accounts')
      .insert({
        room_id: id,
        primary_email: primaryEmail,
        move_in_date: moveInDate || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Update room status to occupied
    await supabaseAdmin
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', id);

    res.status(201).json({ account });
  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

export default router;
