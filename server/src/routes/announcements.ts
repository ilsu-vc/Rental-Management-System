import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/announcements
 * Get all announcements (active only for tenants)
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    let query = supabaseAdmin
      .from('announcements')
      .select(`
        *,
        building:buildings(id, name)
      `)
      .order('created_at', { ascending: false });

    // Tenants only see active announcements
    if (req.user?.role === 'tenant') {
      query = query.eq('is_active', true);
    }

    const { data: announcements, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ announcements });
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

/**
 * GET /api/announcements/:id
 * Get a single announcement
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .select(`
        *,
        building:buildings(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }

    res.json({ announcement });
  } catch (err) {
    console.error('Get announcement error:', err);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

/**
 * POST /api/announcements
 * Create a new announcement
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, priority, targetBuildingId } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        content,
        priority: priority || 'normal',
        target_building_id: targetBuildingId || null,
        posted_by: req.user!.id,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ announcement });
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

/**
 * PUT /api/announcements/:id
 * Update an announcement
 */
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, priority, isActive, targetBuildingId } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (priority !== undefined) updateData.priority = priority;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (targetBuildingId !== undefined) updateData.target_building_id = targetBuildingId;

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ announcement });
  } catch (err) {
    console.error('Update announcement error:', err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

/**
 * DELETE /api/announcements/:id
 * Delete an announcement
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error('Delete announcement error:', err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
