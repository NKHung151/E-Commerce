import React, { useState } from 'react';
import { FiCheckCircle, FiCreditCard, FiMapPin, FiRefreshCw, FiTruck, FiUser } from 'react-icons/fi';
import { useParams } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import { useAsync } from '../../shared/hooks';
import { Button, Card, CardHeader, cx, ErrorState, PageHeader, PageLoader, StatusBadge, useConfirm, useToast } from '../../shared/ui';
import {
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  SHIPMENT_STATUS,
  SHIPMENT_TRANSITIONS,
} from '../../shared/utils/constants';
import { addressLines, formatDateTime, formatPrice } from '../../shared/utils/format';
import { attachProducts } from '../../shared/utils/products';
import { orderApi, paymentApi, productApi, shippingApi } from '../api';
import ProductCell from '../components/ProductCell';
import TransitionButtons from '../components/TransitionButtons';

/** 404 means the saga has not created the record yet (or never will, e.g. cancelled early). */
const orNull = (promise) => promise.catch((err) => (err.response?.status === 404 ? null : Promise.reject(err)));

function PaymentCard({ order, payment, busy, onConfirm }) {
  return (
    <Card>
      <CardHeader
        title="Thanh toán"
        subtitle={PAYMENT_METHODS[order.payment_method]?.label || order.payment_method}
        action={payment && <StatusBadge map={PAYMENT_STATUS} value={payment.status} />}
      />
      <div className="space-y-3 p-5 text-sm">
        {!payment ? (
          <p className="text-slate-400">Chưa có bản ghi thanh toán.</p>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Số tiền</span>
              <span className="font-medium text-slate-900">{formatPrice(payment.amount)}</span>
            </div>
            {payment.paid_at && (
              <div className="flex justify-between">
                <span className="text-slate-500">Thanh toán lúc</span>
                <span className="text-slate-700">{formatDateTime(payment.paid_at)}</span>
              </div>
            )}
            {payment.status === 'pending' && order.status !== 'cancelled' && (
              <Button className="w-full" disabled={busy} onClick={onConfirm}>
                <FiCheckCircle /> Xác nhận đã thanh toán
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function ShipmentCard({ shipment, busy, onChange }) {
  return (
    <Card>
      <CardHeader title="Vận chuyển" action={shipment && <StatusBadge map={SHIPMENT_STATUS} value={shipment.status} />} />
      <div className="p-5 text-sm">
        {!shipment ? (
          <p className="flex items-center gap-2 text-slate-400">
            <FiTruck /> Vận đơn được tạo sau khi thanh toán và trừ kho thành công.
          </p>
        ) : (
          <>
            <p className="mb-3 text-slate-500">Vận đơn #{shipment.id}</p>
            <TransitionButtons
              statusMap={SHIPMENT_STATUS}
              transitions={SHIPMENT_TRANSITIONS}
              current={shipment.status}
              busy={busy}
              onSelect={onChange}
            />
          </>
        )}
      </div>
    </Card>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const [order, payment, shipment] = await Promise.all([
      orderApi.get(id),
      orNull(paymentApi.status(id)),
      orNull(shippingApi.status(id)),
    ]);
    order.items = await attachProducts(order.items, (pid) => productApi.get(pid));
    return { order, payment, shipment };
  }, [id]);

  const act = async (fn, success, confirmOptions) => {
    if (confirmOptions && !(await confirm(confirmOptions))) return;
    setBusy(true);
    try {
      await fn();
      toast(success);
      // Saga side effects (payment/shipment) are asynchronous; give them a moment.
      setTimeout(reload, 800);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;

  const { order, payment, shipment } = data;

  const changeOrderStatus = (status) =>
    act(
      () => orderApi.updateStatus(order.id, status),
      `Đã chuyển đơn sang “${ORDER_STATUS[status].label}”`,
      status === 'cancelled' && {
        title: `Huỷ đơn #${order.id}?`,
        message: 'Tồn kho sẽ được hoàn lại, thanh toán được hoàn tiền và vận đơn bị huỷ.',
        danger: true,
        confirmText: 'Huỷ đơn',
      }
    );

  const confirmPayment = () =>
    act(() => paymentApi.confirm(order.id), 'Đã xác nhận thanh toán', {
      title: 'Xác nhận đã nhận tiền?',
      message: `${formatPrice(payment.amount)} cho đơn #${order.id}. Đơn sẽ được chuyển sang xử lý và tạo vận đơn.`,
      confirmText: 'Xác nhận',
    });

  const changeShipment = (status) =>
    act(() => shippingApi.updateStatus(shipment.id, status), `Vận đơn: ${SHIPMENT_STATUS[status].label}`);

  return (
    <>
      <PageHeader
        back={{ to: '/orders', label: 'Đơn hàng' }}
        title={`Đơn hàng #${order.id}`}
        subtitle={`Đặt lúc ${formatDateTime(order.created_at)}`}
        actions={
          <Button variant="secondary" onClick={reload} disabled={loading}>
            <FiRefreshCw className={cx(loading && 'animate-spin')} /> Làm mới
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Trạng thái đơn hàng" action={<StatusBadge map={ORDER_STATUS} value={order.status} />} />
            <div className="p-5">
              <TransitionButtons
                statusMap={ORDER_STATUS}
                transitions={ORDER_TRANSITIONS}
                current={order.status}
                busy={busy}
                onSelect={changeOrderStatus}
              />
              {order.status === 'processing' && (
                <p className="mt-3 text-xs text-slate-500">Chuyển sang “Đang giao” sẽ tự động cập nhật vận đơn.</p>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Sản phẩm" subtitle={`${order.items.length} mặt hàng`} />
            <table className="table-base">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th className="text-right">Đơn giá</th>
                  <th className="text-right">SL</th>
                  <th className="text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <ProductCell product={i.product} productId={i.product_id} />
                    </td>
                    <td className="text-right">{formatPrice(i.unit_price)}</td>
                    <td className="text-right">{i.quantity}</td>
                    <td className="text-right font-medium text-slate-900">{formatPrice(Number(i.unit_price) * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900">
                    Tổng cộng
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-brand-700">{formatPrice(order.total_price)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Khách hàng" />
            <div className="space-y-3 p-5 text-sm">
              <p className="flex items-center gap-2 text-slate-700">
                <FiUser className="text-slate-400" /> User #{order.user_id}
              </p>
              <p className="flex items-start gap-2 text-slate-700">
                <FiMapPin className="mt-0.5 shrink-0 text-slate-400" />
                <span className="whitespace-pre-line">{addressLines(order.address)}</span>
              </p>
            </div>
          </Card>
          <PaymentCard order={order} payment={payment} busy={busy} onConfirm={confirmPayment} />
          <ShipmentCard shipment={shipment} busy={busy} onChange={changeShipment} />
          <p className="flex items-center gap-2 px-1 text-xs text-slate-400">
            <FiCreditCard /> Thanh toán và vận đơn được cập nhật tự động qua Saga (RabbitMQ).
          </p>
        </div>
      </div>
    </>
  );
}
