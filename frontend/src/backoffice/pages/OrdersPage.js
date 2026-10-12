import React, { useEffect, useState } from 'react';
import { FiShoppingCart } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import { pageOf, useAsync, useDebounced, useQueryParams } from '../../shared/hooks';
import { Card, cx, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, SkeletonList, StatusBadge } from '../../shared/ui';
import { ORDER_STATUS, PAYMENT_METHODS } from '../../shared/utils/constants';
import { countItems, formatDateTime, formatPrice } from '../../shared/utils/format';
import { orderApi } from '../api';

const PAGE_SIZE = 15;

export default function OrdersPage() {
  const navigate = useNavigate();
  // ?status=pending (tab) or ?q=123 (free text); the dashboard links to ?status=…
  const [query, setQuery] = useQueryParams();
  const status = ORDER_STATUS[query.status] ? query.status : '';
  const page = pageOf(query);
  const [text, setText] = useState(query.q || '');
  const debounced = useDebounced(text);

  useEffect(() => {
    if (debounced !== (query.q || '')) setQuery({ q: debounced.trim(), status: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // order-service `search` matches id / user id (digits) or status / address (text).
  const search = status || (query.q || '').replace(/^#/, '');
  const { data, loading, error, reload } = useAsync(
    () => orderApi.list({ page, page_size: PAGE_SIZE, search: search || undefined }),
    [page, search]
  );

  const selectTab = (key) => {
    setText('');
    setQuery({ status: key, q: '' });
  };
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
          <SearchInput
            className="max-w-md"
            placeholder="Mã đơn, mã khách hàng hoặc địa chỉ…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="-mb-px flex gap-6 overflow-x-auto scrollbar-none">
            <button className={tab('')} onClick={() => selectTab('')}>
              Tất cả
            </button>
            {Object.entries(ORDER_STATUS).map(([key, s]) => (
              <button key={key} className={tab(key)} onClick={() => selectTab(key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={reload} />
        ) : loading ? (
          <SkeletonList rows={8} />
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
                    <td>{countItems(o.items)}</td>
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
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={(p) => setQuery({ page: p })} />
          </div>
        )}
      </Card>
    </>
  );
}
