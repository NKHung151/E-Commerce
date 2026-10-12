import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight, FiLogOut, FiPackage, FiShoppingBag } from 'react-icons/fi';
import { authApi } from '../../api/shop';
import { useAuth } from '../../lib/auth';
import { ROLES } from '../../lib/constants';
import { formatDate } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { Button, Card, PageHeader, Skeleton, StatusBadge } from '../../components/ui';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { data: me, loading } = useAsync(() => authApi.me(), []);
  const profile = me || user;

  const links = [
    { to: '/orders', icon: FiPackage, label: 'Đơn hàng của tôi' },
    { to: '/cart', icon: FiShoppingBag, label: 'Giỏ hàng' },
  ];

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader title="Tài khoản" />
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {profile.username.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{profile.username}</h2>
            <p className="truncate text-sm text-slate-500">{profile.email}</p>
            <div className="mt-1.5">
              <StatusBadge map={ROLES} value={profile.role} />
            </div>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Mã khách hàng</dt>
            <dd className="mt-0.5 font-medium text-slate-900">#{profile.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Ngày tham gia</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {loading ? <Skeleton className="h-5 w-24" /> : formatDate(me?.created_at) || '—'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-6 divide-y divide-slate-100">
        {links.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-6 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Icon className="h-5 w-5 text-slate-400" />
            <span className="flex-1">{label}</span>
            <FiChevronRight className="text-slate-400" />
          </Link>
        ))}
      </Card>

      <Button variant="danger-ghost" className="mt-6" onClick={logout}>
        <FiLogOut /> Đăng xuất
      </Button>
    </div>
  );
}
