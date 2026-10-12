import React, { useState } from 'react';
import { FiCreditCard, FiDollarSign, FiHome, FiLock } from 'react-icons/fi';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import { Alert, Button, Card, cx, Field, Input, PageHeader, PageLoader, ProductImage, Textarea, useToast } from '../../shared/ui';
import { PAYMENT_METHODS } from '../../shared/utils/constants';
import { formatPrice, joinAddress } from '../../shared/utils/format';
import { linePrice } from '../../shared/utils/products';
import { orderApi } from '../api';
import OrderSummary from '../components/OrderSummary';
import { useCart } from '../context/CartContext';

const METHOD_ICONS = { card: FiCreditCard, bank: FiHome, cash: FiDollarSign };

export default function CheckoutPage() {
  const { items, count, subtotal, loading, clear } = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: '', phone: '', address: '' });
  const [method, setMethod] = useState('card');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading && !items.length) return <PageLoader />;
  if (!items.length && !submitting) return <Navigate to="/cart" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const order = await orderApi.create({
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        address: joinAddress(form.fullName, form.phone, form.address),
        payment_method: method,
      });
      await clear().catch(() => {});
      toast('Đặt hàng thành công!');
      navigate(`/orders/${order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (err) {
      setError(errorMessage(err, 'Không thể đặt hàng, vui lòng thử lại.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-8">
      <PageHeader title="Thanh toán" subtitle="Kiểm tra thông tin trước khi đặt hàng" />
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-5 font-semibold text-slate-900">Thông tin giao hàng</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ và tên" required>
                <Input value={form.fullName} onChange={set('fullName')} required autoComplete="name" />
              </Field>
              <Field label="Số điện thoại" required>
                <Input
                  value={form.phone}
                  onChange={set('phone')}
                  required
                  type="tel"
                  pattern="[0-9+ ]{9,15}"
                  title="Số điện thoại 9–15 chữ số"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Địa chỉ nhận hàng" required className="sm:col-span-2">
                <Textarea
                  rows={3}
                  value={form.address}
                  onChange={set('address')}
                  required
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  autoComplete="street-address"
                />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-5 font-semibold text-slate-900">Phương thức thanh toán</h2>
            <div className="space-y-3">
              {Object.entries(PAYMENT_METHODS).map(([key, m]) => {
                const Icon = METHOD_ICONS[key];
                const active = method === key;
                return (
                  <label
                    key={key}
                    className={cx(
                      'flex cursor-pointer items-center gap-4 rounded-2xl p-4 ring-1 transition',
                      active ? 'bg-brand-50/60 ring-2 ring-brand-500' : 'ring-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <input type="radio" name="method" value={key} checked={active} onChange={() => setMethod(key)} className="sr-only" />
                    <span
                      className={cx(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{m.label}</span>
                      <span className="block text-xs text-slate-500">{m.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>
        </div>

        <OrderSummary subtotal={subtotal} count={count}>
          <ul className="mb-6 max-h-64 space-y-3 overflow-y-auto">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <ProductImage src={i.product?.image_url} name={i.product?.name || ''} id={i.product_id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm text-slate-700">{i.product?.name || `#${i.product_id}`}</span>
                  <span className="text-xs text-slate-400">× {i.quantity}</span>
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {formatPrice(linePrice(i) * i.quantity)}
                </span>
              </li>
            ))}
          </ul>
          {error && <Alert className="mb-4">{error}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            <FiLock /> Đặt hàng
          </Button>
          <Link to="/cart" className="mt-3 block text-center text-sm font-medium text-brand-600 hover:text-brand-700">
            Quay lại giỏ hàng
          </Link>
        </OrderSummary>
      </form>
    </div>
  );
}
