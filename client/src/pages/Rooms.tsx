import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Settings } from 'lucide-react';
import { roomsAPI, buildingsAPI } from '../services/api';
import { Room, Building } from '../types';

const Rooms: React.FC = () => {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({ status: '', monthlyRate: '', capacity: '' });
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({ primaryEmail: '', moveInDate: '' });

  useEffect(() => { loadRooms(); }, [buildingId]);

  const loadRooms = async () => {
    try {
      const params = buildingId ? { buildingId } : {};
      const { data } = await roomsAPI.getAll(params);
      setRooms(data.rooms || []);
      if (buildingId) {
        const { data: bData } = await buildingsAPI.getById(buildingId);
        setBuilding(bData.building);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      await roomsAPI.update(selectedRoom.id, {
        status: roomForm.status || undefined,
        monthlyRate: roomForm.monthlyRate ? parseFloat(roomForm.monthlyRate) : undefined,
        capacity: roomForm.capacity ? parseInt(roomForm.capacity) : undefined,
      });
      setShowModal(false);
      loadRooms();
    } catch (err) { console.error(err); }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      await roomsAPI.createAccount(selectedRoom.id, accountForm);
      setShowAccountModal(false);
      loadRooms();
    } catch (err) { console.error(err); }
  };

  const openRoomEdit = (room: Room) => {
    setSelectedRoom(room);
    setRoomForm({ status: room.status, monthlyRate: String(room.monthly_rate), capacity: String(room.capacity) });
    setShowModal(true);
  };

  const openCreateAccount = (room: Room) => {
    setSelectedRoom(room);
    setAccountForm({ primaryEmail: '', moveInDate: new Date().toISOString().split('T')[0] });
    setShowAccountModal(true);
  };

  const statusColor = (s: string) => s === 'occupied' ? 'var(--success)' : s === 'maintenance' ? 'var(--warning)' : 'var(--text-muted)';

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      {buildingId && (
        <div className="flex-between mb-2">
          <button className="btn btn-secondary" onClick={() => navigate('/buildings')}><ArrowLeft size={16} /> Back to Buildings</button>
          {building && <div><strong>{building.name}</strong> <span className="text-muted">— {rooms.length} rooms</span></div>}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card"><div className="stat-icon green"><Users size={20} /></div><div className="stat-info"><div className="stat-label">Occupied</div><div className="stat-value">{rooms.filter(r => r.status === 'occupied').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon yellow"><Users size={20} /></div><div className="stat-info"><div className="stat-label">Vacant</div><div className="stat-value">{rooms.filter(r => r.status === 'vacant').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon purple"><Settings size={20} /></div><div className="stat-info"><div className="stat-label">Maintenance</div><div className="stat-value">{rooms.filter(r => r.status === 'maintenance').length}</div></div></div>
      </div>

      <div className="grid-4">
        {rooms.map((room) => (
          <div key={room.id} className={`room-card ${room.status}`} onClick={() => openRoomEdit(room)}>
            <div className="room-header">
              <span className="room-number">{room.room_number}</span>
              <span className="badge" style={{ background: `${statusColor(room.status)}22`, color: statusColor(room.status) }}>{room.status}</span>
            </div>
            <div className="room-floor">Floor {room.floor} • Capacity: {room.capacity}</div>
            {room.account ? (
              <div className="room-tenants mt-1">
                <div className="text-sm" style={{ color: 'var(--accent)' }}>{room.account.primary_email}</div>
                <div className="text-sm text-muted">{room.account.tenants?.filter(t => t.status === 'active').length || 0} tenant(s)</div>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm mt-1" style={{ width: '100%', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); openCreateAccount(room); }}>
                Set Up Account
              </button>
            )}
            <div className="room-rate">₱{Number(room.monthly_rate).toLocaleString()}/mo</div>
          </div>
        ))}
      </div>

      {showModal && selectedRoom && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Edit Room {selectedRoom.room_number}</h3><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <form onSubmit={handleUpdateRoom}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Status</label>
                  <select value={roomForm.status} onChange={e => setRoomForm({...roomForm, status: e.target.value})}>
                    <option value="vacant">Vacant</option><option value="occupied">Occupied</option><option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Monthly Rate (₱)</label><input type="number" value={roomForm.monthlyRate} onChange={e => setRoomForm({...roomForm, monthlyRate: e.target.value})} step="0.01" /></div>
                  <div className="form-group"><label className="form-label">Capacity</label><input type="number" value={roomForm.capacity} onChange={e => setRoomForm({...roomForm, capacity: e.target.value})} min="1" max="10" /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {showAccountModal && selectedRoom && (
        <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Create Account for {selectedRoom.room_number}</h3><button className="btn-icon" onClick={() => setShowAccountModal(false)}>✕</button></div>
            <form onSubmit={handleCreateAccount}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Primary Email *</label><input type="email" value={accountForm.primaryEmail} onChange={e => setAccountForm({...accountForm, primaryEmail: e.target.value})} required placeholder="primary@email.com" /></div>
                <div className="form-group"><label className="form-label">Move-in Date</label><input type="date" value={accountForm.moveInDate} onChange={e => setAccountForm({...accountForm, moveInDate: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowAccountModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create Account</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;
