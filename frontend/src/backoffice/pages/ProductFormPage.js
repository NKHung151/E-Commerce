import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { categoryApi, productApi } from '../../api/backoffice';
import { PRODUCT_TYPES } from '../../lib/constants';
import { errorMessage } from '../../lib/http';
import { useAsync } from '../../lib/useAsync';
import { Alert, Button, Card, CardHeader, ErrorState, Field, Input, PageHeader, PageLoader, Select, Textarea, cx } from '../../components/ui';
import { useToast } from '../../components/ui/feedback';
import { ProductImage } from '../../components/ui/product';

const EMPTY = {
  name: '',
  sku: '',
  description: '',
  price: '',
  discount: '0',
  stock: '0',
  image_url: '',
  category: '',
  is_available: true,
};

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm text-slate-700"
    >
      <span className={cx('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </span>
      {label}
    </button>
  );
}

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [details, setDetails] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loader = useAsync(
    () => Promise.all([categoryApi.list(), isEdit ? productApi.get(id) : Promise.resolve(null)]),
    [id]
  );
  const [categories, product] = loader.data || [[], null];

  useEffect(() => {
    if (product) {
      setForm({
        ...EMPTY,
        ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, product[k] ?? EMPTY[k]])),
        category: product.category ? String(product.category) : '',
      });
      setDetails(product.details || {});
    } else if (!isEdit && categories.length && !form.category) {
      setForm((f) => ({ ...f, category: String(categories[0].id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, categories]);

  const categoryName = useMemo(() => categories.find((c) => String(c.id) === form.category)?.name, [categories, form.category]);
  const type = PRODUCT_TYPES[categoryName];
  // The detail row belongs to one model; switching category after creation would orphan it.
  const categoryLocked = isEdit && Object.keys(product?.details || {}).length > 0;

  if (loader.loading) return <PageLoader />;
  if (loader.error) return <ErrorState message={errorMessage(loader.error)} onRetry={loader.reload} />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setDetail = (key) => (e) => setDetails((d) => ({ ...d, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const base = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description,
      price: Number(form.price),
      discount: Number(form.discount) || 0,
      stock: parseInt(form.stock, 10) || 0,
      image_url: form.image_url.trim(),
      is_available: form.is_available,
      category: form.category ? Number(form.category) : null,
    };
    const typedDetails = Object.fromEntries(
      (type?.fields || []).map((f) => [f.name, f.type === 'number' ? Number(details[f.name]) || 0 : details[f.name] ?? ''])
    );
    try {
      if (isEdit) {
        await productApi.update(id, { ...base, details: typedDetails });
        toast('Đã lưu thay đổi');
      } else if (type) {
        await productApi.createTyped(type.endpoint, { product: base, ...typedDetails });
        toast('Đã thêm sản phẩm');
      } else {
        await productApi.create(base);
        toast('Đã thêm sản phẩm');
      }
      navigate('/products');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <PageHeader
        back={
          <Link to="/products" className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <FiArrowLeft /> Sản phẩm
          </Link>
        }
        title={isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        subtitle={isEdit ? `#${id} · ${product?.name}` : 'Điền thông tin chung và thông số theo danh mục'}
        actions={
          <>
            <Button as={Link} to="/products" variant="secondary">
              Huỷ
            </Button>
            <Button type="submit" loading={saving}>
              <FiSave /> Lưu
            </Button>
          </>
        }
      />

      {error && <Alert className="mb-6">{error}</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Thông tin chung" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Tên sản phẩm" required className="sm:col-span-2">
                <Input value={form.name} onChange={set('name')} required maxLength={255} />
              </Field>
              <Field label="Danh mục" hint={categoryLocked ? 'Không đổi được danh mục khi đã có thông số chi tiết' : undefined}>
                <Select value={form.category} onChange={set('category')} disabled={categoryLocked}>
                  <option value="">— Không có —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Mã SKU">
                <Input value={form.sku} onChange={set('sku')} maxLength={50} />
              </Field>
              <Field label="Mô tả" className="sm:col-span-2">
                <Textarea rows={5} value={form.description} onChange={set('description')} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Giá & tồn kho" />
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <Field label="Giá bán (₫)" required>
                <Input type="number" min="0" step="1000" value={form.price} onChange={set('price')} required />
              </Field>
              <Field label="Giảm giá (%)" hint="Chỉ để hiển thị giá gốc">
                <Input type="number" min="0" max="100" step="0.01" value={form.discount} onChange={set('discount')} />
              </Field>
              <Field label="Tồn kho" required>
                <Input type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required />
              </Field>
              <div className="sm:col-span-3">
                <Toggle
                  checked={form.is_available}
                  onChange={(v) => setForm((f) => ({ ...f, is_available: v }))}
                  label="Đang mở bán"
                />
              </div>
            </div>
          </Card>

          {type && (
            <Card>
              <CardHeader title={`Thông số — ${categoryName}`} />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {type.fields.map((f) => (
                  <Field key={f.name} label={f.label} required>
                    <Input type={f.type || 'text'} min={f.type === 'number' ? 0 : undefined} value={details[f.name] ?? ''} onChange={setDetail(f.name)} required />
                  </Field>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader title="Hình ảnh" />
          <div className="space-y-4 p-5">
            <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
              <ProductImage src={form.image_url} name={form.name || '?'} id={id || 0} />
            </div>
            <Field label="URL ảnh">
              <Input type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://…" />
            </Field>
          </div>
        </Card>
      </div>
    </form>
  );
}
