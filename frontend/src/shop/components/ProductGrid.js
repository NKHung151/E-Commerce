import React from 'react';
import { cx } from '../../shared/ui';
import ProductCard, { ProductCardSkeleton } from './ProductCard';

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
