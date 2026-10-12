import React from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../../config';
import { Logo } from '../../shared/ui';

const SHOP_LINKS = [
  { to: '/products', label: 'Tất cả sản phẩm' },
  { to: '/cart', label: 'Giỏ hàng' },
  { to: '/orders', label: 'Theo dõi đơn hàng' },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <Logo to="/" />
          <p className="mt-3 max-w-xs text-sm text-slate-500">
            Đồ án Kiến trúc & Thiết kế phần mềm — nền tảng thương mại điện tử theo kiến trúc microservices.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Mua sắm</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            {SHOP_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-slate-900">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Hỗ trợ</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li>Trợ lý AI ở góc phải màn hình</li>
            <li>Thanh toán: thẻ, chuyển khoản, COD</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {APP_NAME}. PTIT.
      </div>
    </footer>
  );
}
