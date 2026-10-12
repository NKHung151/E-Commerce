import React from 'react';
import { FiArrowRight, FiShoppingBag, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import {
  Button,
  Card,
  cx,
  EmptyState,
  PageHeader,
  PageLoader,
  ProductImage,
  QuantityStepper,
  useConfirm,
  useToast,
} from '../../shared/ui';
import { formatPrice } from '../../shared/utils/format';
import { linePrice } from '../../shared/utils/products';
import OrderSummary from '../components/OrderSummary';
import { useCart } from '../context/CartContext';

function CartLine({ line, busy, onQuantity, onRemove }) {
  const p = line.product;
  const price = linePrice(line);
  const href = `/products/${line.product_id}`;
  return (
    <div className={cx('flex gap-4 p-4 sm:p-5', busy && 'opacity-60')}>
      <Link to={href} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        <ProductImage src={p?.image_url} name={p?.name || ''} id={line.product_id} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-4">
          <div className="min-w-0">
            <Link to={href} className="line-clamp-2 font-medium text-slate-900 hover:text-brand-700">
              {p?.name || `Sản phẩm #${line.product_id}`}
            </Link>
            <p className="mt-1 text-sm text-slate-500">{formatPrice(price)}</p>
          </div>
          <p className="shrink-0 font-semibold text-slate-900">{formatPrice(price * line.quantity)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <QuantityStepper
            size="sm"
            editable={false}
            value={line.quantity}
            max={p ? p.stock : Infinity}
            disabled={busy}
            onChange={onQuantity}
          />
          <button
            onClick={onRemove}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <FiTrash2 className="h-4 w-4" /> Xoá
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, count, subtotal, loading, busyId, update, remove, clear } = useCart();
  const toast = useToast();
  const confirm = useConfirm();

  const run = (fn) => fn().catch((err) => toast(errorMessage(err), 'error'));

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
          {items.map((line) => (
            <CartLine
              key={line.id}
              line={line}
              busy={busyId === line.product_id}
              onQuantity={(qty) => run(() => update(line.product_id, qty))}
              onRemove={() => run(() => remove(line.product_id))}
            />
          ))}
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
