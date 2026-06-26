import React, { useEffect, useState } from 'react';
import { Building2, DoorOpen, Users, Receipt, TrendingUp, AlertCircle } from 'lucide-react';
import { reportsAPI, announcementsAPI } from '../services/api';
import { DashboardSummary, Announcement } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sumRes, annRes, revRes] = await Promise.all([
        reportsAPI.getSummary(),
        announcementsAPI.getAll(),
        reportsAPI.getRevenue(),
      ]);
      setSummary(sumRes.data.summary);
      setAnnouncements(annRes.data.announcements?.slice(0, 5) || []);
      setRevenueData(revRes.data.monthly || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const stats = [
    { label: 'Buildings', value: summary?.totalBuildings || 0, icon: Building2, color: 'blue' },
    { label: 'Total Rooms', value: summary?.totalRooms || 0, icon: DoorOpen, color: 'purple' },
    { label: 'Occupied', value: summary?.occupiedRooms || 0, icon: DoorOpen, color: 'green' },
    { label: 'Vacant', value: summary?.vacantRooms || 0, icon: DoorOpen, color: 'yellow' },
    { label: 'Active Tenants', value: summary?.totalTenants || 0, icon: Users, color: 'cyan' },
    { label: 'Unpaid Bills', value: summary?.unpaidBills || 0, icon: AlertCircle, color: 'red' },
    { label: 'Total Revenue', value: `₱${(summary?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'green' },
    { label: 'Outstanding', value: `₱${(summary?.outstandingAmount || 0).toLocaleString()}`, icon: Receipt, color: 'yellow' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ fontSize: '0.8rem', color: p.color }}>
            {p.name}: ₱{p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><s.icon size={22} /></div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="chart-card">
          <h3>Monthly Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="water" fill="var(--water)" radius={[4,4,0,0]} name="Water" />
              <Bar dataKey="electricity" fill="var(--electricity)" radius={[4,4,0,0]} name="Electricity" />
              <Bar dataKey="utilities" fill="var(--utilities)" radius={[4,4,0,0]} name="Utilities" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent Announcements</h3>
          </div>
          {announcements.length === 0 ? (
            <div className="empty-state"><p>No announcements yet</p></div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className={`announcement-card ${a.priority}`} style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div className="flex-between">
                  <strong style={{ fontSize: '0.88rem' }}>{a.title}</strong>
                  <span className={`badge badge-${a.priority === 'urgent' ? 'danger' : a.priority === 'high' ? 'warning' : 'info'}`}>{a.priority}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {a.content.substring(0, 100)}{a.content.length > 100 ? '...' : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {summary && (
        <div className="card">
          <div className="card-header"><h3>Occupancy Rate</h3></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="occupancy-bar" style={{ flex: 1, height: '12px' }}>
              <div className="occupancy-fill" style={{ width: `${summary.occupancyRate}%` }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{summary.occupancyRate}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
