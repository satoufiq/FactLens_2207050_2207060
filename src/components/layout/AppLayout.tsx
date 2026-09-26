import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(240);

  return (
    <div
      style={{ display: 'flex', minHeight: '100vh', background: '#060A09', color: '#E2E8E5', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Fixed Sidebar */}
      <Sidebar onWidthChange={setSidebarWidth} />

      {/* Main area — pushed right by sidebar */}
      <div
        style={{
          marginLeft: sidebarWidth,
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
          position: 'relative',
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: 'linear-gradient(to right, rgba(27,41,35,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(27,41,35,0.4) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {/* Ambient glow */}
        <div style={{ position: 'fixed', top: '20%', right: '25%', width: 480, height: 480, background: 'radial-gradient(circle, rgba(0,229,153,0.04) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: '20%', left: '33%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(0,210,194,0.03) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
          <Topbar />
        </div>

        {/* Page content */}
        <main style={{ flex: 1, padding: '28px 32px', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
