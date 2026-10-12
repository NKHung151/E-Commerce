import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiX } from 'react-icons/fi';
import { catalogApi } from '../../api/shop';
import { useAuth } from '../../lib/auth';
import { errorMessage } from '../../lib/http';
import { useAsync } from '../../lib/useAsync';
import { Button, EmptyState, ErrorState, Input, cx } from '../../components/ui';
import Pagination from '../../components/ui/Pagination';
import { ProductGrid } from '../components/ProductCard';
import { categoryMeta } from '../categoryIcons';

const PAGE_SIZE = 12;

function PriceFilter({ min, max, onApply }) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  useEffect(() => {
    setLo(min);
    setHi(max);
  }, [min, max]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(lo, hi);
      }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <Input type="number" min="0" placeholder="Từ" value={lo} onChange={(e) => setLo(e.target.value)} />
        <span className="text-slate-400">–</span>
        <Input type="number" min="0" placeholder="Đến" value={hi} onChange={(e) => setHi(e.target.value)} />
      </div>
      <Button type="submit" variant="secondary" size="sm" className="w-full">
        Áp dụng
      </Button>
    </form>
  );
}

export default function CatalogPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const minPrice = params.get('min') || '';
  const maxPrice = params.get('max') || '';
  const page = Number(params.get('page')) || 1;

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const { data: categories } = useAsync(() => catalogApi.categories(), [], { initial: [] });
  const { data, loading, error, reload } = useAsync(
    () =>
      catalogApi.products({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        category_id: category || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        // Logged-in users get AI-personalised ordering from product-service.
        user_id: user?.id,
      }),
    [page, search, category, minPrice, maxPrice, user?.id]
  );

  useEffect(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [page]);

  const activeCategory = categories.find((c) => String(c.id) === category);
  const hasFilters = search || category || minPrice || maxPrice;
  const chip = (active) =>
    cx(
      'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors',
      active ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
    );

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {search ? `Kết quả cho “${search}”` : activeCategory ? categoryMeta(activeCategory.name).label : 'Tất cả sản phẩm'}
        </h1>
        {data && <p className="mt-1 text-sm text-slate-500">{data.count} sản phẩm</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="space-y-6">
          {/* Mobile: horizontal scrolling category chips */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none lg:hidden">
            {[{ id: '', name: 'Tất cả' }, ...categories].map((c) => (
              <button
                key={c.id || 'all'}
                onClick={() => update({ category: String(c.id) })}
                className={cx(
                  'shrink-0 rounded-full px-4 py-1.5 text-sm ring-1 ring-inset',
                  String(c.id) === category ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200'
                )}
              >
                {c.id ? categoryMeta(c.name).label : c.name}
              </button>
            ))}
          </div>

          <div className="hidden lg:block">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Danh mục</h3>
            <button className={chip(!category)} onClick={() => update({ category: '' })}>
              Tất cả
            </button>
            {categories.map((c) => {
              const { icon: Icon, label } = categoryMeta(c.name);
              return (
                <button key={c.id} className={chip(String(c.id) === category)} onClick={() => update({ category: String(c.id) })}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Khoảng giá (₫)</h3>
            <div className="px-1">
              <PriceFilter min={minPrice} max={maxPrice} onApply={(lo, hi) => update({ min: lo, max: hi })} />
            </div>
          </div>
        </aside>

        <div>
          {hasFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {search && (
                <FilterChip onClear={() => update({ search: '' })}>
                  <FiSearch /> {search}
                </FilterChip>
              )}
              {activeCategory && (
                <FilterChip onClear={() => update({ category: '' })}>{categoryMeta(activeCategory.name).label}</FilterChip>
              )}
              {(minPrice || maxPrice) && (
                <FilterChip onClear={() => update({ min: '', max: '' })}>
                  {minPrice || 0}₫ – {maxPrice || '∞'}₫
                </FilterChip>
              )}
              <button onClick={() => setParams({})} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Xoá bộ lọc
              </button>
            </div>
          )}

          {error ? (
            <ErrorState message={errorMessage(error)} onRetry={reload} />
          ) : !loading && !data?.results?.length ? (
            <EmptyState
              icon={FiSearch}
              title="Không tìm thấy sản phẩm"
              description="Thử từ khoá khác hoặc bỏ bớt bộ lọc."
              action={hasFilters && <Button onClick={() => setParams({})}>Xoá bộ lọc</Button>}
            />
          ) : (
            <>
              <ProductGrid products={loading ? [] : data.results} loading={loading} skeletons={PAGE_SIZE} />
              {data && (
                <Pagination
                  className="mt-8"
                  page={page}
                  pageSize={PAGE_SIZE}
                  count={data.count}
                  onChange={(p) => update({ page: String(p) })}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ children, onClear }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-3 pr-1.5 text-sm text-slate-700 ring-1 ring-slate-200">
      {children}
      <button onClick={onClear} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Bỏ lọc">
        <FiX className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
