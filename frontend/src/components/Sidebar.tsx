import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  PhoneCall,
  Users,
  Calendar,
  BookOpen,
  PhoneOutgoing,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/config', label: 'Configuration', icon: Settings },
  { to: '/logs', label: 'Call Logs', icon: PhoneCall },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/kb', label: 'Knowledge Base', icon: BookOpen },
  { to: '/calls', label: 'Outbound Calls', icon: PhoneOutgoing },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minHeight: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-500), var(--accent-300))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Zap size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              SPXAgent
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
              Operations Console
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        <p className="section-title" style={{ padding: '8px 10px 8px' }}>
          Navigation
        </p>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-glow)' : 'transparent',
              border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent',
              marginBottom: 2,
              transition: 'all 0.15s',
            })}
            className={({ isActive }) => isActive ? '' : 'nav-inactive'}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  color={isActive ? 'var(--accent-400)' : 'currentColor'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        Gemini 3.1 Live · Headless
      </div>
    </aside>
  );
}
