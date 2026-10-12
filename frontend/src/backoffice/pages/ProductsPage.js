import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiEdit2, FiPackage, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { categoryApi, productApi } from '../../api/backoffice';
import { useAuth } from '../../lib/auth';
import { formatPrice } from '../../lib/format';
import { errorMessage } from '../../lib/http';
import { useAsync, useDebounced } from '../../lib/useAsync';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton } from '../../components/ui';
import { useConfirm, useToast } from '../../components/ui/feedback';
import Pagination from '../../components/ui/Pagination';
import { ProductImage, Stars } from '../../components/ui/product';

const PAGE_SIZE = 15;
const LOW_STOCK = 5;

export default function ProductsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const query = useDebounced(search);
  const category = params.get('category') || '';
  const page = Number(params.get('page')) || 1;

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const { data: categories } = useAsync(() => categoryApi.list(), [], { initial: [] });
  const { data, loading, error, reload } = useAsync(
    () => productApi.list({ page, page_size: PAGE_SIZE, search: query || undefined, category_id: category || undefined }),
    [page, query, category]
  );

  const remove = async (product) => {
    const ok = await confirm({
      title: `Xoá “${product.name}”?`,
      message: 'Sản phẩm và thông số chi tiết sẽ bị xoá vĩnh viễn.',
      danger: true,
      confirmText: 'Xoá sản phẩm',
    });
    if (!ok) return;
    try {
      await productApi.remove(product.id);
      toast('Đã xoá sản phẩm');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Sản phẩm"
        subtitle={data ? `${data.count} sản phẩm` : undefined}
        actions={
          <Button as={Link} to="/products/new">
            <FiPlus /> Thêm sản phẩm
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Tìm theo tên hoặc mô tả…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (page !== 1) setParam('page', '');
              }}
            />
          </div>
          <Select className="sm:w-56" value={category} onChange={(e) => setParam('category', e.target.value)}>
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={reload} />
        ) : loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !data.results.length ? (
          <EmptyState
            icon={FiPackage}
            title="Không có sản phẩm"
            description={query || category ? 'Không có sản phẩm khớp bộ lọc.' : 'Hãy thêm sản phẩm đầu tiên.'}
            action={
              <Button as={Link} to="/products/new">
                <FiPlus /> Thêm sản phẩm
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th className="text-right">Giá bán</th>
                  <th className="text-right">Tồn kho</th>
                  <th>Đánh giá</th>
                  <th className="text-right">Lượt xem</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          <ProductImage src={p.image_url} name={p.name} id={p.id} className="text-base" />
                        </span>
                        <div className="max-w-xs">
                          <Link to={`/products/${p.id}/edit`} className="block truncate font-medium text-slate-900 hover:text-brand-700">
                            {p.name}
                          </Link>
                          <span className="text-xs text-slate-400">#{p.id}{p.sku && ` · ${p.sku}`}</span>
                        </div>
                      </div>
                    </td>
                    <td>{p.category_name || <span className="text-slate-400">—</span>}</td>
                    <td className="text-right font-medium text-slate-900">
                      {formatPrice(p.price)}
                      {Number(p.discount) > 0 && <span className="ml-1.5 text-xs text-rose-500">-{Math.round(p.discount)}%</span>}
                    </td>
                    <td className="text-right">
                      {p.stock <= 0 ? (
                        <Badge tone="red">Hết hàng</Badge>
                      ) : p.stock <= LOW_STOCK ? (
                        <Badge tone="amber">{p.stock}</Badge>
                      ) : (
                        p.stock
                      )}
                    </td>
                    <td>
                      <Stars value={p.rating} size="h-3.5 w-3.5" />
                    </td>
                    <td className="text-right text-slate-500">{p.views}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button as={Link} to={`/products/${p.id}/edit`} variant="ghost" size="icon" aria-label="Sửa">
                          <FiEdit2 className="h-4 w-4" />
                        </Button>
                        {user.role === 'admin' && (
                          <Button variant="danger-ghost" size="icon" onClick={() => remove(p)} aria-label="Xoá">
                            <FiTrash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="border-t border-slate-100 p-4">
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={(p) => setParam('page', String(p))} />
          </div>
        )}
      </Card>
    </>
  );
}
