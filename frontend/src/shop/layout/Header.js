import React, { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiLogOut, FiPackage, FiShoppingBag, FiUser } from 'react-icons/fi';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { Avatar, Logo, SearchInput, cx } from '../../shared/ui';
import { useCart } from '../context/CartContext';

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
    <form onSubmit={submit} className={className} role="search">
      <SearchInput variant="filled" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Tìm sản phẩm, thương hiệu…" />
    </form>
  );
}

/** Closes when clicking outside `ref` or when the route changes. */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return { open, setOpen, ref };
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { open, setOpen, ref } = useDropdown();
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100"
        aria-expanded={open}
      >
        <Avatar name={user.username} size="sm" />
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

function CartButton() {
  const { count } = useCart();
  return (
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
  );
}

export default function Header() {
  const { isAuthenticated } = useAuth();
  const navLink = ({ isActive }) =>
    cx('rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900');

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
      <div className="container-page flex h-16 items-center gap-4">
        <Logo to="/" className="shrink-0" />
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
          <CartButton />
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
