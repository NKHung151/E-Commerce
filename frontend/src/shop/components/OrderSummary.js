import React from 'react';
import { Card } from '../../shared/ui';
import { formatPrice } from '../../shared/utils/format';

/** Sticky totals card shared by the cart and checkout pages. */
export default function OrderSummary({ subtotal, count, children }) {
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
