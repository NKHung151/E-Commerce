import React, { useEffect } from 'react';
import { FiCheckCircle, FiMapPin, FiPackage, FiRefreshCw } from 'react-icons/fi';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAsync } from '../../shared/hooks';
import { BackLink, Button, Card, CardHeader, cx, EmptyState, PageLoader, ProductImage, StatusBadge } from '../../shared/ui';
import { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../../shared/utils/constants';
import { addressLines, formatDateTime, formatPrice } from '../../shared/utils/format';
import { attachProducts } from '../../shared/utils/products';
import { catalogApi, orderApi } from '../api';
import OrderTimeline from '../components/OrderTimeline';

export default function OrderPage() {
  const { id } = useParams();
  const location = useLocation();
  const justPlaced = location.state?.justPlaced;

  const order = useAsync(
    async () => {
      const o = await orderApi.get(id);
      return { ...o, items: await attachProducts(o.items, (pid) => catalogApi.product(pid)) };
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
      <BackLink to="/orders">Đơn hàng của tôi</BackLink>

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
        <OrderTimeline status={o.status} />
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
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{addressLines(o.address)}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
