import React, { useEffect, useState } from 'react';
import { Eye, Receipt } from 'lucide-react';
import { billsAPI } from '../../services/api';
import { Bill } from '../../types';

const TenantBills: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ billType: '', status: '' });
  const [showImage, setShowImage] = useState<string | null>(null);

  useEffect(() => {
    billsAPI.getAll().then(({ data }) => setBills(data.bills || []))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = bills.filter(b => {
    if (filter.billType && b.bill_type !== filter.billType) return false;
    if (filter.status && b.status !== filter.status) return false;
    return true;
  });

  const billTypeColor = (t: string) => t === 'water' ? 'var(--water)' : t === 'electricity' ? 'var(--electricity)' : 'var(--utilities)';

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="filter-bar mb-2">
        <select value={filter.billType} onChange={e => setFilter({...filter, billType: e.target.value})}>
          <option value="">All Types</option>
          <option value="water">Water</option><option value="electricity">Electricity</option><option value="utilities">Utilities</option>
        </select>
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
        </select>
        <span className="text-muted text-sm">{filtered.length} bill(s)</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><Receipt size={48} /><h3>No Bills</h3><p>You have no bills matching this filter.</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Type</th><th>Amount</th><th>Period</th><th>Due Date</th><th>Status</th><th>Bill Photo</th></tr></thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td><span className="badge" style={{ background: `${billTypeColor(b.bill_type)}22`, color: billTypeColor(b.bill_type) }}>{b.bill_type}</span></td>
                  <td><strong>₱{Number(b.amount).toLocaleString()}</strong></td>
                  <td className="text-sm">{b.billing_period || '—'}</td>
                  <td className="text-sm">{new Date(b.due_date).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${b.status === 'paid' ? 'success' : b.status === 'overdue' ? 'danger' : 'warning'}`}>{b.status}</span></td>
                  <td>
                    {b.image_url ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowImage(b.image_url)}>
                        <Eye size={14} /> View
                      </button>
                    ) : <span className="text-muted text-sm">No photo</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showImage && (
        <div className="modal-overlay" onClick={() => setShowImage(null)}>
          <div className="modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Bill Photo</h3><button className="btn-icon" onClick={() => setShowImage(null)}>✕</button></div>
            <div className="modal-body"><img src={showImage} alt="Bill" className="bill-image-preview" /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantBills;
