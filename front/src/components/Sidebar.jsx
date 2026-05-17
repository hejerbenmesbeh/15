import { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { BarChart3, Brain, LogOut, X, Menu, ChevronRight } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, description: "Analyses & KPIs" },
  { to: "/home", label: "Machine Learning", icon: Brain, description: "Modèles & prédictions" },
];

function getInitials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <>
      {/* ── Collapsed rail (always visible) ── */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex w-14 flex-col items-center border-r border-white/10 bg-[#1B2A6B] py-4 transition-all duration-300"
      >
        {/* Hamburger toggle */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Icon-only nav hints */}
        <nav className="mt-6 flex flex-col items-center gap-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                title={label}
                className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-[#F5A800] text-[#1B2A6B] shadow-lg shadow-[#F5A800]/30"
                    : "text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                {/* Tooltip */}
                <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-lg bg-[#0f1a42] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: avatar */}
        <div className="mt-auto">
          {user && (
            <div
              title={`${user.firstName} ${user.lastName}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5A800] text-xs font-bold text-[#1B2A6B] shadow"
            >
              {getInitials(user.firstName, user.lastName)}
            </div>
          )}
        </div>
      </aside>

      {/* ── Backdrop ── */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ── Expanded drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#1B2A6B] transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Logo variant="light" />
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
            Navigation
          </p>
          {navItems.map(({ to, label, icon: Icon, description }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3.5 rounded-xl px-4 py-3.5 transition-all duration-200 ${
                  isActive
                    ? "bg-[#F5A800] text-[#1B2A6B] shadow-lg shadow-[#F5A800]/20"
                    : "text-white/75 hover:bg-white/8 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActive ? "bg-[#1B2A6B]/15" : "bg-white/10 group-hover:bg-white/15"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-tight">{label}</div>
                  <div className={`text-[11px] leading-tight mt-0.5 ${isActive ? "text-[#1B2A6B]/60" : "text-white/40"}`}>
                    {description}
                  </div>
                </div>
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    isActive ? "translate-x-0.5 opacity-60" : "opacity-0 group-hover:opacity-40"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-4">
          {user && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5A800] text-xs font-black text-[#1B2A6B] shadow">
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {user.firstName} {user.lastName}
                </div>
                <div className="truncate text-xs text-white/45">{user.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}