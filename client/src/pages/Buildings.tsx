import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Edit2, Trash2 } from 'lucide-react';
import { buildingsAPI } from '../services/api';
import { Building } from '../types';

const Buildings: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [form, setForm] = useState({ name: '', address: '', description: '', totalRooms: 15 });
  const navigate = useNavigate();

  useEffect(() => { loadBuildings(); }, []);

  const loadBuildings = async () => {
    try {
      const { data } = await buildingsAPI.getAll();
      setBuildings(data.buildings || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await buildingsAPI.update(editing.id, form);
      } else {
        await buildingsAPI.create(form);
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', address: '', description: '', totalRooms: 15 });
      loadBuildings();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this building? All rooms, accounts, and bills will be removed.')) return;
    try { await buildingsAPI.delete(id); loadBuildings(); } catch (err) { console.error(err); }
  };

  const openEdit = (b: Building) => {
    setEditing(b);
    setForm({ name: b.name, address: b.address || '', description: b.description || '', totalRooms: b.total_rooms });
    setShowModal(true);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="flex-between mb-2">
        <div><strong>{buildings.length}</strong> <span className="text-muted">buildings registered</span></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', address: '', description: '', totalRooms: 15 }); setShowModal(true); }}>
          <Plus size={16} /> Add Building
        </button>
      </div>

      <div className="grid-4">
        {buildings.map((b) => (
          <div key={b.id} className="building-card">
            <div className="building-card-header" onClick={() => navigate(`/buildings/${b.id}/rooms`)}>
              <h3>{b.name}</h3>
              {b.address && <p><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />{b.address}</p>}
            </div>
            <div className="building-card-stats">
              <div className="building-stat"><div className="value text-success">{b.stats?.occupied || 0}</div><div className="label">Occupied</div></div>
              <div className="building-stat"><div className="value text-warning">{b.stats?.vacant || 0}</div><div className="label">Vacant</div></div>
              <div className="building-stat"><div className="value" style={{ color: 'var(--utilities)' }}>{b.stats?.maintenance || 0}</div><div className="label">Maint.</div></div>
            </div>
            <div className="building-card-footer">
              <div className="occupancy-bar"><div className="occupancy-fill" style={{ width: `${b.stats?.occupancyRate || 0}%` }} /></div>
              <span className="text-sm font-bold">{b.stats?.occupancyRate || 0}%</span>
              <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                <button className="btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(b); }}><Edit2 size={14} /></button>
                <button className="btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Building' : 'Add New Building'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Building Name *</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Building A" />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main Street" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Building details..." />
                </div>
                {!editing && (
                  <div className="form-group">
                    <label className="form-label">Number of Rooms</label>
                    <input type="number" value={form.totalRooms} onChange={e => setForm({...form, totalRooms: parseInt(e.target.value) || 15})} min={1} max={50} />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Building</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Buildings;
