import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiChevronRight, FiPackage } from 'react-icons/fi';
import { orderApi } from '../../api/shop';
import { ORDER_STATUS, PAYMENT_METHODS } from '../../lib/constants';
import { formatDateTime, formatPrice } from '../../lib/format';
import { errorMessage } from '../../lib/http';
import { useAsync } from '../../lib/useAsync';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const { data, loading, error, reload } = useAsync(() => orderApi.list({ page, page_size: PAGE_SIZE }), [page]);

  return (
    <div className="container-page max-w-4xl py-8">
      <PageHeader title="Đơn hàng của tôi" subtitle={data ? `${data.count} đơn hàng` : undefined} />
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !data.results.length ? (
        <Card>
          <EmptyState
            icon={FiPackage}
            title="Bạn chưa có đơn hàng nào"
            description="Các đơn hàng đã đặt sẽ xuất hiện tại đây."
            action={<Button as={Link} to="/products">Mua sắm ngay</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data.results.map((o) => {
              const itemCount = o.items.reduce((n, i) => n + i.quantity, 0);
              return (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200/70 transition hover:shadow-md"
                >
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:flex">
                    <FiPackage className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">Đơn #{o.id}</span>
                      <StatusBadge map={ORDER_STATUS} value={o.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateTime(o.created_at)} · {itemCount} sản phẩm · {PAYMENT_METHODS[o.payment_method]?.label || o.payment_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatPrice(o.total_price)}</p>
                  </div>
                  <FiChevronRight className="text-slate-400" />
                </Link>
              );
            })}
          </div>
          <Pagination className="mt-6" page={page} pageSize={PAGE_SIZE} count={data.count} onChange={(p) => setParams({ page: p })} />
        </>
      )}
    </div>
  );
}
