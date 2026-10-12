import React, { useState } from 'react';
import { FiBarChart2, FiPackage, FiTruck } from 'react-icons/fi';
import { Navigate, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthProvider';
import { Alert, AuthAside, AuthShell, Button, Field, Input } from '../../shared/ui';

const ASIDE = (
  <AuthAside
    heading="Quản lý cửa hàng tại một nơi."
    points={[
      { icon: FiBarChart2, text: 'Theo dõi đơn hàng, thanh toán và vận chuyển' },
      { icon: FiPackage, text: 'Quản lý sản phẩm, tồn kho và danh mục' },
      { icon: FiTruck, text: 'Xác nhận thanh toán, cập nhật vận đơn' },
    ]}
  />
);

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.forbidden ? err.message : err.response?.status === 401 ? 'Sai tên đăng nhập hoặc mật khẩu.' : errorMessage(err)
      );
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Đăng nhập Back office"
      subtitle="Dành cho nhân viên và quản trị viên"
      aside={ASIDE}
      tone="from-slate-900 via-slate-800 to-brand-900"
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Tên đăng nhập">
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus autoComplete="username" />
        </Field>
        <Field label="Mật khẩu">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            autoComplete="current-password"
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Đăng nhập
        </Button>
      </form>
    </AuthShell>
  );
}
