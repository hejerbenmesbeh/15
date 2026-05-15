import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ML from "./pages/ML";

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconML = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
  </svg>
);
const IconLogo = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="10" fill="#CC0000"/>
    <path d="M8 28V12h8c3.3 0 5.5 1.8 5.5 4.8 0 1.8-.9 3.2-2.3 4l3.5 7.2H19l-3-6.5H12V28H8zm4-9.5h3.8c1.4 0 2.2-.7 2.2-1.8s-.8-1.7-2.2-1.7H12v3.5z" fill="white"/>
    <circle cx="28" cy="20" r="5" fill="white" opacity="0.3"/>
    <circle cx="28" cy="20" r="3" fill="white" opacity="0.7"/>
  </svg>
);
const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ collapsed, setCollapsed }) {
  const navItems = [
    { path: "/",    label: "Tableau de Bord",  icon: <IconDashboard /> },
    { path: "/ml",  label: "Prédictions IA",   icon: <IconML /> },
  ];

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <IconLogo />
          {!collapsed && (
            <div className="sidebar-brand">
              <span className="brand-title">Poste Tunisienne</span>
              <span className="brand-sub">Dashboard Décisionnel</span>
            </div>
          )}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          <IconChevron />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {!collapsed && <span className="nav-section-label">Navigation</span>}
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
            {!collapsed && <span className="nav-arrow"><IconChevron /></span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-footer-info">
            <div className="footer-dot" />
            <span>Système opérationnel</span>
          </div>
        )}
        <div className="footer-year">{collapsed ? "©" : "© 2026 PT Analytics"}</div>
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const titles = {
    "/":    { title: "Tableau de Bord",  sub: "Vue d'ensemble des enquêtes de satisfaction" },
    "/ml":  { title: "Prédictions IA",   sub: "Modèles machine learning & analyse prédictive" },
  };
  const current = titles[location.pathname] || titles["/"];
  const now = new Date().toLocaleDateString("fr-TN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={() => setCollapsed(!collapsed)}>
          <IconMenu />
        </button>
        <div className="page-title-block">
          <h1 className="page-title">{current.title}</h1>
          <p className="page-subtitle">{current.sub}</p>
        </div>
      </div>
      <div className="topbar-right">
        <div className="date-badge">{now}</div>
        <div className="user-avatar">
          <span>PT</span>
        </div>
      </div>
    </header>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="main-area">
        <Topbar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="page-content">
          <Routes>
            <Route path="/"   element={<Dashboard />} />
            <Route path="/ml" element={<ML />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ─── Global Styles ────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --red:        #CC0000;
    --red-dark:   #A00000;
    --red-light:  #FF2020;
    --red-faint:  rgba(204,0,0,0.08);
    --red-glow:   rgba(204,0,0,0.18);

    --bg:         #0D0F14;
    --bg-card:    #14171E;
    --bg-hover:   #1A1E28;
    --bg-input:   #1E2330;

    --border:     rgba(255,255,255,0.07);
    --border-active: rgba(204,0,0,0.5);

    --text-1:     #F0F2F7;
    --text-2:     #8A92A6;
    --text-3:     #55607A;

    --sidebar-w:     240px;
    --sidebar-w-col: 68px;
    --topbar-h:      64px;

    --radius:    10px;
    --radius-lg: 16px;
    --shadow:    0 4px 24px rgba(0,0,0,0.4);
    --shadow-red: 0 0 20px rgba(204,0,0,0.25);

    --font: 'Plus Jakarta Sans', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  html, body, #root { height: 100%; }

  body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text-1);
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  /* ── Layout ── */
  .app-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .main-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    transition: margin-left 0.3s ease;
  }

  .page-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: var(--sidebar-w);
    min-width: var(--sidebar-w);
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    transition: width 0.3s ease, min-width 0.3s ease;
    overflow: hidden;
    position: relative;
    z-index: 50;
  }
  .sidebar.collapsed {
    width: var(--sidebar-w-col);
    min-width: var(--sidebar-w-col);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 16px 16px;
    border-bottom: 1px solid var(--border);
    min-height: 72px;
    gap: 8px;
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;
    min-width: 0;
  }

  .sidebar-brand { overflow: hidden; }
  .brand-title {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-1);
    white-space: nowrap;
  }
  .brand-sub {
    display: block;
    font-size: 10px;
    color: var(--text-3);
    white-space: nowrap;
    margin-top: 1px;
  }

  .collapse-btn {
    flex-shrink: 0;
    width: 28px; height: 28px;
    border-radius: 6px;
    background: none;
    border: 1px solid var(--border);
    color: var(--text-3);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .collapse-btn:hover { background: var(--bg-hover); color: var(--text-1); }
  .sidebar.collapsed .collapse-btn svg { transform: rotate(180deg); }

  .sidebar-nav {
    flex: 1;
    padding: 16px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }

  .nav-section-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    padding: 0 6px 8px;
    display: block;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px;
    border-radius: 8px;
    text-decoration: none;
    color: var(--text-2);
    font-size: 13.5px;
    font-weight: 500;
    transition: all 0.2s;
    position: relative;
    white-space: nowrap;
    overflow: hidden;
  }
  .nav-item:hover { background: var(--bg-hover); color: var(--text-1); }
  .nav-item.active {
    background: var(--red-faint);
    color: var(--red-light);
    border: 1px solid var(--border-active);
  }
  .nav-item.active .nav-icon { color: var(--red); }

  .nav-icon { flex-shrink: 0; display: flex; align-items: center; }
  .nav-label { flex: 1; }
  .nav-arrow { flex-shrink: 0; opacity: 0.4; display: flex; align-items: center; }

  .sidebar-footer {
    padding: 14px 16px;
    border-top: 1px solid var(--border);
  }
  .sidebar-footer-info {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    color: var(--text-3);
    margin-bottom: 4px;
  }
  .footer-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 6px #22c55e;
  }
  .footer-year { font-size: 10px; color: var(--text-3); font-family: var(--mono); }

  /* ── Topbar ── */
  .topbar {
    height: var(--topbar-h);
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    gap: 16px;
    flex-shrink: 0;
  }

  .topbar-left { display: flex; align-items: center; gap: 14px; }

  .page-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-1);
    line-height: 1.1;
  }
  .page-subtitle {
    font-size: 12px;
    color: var(--text-3);
    margin-top: 2px;
  }

  .topbar-right { display: flex; align-items: center; gap: 12px; }

  .date-badge {
    font-size: 11.5px;
    color: var(--text-2);
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 5px 10px;
    font-family: var(--mono);
    white-space: nowrap;
  }

  .user-avatar {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: var(--red);
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    box-shadow: var(--shadow-red);
  }

  .mobile-menu-btn {
    display: none;
    width: 36px; height: 36px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: none;
    color: var(--text-2);
    cursor: pointer;
    align-items: center; justify-content: center;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .sidebar {
      position: absolute;
      height: 100%;
      transform: translateX(0);
      z-index: 100;
    }
    .sidebar.collapsed { transform: translateX(-100%); width: var(--sidebar-w); min-width: var(--sidebar-w); }
    .mobile-menu-btn { display: flex; }
    .date-badge { display: none; }
    .page-content { padding: 16px; }
  }
`;

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <Router>
      <Layout />
    </Router>
  );
}