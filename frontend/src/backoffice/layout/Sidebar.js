import React from 'react';
import { FiExternalLink, FiGrid, FiLayers, FiLogOut, FiPackage, FiShoppingCart, FiUsers } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { Avatar, cx, Logo, StatusBadge } from '../../shared/ui';
import { ROLES } from '../../shared/utils/constants';

const NAV = [
  { to: '/', label: 'Tổng quan', icon: FiGrid, end: true },
  { to: '/orders', label: 'Đơn hàng', icon: FiShoppingCart },
  { to: '/products', label: 'Sản phẩm', icon: FiPackage },
  { to: '/categories', label: 'Danh mục', icon: FiLayers },
  { to: '/users', label: 'Người dùng', icon: FiUsers, adminOnly: true },
];

const linkClass = ({ isActive }) =>
  cx(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
  );

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-slate-900 px-4 py-5">
      <Logo tone="light" subtitle="Back office" className="mb-8 px-2" />
      <nav className="flex-1 space-y-1">
        {NAV.filter((n) => !n.adminOnly || user.role === 'admin').map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass} onClick={onNavigate}>
            <Icon className="h-[1.1rem] w-[1.1rem]" /> {label}
          </NavLink>
        ))}
      </nav>
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
      >
        <FiExternalLink className="h-[1.1rem] w-[1.1rem]" /> Xem cửa hàng
      </a>
      <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <Avatar name={user.username} tone="solid" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.username}</p>
          <StatusBadge map={ROLES} value={user.role} />
        </div>
        <button onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Đăng xuất">
          <FiLogOut />
        </button>
      </div>
    </div>
  );
}
