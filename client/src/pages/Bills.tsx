import React, { useEffect, useState, useRef } from 'react';
import { Plus, Upload, Eye, Edit2, Trash2, DollarSign, Image } from 'lucide-react';
import { billsAPI, roomsAPI, buildingsAPI } from '../services/api';
import { Bill, Building, Room } from '../types';

const Bills: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ buildingId: '', billType: '', status: '' });
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [form, setForm] = useState({ accountId: '', billType: 'water', amount: '', billingPeriod: '', dueDate: '', notes: '' });
  const [uploadingBillId, setUploadingBillId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [bRes, blRes, rRes] = await Promise.all([billsAPI.getAll(), buildingsAPI.getAll(), roomsAPI.getAll()]);
      setBills(bRes.data.bills || []);
      setBuildings(blRes.data.buildings || []);
      setRooms(rRes.data.rooms?.filter((r: Room) => r.account) || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await billsAPI.create(form);
      setShowModal(false);
      setForm({ accountId: '', billType: 'water', amount: '', billingPeriod: '', dueDate: '', notes: '' });
      loadData();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleUpload = async (billId: string, file: File) => {
    try {
      await billsAPI.uploadImage(billId, file);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleMarkPaid = async (bill: Bill) => {
    try {
      await billsAPI.update(bill.id, { status: 'paid' });
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bill?')) return;
    try { await billsAPI.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  const filtered = bills.filter((b: any) => {
    if (filter.billType && b.bill_type !== filter.billType) return false;
    if (filter.status && b.status !== filter.status) return false;
    if (filter.buildingId && b.account?.room?.building?.id !== filter.buildingId) return false;
    return true;
  });

  const billTypeColor = (t: string) => t === 'water' ? 'var(--water)' : t === 'electricity' ? 'var(--electricity)' : 'var(--utilities)';

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="flex-between mb-2">
        <div className="filter-bar">
          <select value={filter.buildingId} onChange={e => setFilter({...filter, buildingId: e.target.value})}>
            <option value="">All Buildings</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filter.billType} onChange={e => setFilter({...filter, billType: e.target.value})}>
            <option value="">All Types</option>
            <option value="water">Water</option><option value="electricity">Electricity</option><option value="utilities">Utilities</option>
          </select>
          <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
            <option value="">All Status</option>
            <option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Post Bill</button>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th>Type</th><th>Building / Room</th><th>Account</th><th>Amount</th><th>Period</th><th>Due Date</th><th>Status</th><th>Photo</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((b: any) => (
              <tr key={b.id}>
                <td><span className="badge" style={{ background: `${billTypeColor(b.bill_type)}22`, color: billTypeColor(b.bill_type) }}>{b.bill_type}</span></td>
                <td>{b.account?.room?.building?.name || '—'} / {b.account?.room?.room_number || '—'}</td>
                <td className="text-sm">{b.account?.primary_email || '—'}</td>
                <td><strong>₱{Number(b.amount).toLocaleString()}</strong></td>
                <td className="text-sm text-muted">{b.billing_period || '—'}</td>
                <td className="text-sm">{new Date(b.due_date).toLocaleDateString()}</td>
                <td><span className={`badge badge-${b.status === 'paid' ? 'success' : b.status === 'overdue' ? 'danger' : 'warning'}`}>{b.status}</span></td>
                <td>
                  {b.image_url ? (
                    <button className="btn-icon btn-sm" onClick={() => setShowImageModal(b.image_url)}><Eye size={14} /></button>
                  ) : (
                    <button className="btn-icon btn-sm" onClick={() => { setUploadingBillId(b.id); fileRef.current?.click(); }}><Upload size={14} /></button>
                  )}
                </td>
                <td>
                  <div className="flex gap-1">
                    {b.status !== 'paid' && <button className="btn btn-success btn-sm" onClick={() => handleMarkPaid(b)}><DollarSign size={12} /> Paid</button>}
                    <button className="btn-icon btn-sm" onClick={() => handleDelete(b.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9}><div className="empty-state"><p>No bills found</p></div></td></tr>}
          </tbody>
        </table>
      </div>

      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => {
        const file = e.target.files?.[0];
        if (file && uploadingBillId) { handleUpload(uploadingBillId, file); setUploadingBillId(null); }
        e.target.value = '';
      }} />

      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(null)}>
          <div className="modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Bill Image</h3><button className="btn-icon" onClick={() => setShowImageModal(null)}>✕</button></div>
            <div className="modal-body"><img src={showImageModal} alt="Bill" className="bill-image-preview" /></div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Post New Bill</h3><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Room / Account *</label>
                  <select value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} required>
                    <option value="">Select room...</option>
                    {rooms.map((r: any) => <option key={r.account?.id} value={r.account?.id}>{r.building?.name} — {r.room_number} ({r.account?.primary_email})</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Bill Type *</label>
                    <select value={form.billType} onChange={e => setForm({...form, billType: e.target.value})}>
                      <option value="water">Water</option><option value="electricity">Electricity</option><option value="utilities">Utilities</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Amount (₱) *</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} step="0.01" required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Billing Period</label><input value={form.billingPeriod} onChange={e => setForm({...form, billingPeriod: e.target.value})} placeholder="e.g. June 2026" /></div>
                  <div className="form-group"><label className="form-label">Due Date *</label><input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Additional notes..." /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Post Bill</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bills;
