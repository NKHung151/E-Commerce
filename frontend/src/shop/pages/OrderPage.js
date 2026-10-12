import React, { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiCheckCircle, FiMapPin, FiPackage, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import { catalogApi, orderApi } from '../../api/shop';
import { ORDER_FLOW, ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../../lib/constants';
import { formatDateTime, formatPrice } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { Button, Card, CardHeader, EmptyState, PageLoader, StatusBadge, cx } from '../../components/ui';
import { ProductImage } from '../../components/ui/product';

function Timeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
        <FiXCircle className="h-5 w-5 shrink-0" />
        Đơn hàng đã bị huỷ. Nếu bạn đã thanh toán, tiền sẽ được hoàn lại và tồn kho được trả về.
      </div>
    );
  }
  const current = ORDER_FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2">
      {ORDER_FLOW.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="flex flex-col items-center text-center">
            <div className="relative flex w-full items-center justify-center">
              {i > 0 && (
                <span className={cx('absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2', i <= current ? 'bg-brand-500' : 'bg-slate-200')} />
              )}
              <span
                className={cx(
                  'relative z-10 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white',
                  done ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'
                )}
              >
                {done ? <FiCheck className="h-4 w-4" /> : i + 1}
              </span>
            </div>
            <span className={cx('mt-2 text-xs font-medium', done ? 'text-slate-900' : 'text-slate-400')}>{ORDER_STATUS[step].label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const location = useLocation();
  const justPlaced = location.state?.justPlaced;

  const order = useAsync(
    async () => {
      const o = await orderApi.get(id);
      const products = await Promise.all(o.items.map((i) => catalogApi.product(i.product_id).catch(() => null)));
      return { ...o, items: o.items.map((i, k) => ({ ...i, product: products[k] })) };
    },
    [id]
  );
  // 404 until payment-service has consumed saga-order-created.
  const payment = useAsync(() => orderApi.paymentStatus(id).catch(() => null), [id]);

  // The saga runs asynchronously: refresh a few times while the order is still settling.
  const settling = order.data?.status === 'pending' || !payment.data;
  useEffect(() => {
    if (!settling) return undefined;
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      order.reload();
      payment.reload();
      if (n >= 5) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settling, id]);

  if (order.loading && !order.data) return <PageLoader />;
  if (order.error || !order.data) {
    return (
      <EmptyState
        icon={FiPackage}
        title="Không tìm thấy đơn hàng"
        action={<Button as={Link} to="/orders">Về danh sách đơn hàng</Button>}
      />
    );
  }

  const o = order.data;
  const p = payment.data;

  return (
    <div className="container-page max-w-5xl py-8">
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <FiArrowLeft /> Đơn hàng của tôi
      </Link>

      {justPlaced && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
          <FiCheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-900">Đặt hàng thành công!</p>
            <p className="mt-0.5 text-sm text-emerald-800">
              {o.payment_method === 'bank'
                ? 'Vui lòng chuyển khoản; đơn sẽ được xử lý ngay khi cửa hàng xác nhận thanh toán.'
                : 'Đơn hàng của bạn đang được xử lý. Bạn có thể theo dõi trạng thái tại trang này.'}
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Đơn hàng #{o.id}</h1>
          <p className="mt-1 text-sm text-slate-500">Đặt lúc {formatDateTime(o.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge map={ORDER_STATUS} value={o.status} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              order.reload();
              payment.reload();
            }}
            aria-label="Làm mới"
          >
            <FiRefreshCw className={cx(order.loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <Card className="mb-6 p-6">
        <Timeline status={o.status} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader title="Sản phẩm" subtitle={`${o.items.length} mặt hàng`} />
          <ul className="divide-y divide-slate-100">
            {o.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 px-5 py-4">
                <Link to={`/products/${i.product_id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <ProductImage src={i.product?.image_url} name={i.product?.name || ''} id={i.product_id} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${i.product_id}`} className="line-clamp-1 font-medium text-slate-900 hover:text-brand-700">
                    {i.product?.name || `Sản phẩm #${i.product_id}`}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {formatPrice(i.unit_price)} × {i.quantity}
                  </p>
                </div>
                <p className="font-semibold text-slate-900">{formatPrice(Number(i.unit_price) * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-slate-100 px-5 py-4">
            <span className="font-semibold text-slate-900">Tổng cộng</span>
            <span className="text-lg font-bold text-brand-700">{formatPrice(o.total_price)}</span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900">Thanh toán</h3>
            <p className="mt-2 text-sm text-slate-600">{PAYMENT_METHODS[o.payment_method]?.label || o.payment_method}</p>
            <div className="mt-3">
              {p ? (
                <StatusBadge map={PAYMENT_STATUS} value={p.status} />
              ) : (
                <span className="text-sm text-slate-400">Đang khởi tạo thanh toán…</span>
              )}
            </div>
            {p?.paid_at && <p className="mt-2 text-xs text-slate-500">Thanh toán lúc {formatDateTime(p.paid_at)}</p>}
          </Card>
          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <FiMapPin className="text-slate-400" /> Giao đến
            </h3>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{o.address?.split(' · ').join('\n') || '—'}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
