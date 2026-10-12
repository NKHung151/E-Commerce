import React, { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FiExternalLink, FiGrid, FiLayers, FiLogOut, FiMenu, FiPackage, FiShoppingCart, FiUsers, FiX } from 'react-icons/fi';
import { APP_NAME } from '../config';
import { useAuth } from '../lib/auth';
import { ROLES } from '../lib/constants';
import { PageLoader, StatusBadge, cx } from '../components/ui';

export const NAV = [
  { to: '/', label: 'Tổng quan', icon: FiGrid, end: true },
  { to: '/orders', label: 'Đơn hàng', icon: FiShoppingCart },
  { to: '/products', label: 'Sản phẩm', icon: FiPackage },
  { to: '/categories', label: 'Danh mục', icon: FiLayers },
  { to: '/users', label: 'Người dùng', icon: FiUsers, adminOnly: true },
];

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const item = ({ isActive }) =>
    cx(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
      isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
    );

  return (
    <div className="flex h-full flex-col bg-slate-900 px-4 py-5">
      <div className="mb-8 flex items-center gap-2 px-2 font-bold text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-sm">P</span>
        <span>
          {APP_NAME}
          <span className="block text-xs font-medium text-slate-400">Back office</span>
        </span>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.filter((n) => !n.adminOnly || user.role === 'admin').map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={item} onClick={onNavigate}>
            <Icon className="h-[1.1rem] w-[1.1rem]" /> {label}
          </NavLink>
        ))}
      </nav>
      <a href="/" target="_blank" rel="noreferrer" className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
        <FiExternalLink className="h-[1.1rem] w-[1.1rem]" /> Xem cửa hàng
      </a>
      <div className="rounded-2xl bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
            {user.username.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.username}</p>
            <StatusBadge map={ROLES} value={user.role} />
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Đăng xuất">
            <FiLogOut />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-slide-up">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Mở menu">
            {open ? <FiX /> : <FiMenu />}
          </button>
          <span className="font-semibold text-slate-900">{APP_NAME}</span>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
