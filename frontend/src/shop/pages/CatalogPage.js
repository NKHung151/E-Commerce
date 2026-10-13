import React, { useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import { errorMessage } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthProvider';
import { pageOf, useAsync, useQueryParams } from '../../shared/hooks';
import { Button, EmptyState, ErrorState, Pagination } from '../../shared/ui';
import { catalogApi } from '../api';
import { categoryMeta } from '../categoryMeta';
import { CategoryFilter, FilterChip, PriceFilter } from '../components/CatalogFilters';
import { ProductGrid } from '../components/ProductGrid';

const PAGE_SIZE = 12;

export default function CatalogPage() {
  const { user } = useAuth();
  // Filters live in the URL: ?search=&category=&min=&max=&page=
  const [query, setQuery] = useQueryParams();
  const { search, category, min, max } = query;
  const page = pageOf(query);

  const { data: categories } = useAsync(() => catalogApi.categories(), [], { initial: [] });
  const { data, loading, error, reload } = useAsync(
    () =>
      catalogApi.products({
        page,
        page_size: PAGE_SIZE,
        search,
        category_id: category,
        min_price: min,
        max_price: max,
        // Logged-in users get AI-personalised ordering (product-service reads the user from the JWT).
        personalized: user ? 1 : undefined,
      }),
    [page, search, category, min, max, user?.id]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const activeCategory = categories.find((c) => String(c.id) === category);
  const hasFilters = Boolean(search || category || min || max);
  const clearAll = () => setQuery({}, { replace: true });
  const title = search
    ? `Kết quả cho “${search}”`
    : activeCategory
      ? categoryMeta(activeCategory.name).label
      : 'Tất cả sản phẩm';

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {data && <p className="mt-1 text-sm text-slate-500">{data.count} sản phẩm</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="space-y-6">
          <CategoryFilter categories={categories} value={category} onChange={(id) => setQuery({ category: id })} />
          <div className="hidden lg:block">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Khoảng giá (₫)</h3>
            <div className="px-1">
              <PriceFilter min={min} max={max} onApply={(lo, hi) => setQuery({ min: lo, max: hi })} />
            </div>
          </div>
        </aside>

        <div>
          {hasFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {search && (
                <FilterChip onClear={() => setQuery({ search: '' })}>
                  <FiSearch /> {search}
                </FilterChip>
              )}
              {activeCategory && (
                <FilterChip onClear={() => setQuery({ category: '' })}>{categoryMeta(activeCategory.name).label}</FilterChip>
              )}
              {(min || max) && (
                <FilterChip onClear={() => setQuery({ min: '', max: '' })}>
                  {min || 0}₫ – {max || '∞'}₫
                </FilterChip>
              )}
              <button onClick={clearAll} className="text-sm font-medium text-brand-600 hover:text-brand-700">
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
              action={hasFilters && <Button onClick={clearAll}>Xoá bộ lọc</Button>}
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
                  onChange={(p) => setQuery({ page: p })}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
