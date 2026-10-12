import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiClock, FiDollarSign, FiPackage, FiShoppingCart, FiUsers } from 'react-icons/fi';
import { orderApi, productApi, userApi } from '../../api/backoffice';
import { useAuth } from '../../lib/auth';
import { ORDER_STATUS, PAYMENT_METHODS } from '../../lib/constants';
import { formatDateTime, formatPrice } from '../../lib/format';
import { errorMessage } from '../../lib/http';
import { useAsync } from '../../lib/useAsync';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';

const SAMPLE = 100; // orders used for revenue / status breakdown

function Stat({ icon: Icon, label, value, hint, tone }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const { data, loading, error, reload } = useAsync(async () => {
    const [orders, products, users] = await Promise.all([
      orderApi.list({ page_size: SAMPLE }),
      productApi.list({ page_size: 1 }),
      isAdmin ? userApi.list() : Promise.resolve(null),
    ]);
    const byStatus = orders.results.reduce((acc, o) => ({ ...acc, [o.status]: (acc[o.status] || 0) + 1 }), {});
    const revenue = orders.results.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_price), 0);
    return { orders, products: products.count, users: users?.length, byStatus, revenue };
  }, [isAdmin]);

  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;

  const sampled = data && data.orders.count > SAMPLE ? `trên ${SAMPLE} đơn gần nhất` : 'không tính đơn đã huỷ';

  return (
    <>
      <PageHeader title={`Xin chào, ${user.username} 👋`} subtitle="Tình hình kinh doanh của cửa hàng" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Stat icon={FiDollarSign} label="Doanh thu" value={formatPrice(data.revenue)} hint={sampled} tone="bg-emerald-50 text-emerald-600" />
            <Stat icon={FiShoppingCart} label="Đơn hàng" value={data.orders.count} tone="bg-brand-50 text-brand-600" />
            <Stat
              icon={FiClock}
              label="Chờ xử lý"
              value={data.byStatus.pending || 0}
              hint="Cần xác nhận / chờ thanh toán"
              tone="bg-amber-50 text-amber-600"
            />
            {isAdmin ? (
              <Stat icon={FiUsers} label="Người dùng" value={data.users} tone="bg-violet-50 text-violet-600" />
            ) : (
              <Stat icon={FiPackage} label="Sản phẩm" value={data.products} tone="bg-violet-50 text-violet-600" />
            )}
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Đơn hàng gần đây"
            action={
              <Link to="/orders" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                Tất cả <FiArrowRight />
              </Link>
            }
          />
          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !data.orders.results.length ? (
            <EmptyState icon={FiShoppingCart} title="Chưa có đơn hàng" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Thời gian</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.orders.results.slice(0, 8).map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/orders/${o.id}`} className="font-semibold text-brand-600 hover:underline">
                          #{o.id}
                        </Link>
                      </td>
                      <td>User #{o.user_id}</td>
                      <td className="text-slate-500">{formatDateTime(o.created_at)}</td>
                      <td>{PAYMENT_METHODS[o.payment_method]?.label || o.payment_method}</td>
                      <td>
                        <StatusBadge map={ORDER_STATUS} value={o.status} />
                      </td>
                      <td className="text-right font-medium text-slate-900">{formatPrice(o.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Theo trạng thái" subtitle={data && data.orders.count > SAMPLE ? `${SAMPLE} đơn gần nhất` : undefined} />
          <div className="space-y-4 p-5">
            {Object.entries(ORDER_STATUS).map(([key, s]) => {
              const n = data?.byStatus[key] || 0;
              const total = data?.orders.results.length || 0;
              return (
                <Link key={key} to={`/orders?search=${key}`} className="block">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="font-medium text-slate-900">{loading ? '…' : n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: total ? `${(n / total) * 100}%` : 0 }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
