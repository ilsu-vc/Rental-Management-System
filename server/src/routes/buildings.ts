import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/buildings
 * Get all buildings with room counts and occupancy stats
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: buildings, error } = await supabaseAdmin
      .from('buildings')
      .select(`
        *,
        rooms(id, status)
      `)
      .order('name');

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Add occupancy stats
    const buildingsWithStats = buildings.map((building: any) => {
      const rooms = building.rooms || [];
      const occupied = rooms.filter((r: any) => r.status === 'occupied').length;
      const vacant = rooms.filter((r: any) => r.status === 'vacant').length;
      const maintenance = rooms.filter((r: any) => r.status === 'maintenance').length;

      return {
        ...building,
        stats: {
          total: rooms.length,
          occupied,
          vacant,
          maintenance,
          occupancyRate: rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0,
        },
        rooms: undefined, // Remove individual rooms from the list view
      };
    });

    res.json({ buildings: buildingsWithStats });
  } catch (err) {
    console.error('Get buildings error:', err);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

/**
 * GET /api/buildings/:id
 * Get a single building with full room details
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: building, error } = await supabaseAdmin
      .from('buildings')
      .select(`
        *,
        rooms(
          *,
          account:accounts(
            *,
            tenants(*)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      res.status(404).json({ error: 'Building not found' });
      return;
    }

    res.json({ building });
  } catch (err) {
    console.error('Get building error:', err);
    res.status(500).json({ error: 'Failed to fetch building' });
  }
});

/**
 * POST /api/buildings
 * Create a new building
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, description, totalRooms } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Building name is required' });
      return;
    }

    const { data: building, error } = await supabaseAdmin
      .from('buildings')
      .insert({
        name,
        address: address || null,
        description: description || null,
        total_rooms: totalRooms || 15,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Auto-create rooms for the building
    const roomCount = totalRooms || 15;
    const rooms = [];
    for (let i = 1; i <= roomCount; i++) {
      rooms.push({
        building_id: building.id,
        room_number: `R${String(i).padStart(2, '0')}`,
        floor: Math.ceil(i / 5),
        capacity: 4,
        monthly_rate: 5000.00,
      });
    }

    await supabaseAdmin.from('rooms').insert(rooms);

    res.status(201).json({ building });
  } catch (err) {
    console.error('Create building error:', err);
    res.status(500).json({ error: 'Failed to create building' });
  }
});

/**
 * PUT /api/buildings/:id
 * Update a building
 */
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address, description } = req.body;

    const { data: building, error } = await supabaseAdmin
      .from('buildings')
      .update({ name, address, description })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ building });
  } catch (err) {
    console.error('Update building error:', err);
    res.status(500).json({ error: 'Failed to update building' });
  }
});

/**
 * DELETE /api/buildings/:id
 * Delete a building (cascade deletes rooms, accounts, tenants, bills)
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('buildings')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Building deleted successfully' });
  } catch (err) {
    console.error('Delete building error:', err);
    res.status(500).json({ error: 'Failed to delete building' });
  }
});

export default router;
