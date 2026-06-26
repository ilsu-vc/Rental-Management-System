import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Megaphone } from 'lucide-react';
import { announcementsAPI, buildingsAPI } from '../services/api';
import { Announcement, Building } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Announcements: React.FC = () => {
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', targetBuildingId: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [aRes, bRes] = await Promise.all([announcementsAPI.getAll(), buildingsAPI.getAll()]);
      setAnnouncements(aRes.data.announcements || []);
      setBuildings(bRes.data.buildings || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { await announcementsAPI.update(editing.id, form); }
      else { await announcementsAPI.create(form); }
      setShowModal(false); setEditing(null); loadData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try { await announcementsAPI.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleToggle = async (a: Announcement) => {
    try { await announcementsAPI.update(a.id, { isActive: !a.is_active }); loadData(); } catch (err) { console.error(err); }
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({ title: a.title, content: a.content, priority: a.priority, targetBuildingId: a.target_building_id || '' });
    setShowModal(true);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      {isAdmin && (
        <div className="flex-between mb-2">
          <span className="text-muted">{announcements.length} announcement(s)</span>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ title: '', content: '', priority: 'normal', targetBuildingId: '' }); setShowModal(true); }}>
            <Plus size={16} /> New Announcement
          </button>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="empty-state"><Megaphone size={48} /><h3>No Announcements</h3><p>No notices at this time.</p></div>
      ) : (
        announcements.map(a => (
          <div key={a.id} className={`announcement-card ${a.priority}`}>
            <div className="flex-between">
              <div>
                <div className="announcement-meta">
                  <span className={`badge badge-${a.priority === 'urgent' ? 'danger' : a.priority === 'high' ? 'warning' : a.priority === 'low' ? 'muted' : 'info'}`}>{a.priority}</span>
                  {a.building && <span className="badge badge-purple">{a.building.name}</span>}
                  {!a.is_active && <span className="badge badge-muted">Inactive</span>}
                  <span className="announcement-date">{new Date(a.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>{a.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>{a.content}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-1" style={{ flexShrink: 0, marginLeft: '1rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(a)}>{a.is_active ? 'Hide' : 'Show'}</button>
                  <button className="btn-icon btn-sm" onClick={() => openEdit(a)}><Edit2 size={14} /></button>
                  <button className="btn-icon btn-sm" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editing ? 'Edit' : 'New'} Announcement</h3><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Content *</label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} required style={{ minHeight: '120px' }} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Priority</label>
                    <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                      <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Target Building</label>
                    <select value={form.targetBuildingId} onChange={e => setForm({...form, targetBuildingId: e.target.value})}>
                      <option value="">All Buildings</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Post'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
