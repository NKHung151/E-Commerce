import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FiChevronDown, FiLogOut, FiPackage, FiSearch, FiShoppingBag, FiUser } from 'react-icons/fi';
import { APP_NAME } from '../config';
import { useAuth } from '../lib/auth';
import { cx } from '../components/ui';
import { useCart } from './CartContext';

export function Logo({ to = '/', className }) {
  return (
    <Link to={to} className={cx('flex items-center gap-2 font-bold tracking-tight text-slate-900', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-sm text-white shadow-sm shadow-brand-600/30">
        P
      </span>
      <span className="text-lg">{APP_NAME}</span>
    </Link>
  );
}

function SearchBox({ className }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [value, setValue] = useState(params.get('search') || '');

  useEffect(() => setValue(params.get('search') || ''), [params]);

  const submit = (e) => {
    e.preventDefault();
    const q = value.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <form onSubmit={submit} className={cx('relative', className)} role="search">
      <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm sản phẩm, thương hiệu…"
        className="h-10 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500"
      />
    </form>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100';
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {user.username.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-slate-700 md:block">{user.username}</span>
        <FiChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 animate-slide-down rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-slate-900">{user.username}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <Link to="/profile" className={item}>
            <FiUser /> Tài khoản
          </Link>
          <Link to="/orders" className={item}>
            <FiPackage /> Đơn hàng của tôi
          </Link>
          <button onClick={logout} className={cx(item, 'text-rose-600 hover:bg-rose-50')}>
            <FiLogOut /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { isAuthenticated } = useAuth();
  const { count } = useCart();
  const navLink = ({ isActive }) =>
    cx('rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900');

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
      <div className="container-page flex h-16 items-center gap-4">
        <Logo className="shrink-0" />
        <nav className="ml-2 hidden items-center lg:flex">
          <NavLink to="/" end className={navLink}>
            Trang chủ
          </NavLink>
          <NavLink to="/products" className={navLink}>
            Sản phẩm
          </NavLink>
        </nav>
        <SearchBox className="mx-auto hidden w-full max-w-md sm:block" />
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label={`Giỏ hàng (${count})`}
          >
            <FiShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-1">
              <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="hidden rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:block"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="container-page pb-3 sm:hidden">
        <SearchBox />
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-slate-500">
            Đồ án Kiến trúc & Thiết kế phần mềm — nền tảng thương mại điện tử theo kiến trúc microservices.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Mua sắm</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li>
              <Link to="/products" className="hover:text-slate-900">
                Tất cả sản phẩm
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-slate-900">
                Giỏ hàng
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-slate-900">
                Theo dõi đơn hàng
              </Link>
            </li>
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
