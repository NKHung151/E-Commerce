import React, { useEffect, useState } from 'react';
import { FiEdit2, FiPackage, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthProvider';
import { pageOf, useAsync, useDebounced, useQueryParams } from '../../shared/hooks';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  SkeletonList,
  Stars,
  useConfirm,
  useToast,
} from '../../shared/ui';
import { formatPrice } from '../../shared/utils/format';
import { categoryApi, productApi } from '../api';
import ProductCell from '../components/ProductCell';

const PAGE_SIZE = 15;
const LOW_STOCK = 5;

function StockBadge({ stock }) {
  if (stock <= 0) return <Badge tone="red">Hết hàng</Badge>;
  if (stock <= LOW_STOCK) return <Badge tone="amber">{stock}</Badge>;
  return stock;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  // ?q=&category=&page=
  const [query, setQuery] = useQueryParams();
  const { category, q = '' } = query;
  const page = pageOf(query);
  const [text, setText] = useState(q);
  const debounced = useDebounced(text);

  useEffect(() => {
    if (debounced !== q) setQuery({ q: debounced.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data: categories } = useAsync(() => categoryApi.list(), [], { initial: [] });
  const { data, loading, error, reload } = useAsync(
    () => productApi.list({ page, page_size: PAGE_SIZE, search: q || undefined, category_id: category }),
    [page, q, category]
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

  const addButton = (
    <Button as={Link} to="/products/new">
      <FiPlus /> Thêm sản phẩm
    </Button>
  );

  return (
    <>
      <PageHeader title="Sản phẩm" subtitle={data ? `${data.count} sản phẩm` : undefined} actions={addButton} />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <SearchInput className="flex-1" placeholder="Tìm theo tên hoặc mô tả…" value={text} onChange={(e) => setText(e.target.value)} />
          <Select className="sm:w-56" value={category || ''} onChange={(e) => setQuery({ category: e.target.value })}>
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
          <SkeletonList rows={8} rowClassName="h-14" />
        ) : !data.results.length ? (
          <EmptyState
            icon={FiPackage}
            title="Không có sản phẩm"
            description={q || category ? 'Không có sản phẩm khớp bộ lọc.' : 'Hãy thêm sản phẩm đầu tiên.'}
            action={addButton}
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
                      <ProductCell product={p} meta={`#${p.id}${p.sku ? ` · ${p.sku}` : ''}`} />
                    </td>
                    <td>{p.category_name || <span className="text-slate-400">—</span>}</td>
                    <td className="text-right font-medium text-slate-900">
                      {formatPrice(p.price)}
                      {Number(p.discount) > 0 && <span className="ml-1.5 text-xs text-rose-500">-{Math.round(p.discount)}%</span>}
                    </td>
                    <td className="text-right">
                      <StockBadge stock={p.stock} />
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
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={(p) => setQuery({ page: p })} />
          </div>
        )}
      </Card>
    </>
  );
}
