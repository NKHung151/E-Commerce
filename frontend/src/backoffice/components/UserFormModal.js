import React, { useState } from 'react';
import { errorMessage } from '../../shared/api/client';
import { Alert, Button, Field, Input, Modal, Select } from '../../shared/ui';
import { ROLES } from '../../shared/utils/constants';
import { userApi } from '../api';

const EMPTY = { username: '', email: '', role: 'customer', password: '' };

/** Create (no `user.id`) or edit a user. Calls onSaved(savedUser, isNew). */
export default function UserFormModal({ user, onSaved, onClose }) {
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
