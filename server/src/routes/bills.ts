import { Router, Request, Response } from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Multer config for in-memory file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
});

/**
 * GET /api/bills
 * Get all bills with optional filters
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, buildingId, billType, status, startDate, endDate } = req.query;

    let query = supabaseAdmin
      .from('bills')
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
        ),
        payments(*)
      `)
      .order('created_at', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId as string);
    }

    if (billType) {
      query = query.eq('bill_type', billType as string);
    }

    if (status) {
      query = query.eq('status', status as string);
    }

    if (startDate) {
      query = query.gte('due_date', startDate as string);
    }

    if (endDate) {
      query = query.lte('due_date', endDate as string);
    }

    // For tenant users, only show their own bills
    if (req.user?.role === 'tenant') {
      query = query.eq('account_id', req.user.accountId!);
    }

    const { data: bills, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Filter by building if needed
    let filteredBills = bills;
    if (buildingId) {
      filteredBills = bills.filter((b: any) =>
        b.account?.room?.building?.id === buildingId
      );
    }

    res.json({ bills: filteredBills });
  } catch (err) {
    console.error('Get bills error:', err);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

/**
 * GET /api/bills/:id
 * Get a single bill with details
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .select(`
        *,
        account:accounts(
          *,
          room:rooms(
            *,
            building:buildings(*)
          ),
          tenants(id, first_name, last_name, email, is_primary)
        ),
        payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    // Security check for tenants
    if (req.user?.role === 'tenant' && bill.account_id !== req.user.accountId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ bill });
  } catch (err) {
    console.error('Get bill error:', err);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

/**
 * POST /api/bills
 * Create a new bill (admin only)
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, billType, amount, billingPeriod, dueDate, notes } = req.body;

    if (!accountId || !billType || !amount || !dueDate) {
      res.status(400).json({ error: 'Missing required fields: accountId, billType, amount, dueDate' });
      return;
    }

    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .insert({
        account_id: accountId,
        bill_type: billType,
        amount: parseFloat(amount),
        billing_period: billingPeriod || null,
        due_date: dueDate,
        notes: notes || null,
        posted_by: req.user!.id,
      })
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
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ bill });
  } catch (err) {
    console.error('Create bill error:', err);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

/**
 * POST /api/bills/:id/upload
 * Upload a bill image/photo
 */
router.post('/:id/upload', authenticate, requireAdmin, upload.single('billImage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `bill_${id}_${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('bill-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      res.status(400).json({ error: uploadError.message });
      return;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('bill-images')
      .getPublicUrl(fileName);

    // Update bill with image URL
    const { data: bill, error: updateError } = await supabaseAdmin
      .from('bills')
      .update({ image_url: urlData.publicUrl })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      res.status(400).json({ error: updateError.message });
      return;
    }

    res.json({ bill, imageUrl: urlData.publicUrl });
  } catch (err) {
    console.error('Upload bill image error:', err);
    res.status(500).json({ error: 'Failed to upload bill image' });
  }
});

/**
 * PUT /api/bills/:id
 * Update a bill
 */
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, billingPeriod, dueDate, status, notes } = req.body;

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (billingPeriod !== undefined) updateData.billing_period = billingPeriod;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ bill });
  } catch (err) {
    console.error('Update bill error:', err);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

/**
 * DELETE /api/bills/:id
 * Delete a bill
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Delete associated image from storage if exists
    const { data: bill } = await supabaseAdmin
      .from('bills')
      .select('image_url')
      .eq('id', id)
      .single();

    if (bill?.image_url) {
      const fileName = bill.image_url.split('/').pop();
      if (fileName) {
        await supabaseAdmin.storage.from('bill-images').remove([fileName]);
      }
    }

    const { error } = await supabaseAdmin
      .from('bills')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    console.error('Delete bill error:', err);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

/**
 * POST /api/bills/:id/pay
 * Record a payment for a bill
 */
router.post('/:id/pay', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, referenceNumber, notes } = req.body;

    if (!amount) {
      res.status(400).json({ error: 'Payment amount is required' });
      return;
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        bill_id: id,
        amount: parseFloat(amount),
        payment_method: paymentMethod || null,
        reference_number: referenceNumber || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (paymentError) {
      res.status(400).json({ error: paymentError.message });
      return;
    }

    // Calculate total payments for this bill
    const { data: allPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('bill_id', id);

    const totalPaid = allPayments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;

    // Get bill amount
    const { data: bill } = await supabaseAdmin
      .from('bills')
      .select('amount')
      .eq('id', id)
      .single();

    // Update bill status
    let newStatus = 'partial';
    if (bill && totalPaid >= parseFloat(bill.amount)) {
      newStatus = 'paid';
    }

    await supabaseAdmin
      .from('bills')
      .update({ status: newStatus })
      .eq('id', id);

    res.status(201).json({ payment, billStatus: newStatus, totalPaid });
  } catch (err) {
    console.error('Record payment error:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

export default router;
