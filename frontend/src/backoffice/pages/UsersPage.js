import React, { useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiSearch, FiTrash2, FiUsers } from 'react-icons/fi';
import { userApi } from '../../api/backoffice';
import { useAuth } from '../../lib/auth';
import { ROLES } from '../../lib/constants';
import { formatDate } from '../../lib/format';
import { errorMessage } from '../../lib/http';
import { useAsync } from '../../lib/useAsync';
import { Alert, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Skeleton, StatusBadge } from '../../components/ui';
import { Modal, useConfirm, useToast } from '../../components/ui/feedback';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 15;
const EMPTY = { username: '', email: '', role: 'customer', password: '' };

function UserForm({ user, onSaved, onClose }) {
  const isNew = !user.id;
  const [form, setForm] = useState(isNew ? EMPTY : { username: user.username, email: user.email, role: user.role, password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { username, email, role } = form;
      const saved = isNew ? await userApi.create(form) : await userApi.update(user.id, { username, email, role });
      onSaved(saved, isNew);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={isNew ? 'Thêm người dùng' : `Sửa ${user.username}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="user-form" loading={saving}>
            Lưu
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Tên đăng nhập" required>
          <Input value={form.username} onChange={set('username')} required autoFocus />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="Vai trò">
          <Select value={form.role} onChange={set('role')}>
            {Object.entries(ROLES).map(([key, r]) => (
              <option key={key} value={key}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        {isNew && (
          <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự" required>
            <Input type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete="new-password" />
          </Field>
        )}
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const { data: users, loading, error, reload, setData } = useAsync(() => userApi.list(), [], { initial: [] });

  // user-service returns the full list; filter and paginate client-side.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => (!role || u.role === role) && (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
      .sort((a, b) => b.id - a.id);
  }, [users, search, role]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const counts = useMemo(() => users.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {}), [users]);

  const onSaved = (saved, isNew) => {
    setEditing(null);
    toast(isNew ? 'Đã tạo người dùng' : 'Đã lưu thay đổi');
    if (isNew) reload();
    else setData((list) => list.map((u) => (u.id === saved.id ? saved : u)));
  };

  const remove = async (u) => {
    const ok = await confirm({ title: `Xoá người dùng “${u.username}”?`, message: 'Thao tác này không thể hoàn tác.', danger: true, confirmText: 'Xoá' });
    if (!ok) return;
    try {
      await userApi.remove(u.id);
      setData((list) => list.filter((x) => x.id !== u.id));
      toast('Đã xoá người dùng');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Người dùng"
        subtitle={
          loading
            ? undefined
            : `${users.length} tài khoản · ${counts.admin || 0} quản trị · ${counts.staff || 0} nhân viên · ${counts.customer || 0} khách hàng`
        }
        actions={
          <Button onClick={() => setEditing({})}>
            <FiPlus /> Thêm người dùng
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Tìm theo tên đăng nhập hoặc email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="sm:w-48"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả vai trò</option>
            {Object.entries(ROLES).map(([key, r]) => (
              <option key={key} value={key}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={reload} />
        ) : loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !visible.length ? (
          <EmptyState icon={FiUsers} title="Không có người dùng" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Ngày tạo</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                          {u.username.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">
                            {u.username} {u.id === me.id && <span className="text-xs text-slate-400">(bạn)</span>}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge map={ROLES} value={u.role} />
                    </td>
                    <td className="text-slate-500">{formatDate(u.created_at)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(u)} aria-label="Sửa">
                          <FiEdit2 className="h-4 w-4" />
                        </Button>
                        {u.id !== me.id && (
                          <Button variant="danger-ghost" size="icon" onClick={() => remove(u)} aria-label="Xoá">
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
        <div className="border-t border-slate-100 p-4">
          <Pagination page={page} pageSize={PAGE_SIZE} count={filtered.length} onChange={setPage} />
        </div>
      </Card>

      {editing && <UserForm user={editing} onSaved={onSaved} onClose={() => setEditing(null)} />}
    </>
  );
}
