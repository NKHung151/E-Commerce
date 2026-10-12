import React, { useEffect, useState } from 'react';
import { FiCheck, FiChevronRight, FiPackage, FiShoppingBag, FiZap } from 'react-icons/fi';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthProvider';
import { useAsync } from '../../shared/hooks';
import { Badge, Button, EmptyState, PageLoader, Price, ProductImage, QuantityStepper, Stars, useToast } from '../../shared/ui';
import { DETAIL_LABELS } from '../../shared/utils/constants';
import { aiApi, catalogApi } from '../api';
import { categoryMeta } from '../categoryMeta';
import { ProductSection } from '../components/ProductGrid';
import Reviews from '../components/Reviews';
import { useCart } from '../context/CartContext';

export default function ProductPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  // countView: product-service bumps the view counter and logs a "view" behaviour for the AI.
  const { data: product, loading, error } = useAsync(() => catalogApi.product(id, { countView: true }), [id]);
  const similar = useAsync(() => aiApi.similar(id, 8), [id], { initial: [] });
  const together = useAsync(() => aiApi.boughtTogether(id, 4), [id], { initial: [] });

  useEffect(() => {
    setQty(1);
    window.scrollTo({ top: 0 });
  }, [id]);

  if (loading) return <PageLoader />;
  if (error || !product) {
    return (
      <EmptyState
        icon={FiPackage}
        title="Không tìm thấy sản phẩm"
        description="Sản phẩm có thể đã bị xoá hoặc không tồn tại."
        action={<Button as={Link} to="/products">Xem sản phẩm khác</Button>}
      />
    );
  }

  const inStock = product.stock > 0 && product.is_available !== false;
  const { label: categoryLabel } = categoryMeta(product.category_name);
  const specs = Object.entries(product.details || {}).filter(([, v]) => v !== '' && v != null);

  const addToCart = async (goToCart = false) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setAdding(true);
    try {
      await add(product.id, qty);
      if (goToCart) navigate('/cart');
      else toast(`Đã thêm ${qty} × “${product.name}” vào giỏ`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="container-page py-6">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-slate-900">
          Trang chủ
        </Link>
        <FiChevronRight className="h-3.5 w-3.5" />
        {product.category ? (
          <Link to={`/products?category=${product.category}`} className="hover:text-slate-900">
            {categoryLabel}
          </Link>
        ) : (
          <Link to="/products" className="hover:text-slate-900">
            Sản phẩm
          </Link>
        )}
        <FiChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70">
          <ProductImage src={product.image_url} name={product.name} id={product.id} />
        </div>

        <div className="flex flex-col">
          {product.category_name && <Badge tone="brand" className="self-start">{categoryLabel}</Badge>}
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Stars value={product.rating} />
              <span className="font-medium text-slate-700">{Number(product.rating).toFixed(1)}</span>
            </span>
            <span>{product.views} lượt xem</span>
            {product.sku && <span>SKU: {product.sku}</span>}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <Price value={product.price} discount={product.discount} size="lg" />
            {Number(product.discount) > 0 && (
              <p className="mt-1 text-sm font-medium text-rose-600">Tiết kiệm {Math.round(product.discount)}%</p>
            )}
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm">
            {inStock ? (
              <>
                <FiCheck className="text-emerald-600" />
                <span className="text-slate-700">
                  Còn hàng · <span className="font-medium">{product.stock}</span> sản phẩm
                </span>
              </>
            ) : (
              <span className="font-medium text-rose-600">Tạm hết hàng</span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantityStepper value={qty} max={Math.max(1, product.stock)} onChange={setQty} />
            <Button size="lg" variant="secondary" onClick={() => addToCart(false)} loading={adding} disabled={!inStock}>
              <FiShoppingBag /> Thêm vào giỏ
            </Button>
            <Button size="lg" onClick={() => addToCart(true)} disabled={!inStock || adding}>
              <FiZap /> Mua ngay
            </Button>
          </div>

          {product.description && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-slate-900">Mô tả</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{product.description}</p>
            </div>
          )}

          {specs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-slate-900">Thông số</h2>
              <dl className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200/70">
                {specs.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4 bg-white px-4 py-2.5 text-sm">
                    <dt className="text-slate-500">{DETAIL_LABELS[key] || key}</dt>
                    <dd className="col-span-2 font-medium text-slate-800">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <ProductSection
        title="Thường được mua cùng"
        subtitle="Khách hàng mua sản phẩm này cũng mua"
        products={together.data}
        loading={together.loading}
      />
      <ProductSection title="Sản phẩm tương tự" products={similar.data.filter((p) => p.id !== product.id)} loading={similar.loading} />

      <div className="mt-12">
        <Reviews productId={product.id} />
      </div>
    </div>
  );
}
