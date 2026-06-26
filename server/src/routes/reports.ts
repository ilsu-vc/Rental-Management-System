import { Router, Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/reports/summary
 * Get dashboard summary statistics
 */
router.get('/summary', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // Total buildings
    const { count: totalBuildings } = await supabaseAdmin
      .from('buildings')
      .select('*', { count: 'exact', head: true });

    // Total rooms & occupancy
    const { data: rooms } = await supabaseAdmin
      .from('rooms')
      .select('status');

    const totalRooms = rooms?.length || 0;
    const occupiedRooms = rooms?.filter((r: any) => r.status === 'occupied').length || 0;
    const vacantRooms = rooms?.filter((r: any) => r.status === 'vacant').length || 0;

    // Total active tenants
    const { count: totalTenants } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Bills summary
    const { data: bills } = await supabaseAdmin
      .from('bills')
      .select('amount, status, bill_type');

    const totalBills = bills?.length || 0;
    const unpaidBills = bills?.filter((b: any) => b.status === 'unpaid' || b.status === 'overdue').length || 0;
    const totalRevenue = bills?.filter((b: any) => b.status === 'paid')
      .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0) || 0;
    const outstandingAmount = bills?.filter((b: any) => b.status !== 'paid')
      .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0) || 0;

    // Revenue by bill type
    const revenueByType = {
      water: bills?.filter((b: any) => b.bill_type === 'water' && b.status === 'paid')
        .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0) || 0,
      electricity: bills?.filter((b: any) => b.bill_type === 'electricity' && b.status === 'paid')
        .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0) || 0,
      utilities: bills?.filter((b: any) => b.bill_type === 'utilities' && b.status === 'paid')
        .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0) || 0,
    };

    res.json({
      summary: {
        totalBuildings: totalBuildings || 0,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
        totalTenants: totalTenants || 0,
        totalBills,
        unpaidBills,
        totalRevenue,
        outstandingAmount,
        revenueByType,
      },
    });
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * GET /api/reports/revenue
 * Get revenue data for charts (monthly breakdown)
 */
router.get('/revenue', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    const { data: bills, error } = await supabaseAdmin
      .from('bills')
      .select('amount, bill_type, status, due_date, created_at')
      .gte('due_date', `${targetYear}-01-01`)
      .lte('due_date', `${targetYear}-12-31`);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Group by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, index) => {
      const monthBills = bills?.filter((b: any) => {
        const billMonth = new Date(b.due_date).getMonth();
        return billMonth === index;
      }) || [];

      return {
        month,
        water: monthBills.filter((b: any) => b.bill_type === 'water')
          .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0),
        electricity: monthBills.filter((b: any) => b.bill_type === 'electricity')
          .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0),
        utilities: monthBills.filter((b: any) => b.bill_type === 'utilities')
          .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0),
        total: monthBills.reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0),
        paid: monthBills.filter((b: any) => b.status === 'paid')
          .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0),
        unpaid: monthBills.filter((b: any) => b.status !== 'paid')
          .reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0),
      };
    });

    res.json({ year: targetYear, monthly: monthlyData });
  } catch (err) {
    console.error('Get revenue error:', err);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

/**
 * GET /api/reports/occupancy
 * Get occupancy data per building
 */
router.get('/occupancy', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: buildings, error } = await supabaseAdmin
      .from('buildings')
      .select(`
        id,
        name,
        rooms(status)
      `)
      .order('name');

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    const occupancyData = buildings.map((building: any) => {
      const rooms = building.rooms || [];
      const occupied = rooms.filter((r: any) => r.status === 'occupied').length;

      return {
        building: building.name,
        total: rooms.length,
        occupied,
        vacant: rooms.filter((r: any) => r.status === 'vacant').length,
        maintenance: rooms.filter((r: any) => r.status === 'maintenance').length,
        rate: rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0,
      };
    });

    res.json({ occupancy: occupancyData });
  } catch (err) {
    console.error('Get occupancy error:', err);
    res.status(500).json({ error: 'Failed to fetch occupancy data' });
  }
});

/**
 * GET /api/reports/building-revenue
 * Get revenue breakdown by building
 */
router.get('/building-revenue', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: bills, error } = await supabaseAdmin
      .from('bills')
      .select(`
        amount,
        bill_type,
        status,
        account:accounts(
          room:rooms(
            building:buildings(id, name)
          )
        )
      `);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Group by building
    const buildingMap: Record<string, any> = {};
    bills?.forEach((bill: any) => {
      const buildingName = bill.account?.room?.building?.name || 'Unknown';
      if (!buildingMap[buildingName]) {
        buildingMap[buildingName] = { building: buildingName, water: 0, electricity: 0, utilities: 0, total: 0, collected: 0 };
      }
      const amount = parseFloat(bill.amount);
      buildingMap[buildingName][bill.bill_type] += amount;
      buildingMap[buildingName].total += amount;
      if (bill.status === 'paid') {
        buildingMap[buildingName].collected += amount;
      }
    });

    res.json({ buildingRevenue: Object.values(buildingMap) });
  } catch (err) {
    console.error('Get building revenue error:', err);
    res.status(500).json({ error: 'Failed to fetch building revenue' });
  }
});

/**
 * GET /api/reports/export
 * Export data as Excel or CSV
 */
router.get('/export', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, format } = req.query;
    const exportFormat = (format as string) || 'xlsx';

    let data: any[] = [];
    let sheetName = 'Report';

    switch (type) {
      case 'bills': {
        const { data: bills } = await supabaseAdmin
          .from('bills')
          .select(`
            *,
            account:accounts(
              primary_email,
              room:rooms(
                room_number,
                building:buildings(name)
              )
            )
          `)
          .order('created_at', { ascending: false });

        data = (bills || []).map((b: any) => ({
          'Building': b.account?.room?.building?.name || '',
          'Room': b.account?.room?.room_number || '',
          'Account Email': b.account?.primary_email || '',
          'Bill Type': b.bill_type,
          'Amount': b.amount,
          'Billing Period': b.billing_period || '',
          'Due Date': b.due_date,
          'Status': b.status,
          'Created At': new Date(b.created_at).toLocaleDateString(),
        }));
        sheetName = 'Bills';
        break;
      }

      case 'tenants': {
        const { data: tenants } = await supabaseAdmin
          .from('tenants')
          .select(`
            *,
            account:accounts(
              primary_email,
              room:rooms(
                room_number,
                building:buildings(name)
              )
            )
          `)
          .order('created_at', { ascending: false });

        data = (tenants || []).map((t: any) => ({
          'Building': t.account?.room?.building?.name || '',
          'Room': t.account?.room?.room_number || '',
          'First Name': t.first_name,
          'Last Name': t.last_name,
          'Email': t.email,
          'Phone': t.phone || '',
          'Primary': t.is_primary ? 'Yes' : 'No',
          'Status': t.status,
          'Created At': new Date(t.created_at).toLocaleDateString(),
        }));
        sheetName = 'Tenants';
        break;
      }

      case 'revenue': {
        const { data: bills } = await supabaseAdmin
          .from('bills')
          .select('amount, bill_type, status, due_date, billing_period')
          .eq('status', 'paid');

        data = (bills || []).map((b: any) => ({
          'Bill Type': b.bill_type,
          'Amount': b.amount,
          'Billing Period': b.billing_period || '',
          'Due Date': b.due_date,
          'Status': b.status,
        }));
        sheetName = 'Revenue';
        break;
      }

      case 'occupancy': {
        const { data: buildings } = await supabaseAdmin
          .from('buildings')
          .select(`
            name,
            rooms(status)
          `)
          .order('name');

        data = (buildings || []).map((b: any) => {
          const rooms = b.rooms || [];
          return {
            'Building': b.name,
            'Total Rooms': rooms.length,
            'Occupied': rooms.filter((r: any) => r.status === 'occupied').length,
            'Vacant': rooms.filter((r: any) => r.status === 'vacant').length,
            'Maintenance': rooms.filter((r: any) => r.status === 'maintenance').length,
            'Occupancy Rate': rooms.length > 0
              ? `${Math.round((rooms.filter((r: any) => r.status === 'occupied').length / rooms.length) * 100)}%`
              : '0%',
          };
        });
        sheetName = 'Occupancy';
        break;
      }

      default:
        res.status(400).json({ error: 'Invalid export type. Use: bills, tenants, revenue, or occupancy' });
        return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    if (exportFormat === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${sheetName.toLowerCase()}_report.csv`);
      res.send(csv);
    } else {
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${sheetName.toLowerCase()}_report.xlsx`);
      res.send(buffer);
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
