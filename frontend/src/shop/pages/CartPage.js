import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiMinus, FiPlus, FiShoppingBag, FiTrash2 } from 'react-icons/fi';
import { formatPrice } from '../../lib/format';
import { errorMessage } from '../../lib/http';
import { Button, Card, EmptyState, PageHeader, PageLoader, cx } from '../../components/ui';
import { useConfirm, useToast } from '../../components/ui/feedback';
import { ProductImage } from '../../components/ui/product';
import { useCart } from '../CartContext';

export function OrderSummary({ subtotal, count, children }) {
  return (
    <Card className="p-6 lg:sticky lg:top-24">
      <h2 className="text-lg font-semibold text-slate-900">Tóm tắt đơn hàng</h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Tạm tính ({count} sản phẩm)</dt>
          <dd className="font-medium text-slate-900">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Phí vận chuyển</dt>
          <dd className="font-medium text-emerald-600">Miễn phí</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
          <dt className="font-semibold text-slate-900">Tổng cộng</dt>
          <dd className="font-bold text-brand-700">{formatPrice(subtotal)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-slate-400">Giá cuối cùng được xác nhận theo giá hiện hành khi đặt hàng.</p>
      {children && <div className="mt-6">{children}</div>}
    </Card>
  );
}

export default function CartPage() {
  const { items, count, subtotal, loading, busyId, update, remove, clear } = useCart();
  const toast = useToast();
  const confirm = useConfirm();

  const run = async (fn) => {
    try {
      await fn();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (loading && !items.length) return <PageLoader />;

  if (!items.length) {
    return (
      <div className="container-page py-10">
        <Card>
          <EmptyState
            icon={FiShoppingBag}
            title="Giỏ hàng trống"
            description="Hãy thêm vài sản phẩm bạn yêu thích vào giỏ nhé."
            action={<Button as={Link} to="/products">Tiếp tục mua sắm</Button>}
          />
        </Card>
      </div>
    );
  }

  const onClear = async () => {
    if (await confirm({ title: 'Xoá toàn bộ giỏ hàng?', danger: true, confirmText: 'Xoá hết' })) run(clear);
  };

  return (
    <div className="container-page py-8">
      <PageHeader
        title="Giỏ hàng"
        subtitle={`${count} sản phẩm`}
        actions={
          <Button variant="danger-ghost" size="sm" onClick={onClear}>
            <FiTrash2 /> Xoá tất cả
          </Button>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <Card className="divide-y divide-slate-100">
          {items.map((item) => {
            const p = item.product;
            const price = Number(p?.price ?? item.unit_price);
            const busy = busyId === item.product_id;
            return (
              <div key={item.id} className={cx('flex gap-4 p-4 sm:p-5', busy && 'opacity-60')}>
                <Link to={`/products/${item.product_id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <ProductImage src={p?.image_url} name={p?.name || ''} id={item.product_id} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <Link to={`/products/${item.product_id}`} className="line-clamp-2 font-medium text-slate-900 hover:text-brand-700">
                        {p?.name || `Sản phẩm #${item.product_id}`}
                      </Link>
                      <p className="mt-1 text-sm text-slate-500">{formatPrice(price)}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-slate-900">{formatPrice(price * item.quantity)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="inline-flex items-center rounded-xl ring-1 ring-slate-200">
                      <button
                        className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        disabled={busy || item.quantity <= 1}
                        onClick={() => run(() => update(item.product_id, item.quantity - 1))}
                        aria-label="Giảm"
                      >
                        <FiMinus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        disabled={busy || (p && item.quantity >= p.stock)}
                        onClick={() => run(() => update(item.product_id, item.quantity + 1))}
                        aria-label="Tăng"
                      >
                        <FiPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => run(() => remove(item.product_id))}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <FiTrash2 className="h-4 w-4" /> Xoá
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
        <OrderSummary subtotal={subtotal} count={count}>
          <Button as={Link} to="/checkout" size="lg" className="w-full">
            Tiến hành thanh toán <FiArrowRight />
          </Button>
          <Link to="/products" className="mt-3 block text-center text-sm font-medium text-brand-600 hover:text-brand-700">
            Tiếp tục mua sắm
          </Link>
        </OrderSummary>
      </div>
    </div>
  );
}
