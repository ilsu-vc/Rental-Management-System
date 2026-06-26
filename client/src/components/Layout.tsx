import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Building2, DoorOpen, Users, Receipt,
  Megaphone, BarChart3, LogOut, Home
} from 'lucide-react';

const adminNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/buildings', label: 'Buildings', icon: Building2 },
  { to: '/rooms', label: 'Rooms', icon: DoorOpen },
  { to: '/tenants', label: 'Tenants', icon: Users },
  { to: '/bills', label: 'Bills', icon: Receipt },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

const tenantNav = [
  { to: '/tenant', label: 'Home', icon: Home },
  { to: '/tenant/bills', label: 'My Bills', icon: Receipt },
  { to: '/tenant/announcements', label: 'Announcements', icon: Megaphone },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your rental properties' },
  '/buildings': { title: 'Buildings', subtitle: 'Manage your properties' },
  '/rooms': { title: 'Rooms', subtitle: 'View and manage rooms' },
  '/tenants': { title: 'Tenants', subtitle: 'Manage tenant accounts' },
  '/bills': { title: 'Bills', subtitle: 'Post and track utility bills' },
  '/announcements': { title: 'Announcements', subtitle: 'Post notices to tenants' },
  '/reports': { title: 'Financial Reports', subtitle: 'Charts, analytics, and exports' },
  '/tenant': { title: 'Welcome Home', subtitle: 'Your tenant portal' },
  '/tenant/bills': { title: 'My Bills', subtitle: 'View your utility bills' },
  '/tenant/announcements': { title: 'Announcements', subtitle: 'Latest notices from management' },
};

const Layout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const nav = isAdmin ? adminNav : tenantNav;
  const basePath = location.pathname.replace(/\/[a-f0-9-]+\/rooms.*/, '/buildings');
  const pageInfo = pageTitles[basePath] || pageTitles[location.pathname] || { title: 'RentaHub', subtitle: '' };

  const getInitials = () => {
    if (isAdmin) {
      const p = user?.profile as any;
      return p?.full_name ? p.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'AD';
    }
    const p = user?.profile as any;
    return p ? `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase() : 'TN';
  };

  const getName = () => {
    if (isAdmin) return (user?.profile as any)?.full_name || 'Admin';
    const p = user?.profile as any;
    return p ? `${p.first_name} ${p.last_name}` : 'Tenant';
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">R</div>
          <div>
            <h1>RentaHub</h1>
            <span>Property Management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">{isAdmin ? 'Management' : 'Portal'}</div>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/tenant'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{getInitials()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name truncate">{getName()}</div>
              <div className="user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={logout} style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <h2>{pageInfo.title}</h2>
            <p>{pageInfo.subtitle}</p>
          </div>
        </header>
        <main className="page fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
