import React, { useState } from 'react';
import { FiCpu, FiShield, FiTruck } from 'react-icons/fi';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthProvider';
import { Alert, AuthAside, AuthShell, Button, Field, Input, useToast } from '../../shared/ui';
import { authApi } from '../api';

const ASIDE = (
  <AuthAside
    heading="Mua sắm thông minh hơn với trợ lý AI."
    points={[
      { icon: FiCpu, text: 'Gợi ý sản phẩm theo sở thích của bạn' },
      { icon: FiTruck, text: 'Theo dõi đơn hàng theo thời gian thực' },
      { icon: FiShield, text: 'Thanh toán an toàn, hoàn tiền tự động' },
    ]}
  />
);

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const [form, setForm] = useState({ username: location.state?.username || '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.status === 401 ? 'Sai tên đăng nhập hoặc mật khẩu.' : errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Chào mừng trở lại" subtitle="Đăng nhập để tiếp tục mua sắm" aside={ASIDE}>
      <form onSubmit={submit} className="space-y-5">
        {location.state?.registered && <Alert tone="green">Tạo tài khoản thành công, hãy đăng nhập.</Alert>}
        {error && <Alert>{error}</Alert>}
        <Field label="Tên đăng nhập">
          <Input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            autoFocus
            autoComplete="username"
          />
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
      <p className="mt-8 text-center text-sm text-slate-500">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Đăng ký ngay
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.register({ username: form.username.trim(), email: form.email.trim(), password: form.password });
      toast('Tạo tài khoản thành công');
      navigate('/login', { state: { registered: true, username: form.username.trim() } });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Tạo tài khoản" subtitle="Chỉ mất chưa đến một phút" aside={ASIDE}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Tên đăng nhập" required>
          <Input value={form.username} onChange={set('username')} required autoFocus autoComplete="username" />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </Field>
        <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự" required>
          <Input type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete="new-password" />
        </Field>
        <Field label="Nhập lại mật khẩu" required>
          <Input type="password" value={form.confirm} onChange={set('confirm')} required minLength={6} autoComplete="new-password" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Đăng ký
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
