import React, { useEffect, useState } from 'react';
import { Plus, UserPlus, UserMinus, Star, Mail, Phone, Edit2, Trash2 } from 'lucide-react';
import { tenantsAPI, roomsAPI, buildingsAPI } from '../services/api';
import { Tenant, Building, Room } from '../types';

const Tenants: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBuilding, setFilterBuilding] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ accountId: '', firstName: '', lastName: '', email: '', phone: '', isPrimary: false });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tRes, bRes, rRes] = await Promise.all([
        tenantsAPI.getAll(),
        buildingsAPI.getAll(),
        roomsAPI.getAll(),
      ]);
      setTenants(tRes.data.tenants || []);
      setBuildings(bRes.data.buildings || []);
      setRooms(rRes.data.rooms?.filter((r: Room) => r.account) || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await tenantsAPI.update(editing.id, {
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, phone: form.phone, isPrimary: form.isPrimary,
        });
      } else {
        await tenantsAPI.create(form);
      }
      setShowModal(false); setEditing(null); loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this tenant?')) return;
    try { await tenantsAPI.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({ accountId: t.account_id, firstName: t.first_name, lastName: t.last_name, email: t.email, phone: t.phone || '', isPrimary: t.is_primary });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ accountId: '', firstName: '', lastName: '', email: '', phone: '', isPrimary: false });
    setShowModal(true);
  };

  const filtered = filterBuilding
    ? tenants.filter((t: any) => t.account?.room?.building?.id === filterBuilding)
    : tenants;

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="flex-between mb-2">
        <div className="filter-bar">
          <span className="filter-label">Filter:</span>
          <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}>
            <option value="">All Buildings</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <span className="text-muted text-sm">{filtered.length} tenant(s)</span>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><UserPlus size={16} /> Add Tenant</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Phone</th><th>Building / Room</th><th>Role</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t: any) => (
              <tr key={t.id}>
                <td><strong>{t.first_name} {t.last_name}</strong></td>
                <td><span className="flex gap-1" style={{ alignItems: 'center' }}><Mail size={13} /> {t.email}</span></td>
                <td>{t.phone ? <span className="flex gap-1" style={{ alignItems: 'center' }}><Phone size={13} /> {t.phone}</span> : <span className="text-muted">—</span>}</td>
                <td>{t.account?.room?.building?.name || '—'} / {t.account?.room?.room_number || '—'}</td>
                <td>{t.is_primary ? <span className="badge badge-warning"><Star size={10} /> Primary</span> : <span className="badge badge-muted">Member</span>}</td>
                <td><span className={`badge badge-${t.status === 'active' ? 'success' : 'danger'}`}>{t.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn-icon btn-sm" onClick={() => openEdit(t)}><Edit2 size={14} /></button>
                    <button className="btn-icon btn-sm" onClick={() => handleDelete(t.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No tenants found</p></div></td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editing ? 'Edit Tenant' : 'Add New Tenant'}</h3><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!editing && (
                  <div className="form-group"><label className="form-label">Assign to Room *</label>
                    <select value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} required>
                      <option value="">Select a room...</option>
                      {rooms.map((r: any) => (
                        <option key={r.account?.id} value={r.account?.id}>
                          {r.building?.name} — {r.room_number} ({r.account?.primary_email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group"><label className="form-label">First Name *</label><input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Last Name *</label><input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isPrimary} onChange={e => setForm({...form, isPrimary: e.target.checked})} style={{ width: 'auto' }} />
                    <span className="form-label" style={{ margin: 0 }}>Set as primary tenant</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add'} Tenant</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenants;
