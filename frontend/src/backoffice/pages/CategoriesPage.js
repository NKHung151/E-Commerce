import React, { useState } from 'react';
import { FiEdit2, FiLayers, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthProvider';
import { useAsync } from '../../shared/hooks';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Skeleton, useConfirm, useToast } from '../../shared/ui';
import { PRODUCT_TYPES } from '../../shared/utils/constants';
import { formatDate } from '../../shared/utils/format';
import { categoryApi, productApi } from '../api';

export default function CategoriesPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null); // null | {} (new) | category
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: categories, loading, error, reload } = useAsync(async () => {
    const list = await categoryApi.list();
    const counts = await Promise.all(list.map((c) => productApi.list({ category_id: c.id, page_size: 1 }).then((d) => d.count, () => null)));
    return list.map((c, i) => ({ ...c, productCount: counts[i] }));
  }, []);

  const open = (category) => {
    setEditing(category);
    setName(category.name || '');
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing.id) await categoryApi.update(editing.id, name.trim());
      else await categoryApi.create(name.trim());
      toast(editing.id ? 'Đã đổi tên danh mục' : 'Đã thêm danh mục');
      setEditing(null);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    const ok = await confirm({
      title: `Xoá danh mục “${c.name}”?`,
      message: c.productCount ? `${c.productCount} sản phẩm đang thuộc danh mục này sẽ không còn danh mục.` : undefined,
      danger: true,
      confirmText: 'Xoá',
    });
    if (!ok) return;
    try {
      await categoryApi.remove(c.id);
      toast('Đã xoá danh mục');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Danh mục"
        subtitle={isAdmin ? 'Quản lý danh mục sản phẩm' : 'Chỉ quản trị viên được chỉnh sửa danh mục'}
        actions={
          isAdmin && (
            <Button onClick={() => open({})}>
              <FiPlus /> Thêm danh mục
            </Button>
          )
        }
      />

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !categories.length ? (
        <Card>
          <EmptyState icon={FiLayers} title="Chưa có danh mục" />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{c.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    #{c.id} · tạo {formatDate(c.created_at)}
                  </p>
                </div>
                {PRODUCT_TYPES[c.name] ? <Badge tone="brand">Có thông số riêng</Badge> : <Badge>Chung</Badge>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Link to={`/products?category=${c.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  {c.productCount ?? '—'} sản phẩm
                </Link>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => open(c)} aria-label="Đổi tên">
                      <FiEdit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="danger-ghost" size="icon" onClick={() => remove(c)} aria-label="Xoá">
                      <FiTrash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        title={editing?.id ? 'Đổi tên danh mục' : 'Thêm danh mục'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Huỷ
            </Button>
            <Button type="submit" form="category-form" loading={saving} disabled={!name.trim()}>
              Lưu
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={save}>
          <Field label="Tên danh mục" hint="Tên trùng với danh mục có thông số riêng (Books, Electronics, …) sẽ bật form thông số tương ứng">
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus maxLength={100} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
