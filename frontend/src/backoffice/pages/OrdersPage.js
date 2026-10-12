import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiShoppingCart } from 'react-icons/fi';
import { orderApi } from '../../api/backoffice';
import { ORDER_STATUS, PAYMENT_METHODS } from '../../lib/constants';
import { formatDateTime, formatPrice } from '../../lib/format';
import { errorMessage } from '../../lib/http';
import { useAsync, useDebounced } from '../../lib/useAsync';
import { Card, EmptyState, ErrorState, Input, PageHeader, Skeleton, StatusBadge, cx } from '../../components/ui';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 15;

export default function OrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = ORDER_STATUS[params.get('search')] ? params.get('search') : '';
  const [text, setText] = useState(status ? '' : params.get('search') || '');
  const query = useDebounced(text);
  const page = Number(params.get('page')) || 1;
  // order-service's `search` matches id / user id (digits) or status / address (text).
  const search = status || query.trim().replace(/^#/, '');

  const { data, loading, error, reload } = useAsync(
    () => orderApi.list({ page, page_size: PAGE_SIZE, search: search || undefined }),
    [page, search]
  );

  const tab = (key) =>
    cx(
      'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
      status === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
    );

  return (
    <>
      <PageHeader title="Đơn hàng" subtitle={data ? `${data.count} đơn hàng` : undefined} />
      <Card className="overflow-hidden">
        <div className="space-y-4 border-b border-slate-100 px-4 pt-4">
          <div className="relative max-w-md">
            <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Mã đơn, mã khách hàng hoặc địa chỉ…"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setParams({});
              }}
            />
          </div>
          <div className="-mb-px flex gap-6 overflow-x-auto scrollbar-none">
            <button className={tab('')} onClick={() => setParams({})}>
              Tất cả
            </button>
            {Object.entries(ORDER_STATUS).map(([key, s]) => (
              <button
                key={key}
                className={tab(key)}
                onClick={() => {
                  setText('');
                  setParams({ search: key });
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={reload} />
        ) : loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data.results.length ? (
          <EmptyState icon={FiShoppingCart} title="Không có đơn hàng" description={search ? 'Không có đơn khớp bộ lọc.' : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Thời gian</th>
                  <th>Sản phẩm</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((o) => (
                  <tr key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                    <td>
                      <Link to={`/orders/${o.id}`} className="font-semibold text-brand-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        #{o.id}
                      </Link>
                    </td>
                    <td>User #{o.user_id}</td>
                    <td className="text-slate-500">{formatDateTime(o.created_at)}</td>
                    <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
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
        {data && (
          <div className="border-t border-slate-100 p-4">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              count={data.count}
              onChange={(p) => setParams({ ...(status ? { search: status } : {}), page: String(p) })}
            />
          </div>
        )}
      </Card>
    </>
  );
}
