import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { aiApi } from '../../api/shop';
import { useAuth } from '../../lib/auth';
import { errorMessage } from '../../lib/http';
import { Skeleton, cx } from '../../components/ui';
import { useToast } from '../../components/ui/feedback';
import { Price, ProductImage, Stars } from '../../components/ui/product';
import { useCart } from '../CartContext';

/**
 * Works with both product-service products and AI ProductSummary objects
 * ({id, name, price, image, category}).
 */
export default function ProductCard({ product }) {
  const { user, isAuthenticated } = useAuth();
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [adding, setAdding] = useState(false);

  const image = product.image_url || product.image;
  const category = product.category_name || (typeof product.category === 'string' ? product.category : '');
  const discount = Number(product.discount) || 0;
  const outOfStock = product.stock !== undefined && (product.stock <= 0 || product.is_available === false);

  const onAdd = async (e) => {
    e.preventDefault(); // the card is a link
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setAdding(true);
    try {
      await add(product.id, 1);
      toast(`Đã thêm “${product.name}” vào giỏ`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link
      to={`/products/${product.id}`}
      onClick={() => user && aiApi.track(user.id, product.id, 'click')}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <ProductImage
          src={image}
          name={product.name}
          id={product.id}
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-lg bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
            -{Math.round(discount)}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-x-3 bottom-3 rounded-lg bg-slate-900/80 py-1 text-center text-xs font-medium text-white">
            Hết hàng
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {category && <p className="mb-1 truncate text-xs font-medium text-brand-600">{category}</p>}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-800">{product.name}</h3>
        {product.rating !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            <Stars value={product.rating} size="h-3.5 w-3.5" />
            <span className="text-xs text-slate-400">{Number(product.rating).toFixed(1)}</span>
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <Price value={product.price} discount={discount} />
          <button
            onClick={onAdd}
            disabled={adding || outOfStock}
            aria-label="Thêm vào giỏ"
            className={cx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors',
              'hover:bg-brand-600 hover:text-white disabled:opacity-40'
            )}
          >
            <FiPlus className={cx('h-4 w-4', adding && 'animate-spin')} />
          </button>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-4 h-5 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, loading, skeletons = 8, className }) {
  return (
    <div className={cx('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
      {loading && Array.from({ length: skeletons }, (_, i) => <ProductCardSkeleton key={`s${i}`} />)}
    </div>
  );
}

/** Titled horizontal section; renders nothing when there is nothing to show. */
export function ProductSection({ title, subtitle, products, loading, action }) {
  if (!loading && !products?.length) return null;
  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <ProductGrid products={products || []} loading={loading} skeletons={4} />
    </section>
  );
}
