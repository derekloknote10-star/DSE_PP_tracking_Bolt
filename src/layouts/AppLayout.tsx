import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, FileText, Target, Settings, LogOut, Menu, X, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/papers', label: 'Past Papers', icon: FileText },
  { to: '/topic-sets', label: 'Topic Sets', icon: BookOpen },
  { to: '/targets', label: 'Targets', icon: Target },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const pageTitle = navItems.find((n) =>
    n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )?.label ?? 'DSE Tracker';

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-neutral-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-neutral-900 text-sm leading-tight">DSE Tracker</p>
            <p className="text-xs text-neutral-400 leading-tight">Progress Tracker</p>
          </div>
          <button
            className="ml-auto lg:hidden text-neutral-400 hover:text-neutral-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* User badge */}
        <div className="mx-4 mt-4 px-3 py-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
          <p className="text-sm font-semibold text-neutral-800 truncate">
            {profile?.display_name ?? profile?.email}
          </p>
          <span className={`badge mt-0.5 ${profile?.role === 'parent' ? 'badge-primary' : 'badge-success'}`}>
            {profile?.role}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-600'} />
                  {label}
                  {isActive && <ChevronRight size={14} className="ml-auto text-primary-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-neutral-100">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-500 hover:bg-danger-50 hover:text-danger-600 w-full transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-neutral-200 px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            className="lg:hidden btn-ghost p-2 -ml-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <h1 className="font-semibold text-neutral-900">{pageTitle}</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
