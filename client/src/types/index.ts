// ============================================
// RentaHub TypeScript Type Definitions
// ============================================

export interface Building {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  total_rooms: number;
  created_at: string;
  updated_at: string;
  stats?: BuildingStats;
}

export interface BuildingStats {
  total: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  occupancyRate: number;
}

export interface Room {
  id: string;
  building_id: string;
  room_number: string;
  floor: number;
  capacity: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  monthly_rate: number;
  created_at: string;
  updated_at: string;
  building?: Building;
  account?: Account | null;
}

export interface Account {
  id: string;
  room_id: string;
  primary_email: string;
  status: 'active' | 'inactive' | 'suspended';
  move_in_date: string | null;
  created_at: string;
  updated_at: string;
  room?: Room;
  tenants?: Tenant[];
  bills?: Bill[];
}

export interface Tenant {
  id: string;
  account_id: string;
  auth_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_primary: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  account?: Account;
}

export interface Bill {
  id: string;
  account_id: string;
  bill_type: 'water' | 'electricity' | 'utilities';
  amount: number;
  billing_period: string | null;
  due_date: string;
  status: 'unpaid' | 'paid' | 'overdue' | 'partial';
  image_url: string | null;
  notes: string | null;
  posted_by: string | null;
  created_at: string;
  updated_at: string;
  account?: Account;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  bill_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_active: boolean;
  target_building_id: string | null;
  posted_by: string | null;
  created_at: string;
  updated_at: string;
  building?: Building | null;
}

export interface AdminProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  email: string;
  role: 'admin' | 'super_admin' | 'tenant';
  profile: AdminProfile | Tenant;
  token: string;
  refreshToken: string;
}

export interface DashboardSummary {
  totalBuildings: number;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyRate: number;
  totalTenants: number;
  totalBills: number;
  unpaidBills: number;
  totalRevenue: number;
  outstandingAmount: number;
  revenueByType: {
    water: number;
    electricity: number;
    utilities: number;
  };
}

export interface MonthlyRevenue {
  month: string;
  water: number;
  electricity: number;
  utilities: number;
  total: number;
  paid: number;
  unpaid: number;
}

export interface OccupancyData {
  building: string;
  total: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  rate: number;
}
