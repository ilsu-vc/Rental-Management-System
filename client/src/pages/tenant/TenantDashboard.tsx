import React, { useEffect, useState } from 'react';
import { Receipt, Megaphone, Building2, DoorOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { billsAPI, announcementsAPI } from '../../services/api';
import { Bill, Announcement } from '../../types';

const TenantDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const profile = user?.profile as any;
  const tenantName = profile ? `${profile.first_name} ${profile.last_name}` : 'Tenant';
  const roomInfo = profile?.account?.room;
  const buildingInfo = roomInfo?.building;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [bRes, aRes] = await Promise.all([billsAPI.getAll(), announcementsAPI.getAll()]);
      setBills(bRes.data.bills || []);
      setAnnouncements(aRes.data.announcements?.slice(0, 5) || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const unpaidBills = bills.filter(b => b.status !== 'paid');
  const totalOwed = unpaidBills.reduce((s, b) => s + Number(b.amount), 0);

  return (
    <div className="fade-in">
      <div className="tenant-welcome">
        <h2>Welcome, {tenantName}! 👋</h2>
        <p>
          {buildingInfo && <><Building2 size={14} style={{ display: 'inline', marginRight: 4 }} />{buildingInfo.name}</>}
          {roomInfo && <> • <DoorOpen size={14} style={{ display: 'inline', marginRight: 4 }} />Room {roomInfo.room_number}</>}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon red"><Receipt size={22} /></div>
          <div className="stat-info"><div className="stat-label">Unpaid Bills</div><div className="stat-value">{unpaidBills.length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Receipt size={22} /></div>
          <div className="stat-info"><div className="stat-label">Total Owed</div><div className="stat-value">₱{totalOwed.toLocaleString()}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Receipt size={22} /></div>
          <div className="stat-info"><div className="stat-label">Paid Bills</div><div className="stat-value">{bills.filter(b => b.status === 'paid').length}</div></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Recent Bills</h3></div>
          {bills.length === 0 ? <p className="text-muted text-sm" style={{ padding: '1rem' }}>No bills yet</p> : (
            bills.slice(0, 5).map(b => (
              <div key={b.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className={`badge badge-${b.bill_type === 'water' ? 'info' : b.bill_type === 'electricity' ? 'warning' : 'purple'}`} style={{ marginRight: 8 }}>{b.bill_type}</span>
                  <span className="text-sm">{b.billing_period || new Date(b.due_date).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-1" style={{ alignItems: 'center' }}>
                  <strong>₱{Number(b.amount).toLocaleString()}</strong>
                  <span className={`badge badge-${b.status === 'paid' ? 'success' : b.status === 'overdue' ? 'danger' : 'warning'}`}>{b.status}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3><Megaphone size={16} style={{ display: 'inline', marginRight: 6 }} />Announcements</h3></div>
          {announcements.length === 0 ? <p className="text-muted text-sm" style={{ padding: '1rem' }}>No announcements</p> : (
            announcements.map(a => (
              <div key={a.id} className={`announcement-card ${a.priority}`} style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div className="flex-between mb-1">
                  <strong style={{ fontSize: '0.88rem' }}>{a.title}</strong>
                  <span className={`badge badge-${a.priority === 'urgent' ? 'danger' : a.priority === 'high' ? 'warning' : 'info'}`}>{a.priority}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.content.substring(0, 120)}...</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
