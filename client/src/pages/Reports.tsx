import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { reportsAPI } from '../services/api';
import { MonthlyRevenue, OccupancyData } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

const Reports: React.FC = () => {
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyData[]>([]);
  const [buildingRev, setBuildingRev] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');

  useEffect(() => { loadData(); }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [revRes, occRes, brRes] = await Promise.all([
        reportsAPI.getRevenue(year), reportsAPI.getOccupancy(), reportsAPI.getBuildingRevenue()
      ]);
      setMonthly(revRes.data.monthly || []);
      setOccupancy(occRes.data.occupancy || []);
      setBuildingRev(brRes.data.buildingRevenue || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleExport = async (type: string, format: string) => {
    try {
      const response = await reportsAPI.export(type, format);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_report.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); alert('Export failed'); }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem' }}>
        <p style={{ fontWeight: 600 }}>{label}</p>
        {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: ₱{p.value.toLocaleString()}</p>)}
      </div>
    );
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const pieData = occupancy.map(o => ({ name: o.building, value: o.occupied }));

  return (
    <div className="fade-in">
      <div className="flex-between mb-2">
        <div className="tabs" style={{ border: 'none', marginBottom: 0 }}>
          {['revenue', 'occupancy', 'breakdown'].map(t => (
            <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <div className="flex gap-1">
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ maxWidth: 120 }}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex gap-1">
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('bills', 'xlsx')}><FileSpreadsheet size={14} /> Bills (Excel)</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('bills', 'csv')}><Download size={14} /> Bills (CSV)</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('tenants', 'xlsx')}><FileSpreadsheet size={14} /> Tenants</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('occupancy', 'xlsx')}><FileSpreadsheet size={14} /> Occupancy</button>
          </div>
        </div>
      </div>

      {activeTab === 'revenue' && (
        <div className="grid-2">
          <div className="chart-card">
            <h3>Monthly Revenue by Type</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="water" fill="var(--water)" name="Water" radius={[4,4,0,0]} />
                <Bar dataKey="electricity" fill="var(--electricity)" name="Electricity" radius={[4,4,0,0]} />
                <Bar dataKey="utilities" fill="var(--utilities)" name="Utilities" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3>Paid vs Unpaid Trend</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="paid" fill="rgba(34,197,94,0.2)" stroke="var(--success)" name="Paid" />
                <Area type="monotone" dataKey="unpaid" fill="rgba(239,68,68,0.2)" stroke="var(--danger)" name="Unpaid" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'occupancy' && (
        <div className="grid-2">
          <div className="chart-card">
            <h3>Occupancy by Building</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={occupancy} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                <YAxis type="category" dataKey="building" stroke="var(--text-muted)" fontSize={12} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="occupied" fill="var(--success)" name="Occupied" radius={[0,4,4,0]} />
                <Bar dataKey="vacant" fill="var(--text-muted)" name="Vacant" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3>Occupancy Distribution</h3>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: 'var(--text-muted)' }}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'breakdown' && (
        <div>
          <div className="chart-card mb-2">
            <h3>Revenue by Building</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={buildingRev}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="building" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="water" fill="var(--water)" name="Water" stackId="a" />
                <Bar dataKey="electricity" fill="var(--electricity)" name="Electricity" stackId="a" />
                <Bar dataKey="utilities" fill="var(--utilities)" name="Utilities" stackId="a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Building</th><th>Water</th><th>Electricity</th><th>Utilities</th><th>Total</th><th>Collected</th></tr></thead>
              <tbody>
                {buildingRev.map((b, i) => (
                  <tr key={i}>
                    <td><strong>{b.building}</strong></td>
                    <td>₱{b.water.toLocaleString()}</td>
                    <td>₱{b.electricity.toLocaleString()}</td>
                    <td>₱{b.utilities.toLocaleString()}</td>
                    <td><strong>₱{b.total.toLocaleString()}</strong></td>
                    <td className="text-success">₱{b.collected.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
