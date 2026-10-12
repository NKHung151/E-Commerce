import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCpu, FiRefreshCw, FiShield, FiTruck } from 'react-icons/fi';
import { aiApi, catalogApi } from '../../api/shop';
import { useAuth } from '../../lib/auth';
import { useAsync } from '../../lib/useAsync';
import { Button, Skeleton } from '../../components/ui';
import { ProductSection } from '../components/ProductCard';
import { categoryMeta } from '../categoryIcons';

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 px-6 py-14 text-white sm:px-12 sm:py-20">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-32 right-24 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="relative max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
          <FiCpu /> Gợi ý sản phẩm bằng AI
        </span>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Mua sắm thông minh,
          <br />
          giao hàng tận nơi.
        </h1>
        <p className="mt-4 text-base text-brand-100 sm:text-lg">
          Hàng nghìn sản phẩm chính hãng, trợ lý AI tư vấn 24/7 và gợi ý được cá nhân hoá theo sở thích của bạn.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button as={Link} to="/products" size="lg" className="bg-white text-brand-700 hover:bg-brand-50">
            Khám phá ngay <FiArrowRight />
          </Button>
        </div>
      </div>
    </section>
  );
}

const PERKS = [
  { icon: FiTruck, title: 'Giao hàng nhanh', text: 'Theo dõi đơn hàng theo thời gian thực' },
  { icon: FiShield, title: 'Thanh toán an toàn', text: 'Thẻ, chuyển khoản hoặc COD' },
  { icon: FiRefreshCw, title: 'Hoàn tiền tự động', text: 'Đơn huỷ được hoàn kho và hoàn tiền' },
];

function Perks() {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {PERKS.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Categories() {
  const { data: categories, loading } = useAsync(() => catalogApi.categories(), [], { initial: [] });
  if (!loading && !categories.length) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-5 text-xl font-bold tracking-tight text-slate-900">Danh mục</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20" />)
          : categories.map((c) => {
              const { icon: Icon, label, className } = categoryMeta(c.name);
              return (
                <Link
                  key={c.id}
                  to={`/products?category=${c.id}`}
                  className="group flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${className}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{label}</span>
                </Link>
              );
            })}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const popular = useAsync(() => catalogApi.products({ page_size: 8 }).then((d) => d.results), [], { initial: [] });
  const forYou = useAsync(() => aiApi.recommend(user.id, 8), [user?.id], { initial: [], enabled: !!user });

  const viewAll = (
    <Link to="/products" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
      Xem tất cả <FiArrowRight />
    </Link>
  );

  return (
    <div className="container-page py-6">
      <Hero />
      <Perks />
      <Categories />
      {user && (
        <ProductSection
          title="Dành riêng cho bạn"
          subtitle="Gợi ý từ AI dựa trên lịch sử xem và mua hàng của bạn"
          products={forYou.data}
          loading={forYou.loading}
        />
      )}
      <ProductSection title="Được quan tâm nhiều" products={popular.data} loading={popular.loading} action={viewAll} />
    </div>
  );
}
