import React, { useState } from 'react';
import { FiMessageSquare, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthProvider';
import { useAsync } from '../../shared/hooks';
import { Avatar, Button, Card, EmptyState, Skeleton, StarInput, Stars, Textarea, useConfirm, useToast } from '../../shared/ui';
import { formatDate } from '../../shared/utils/format';
import { reviewApi } from '../api';

function Summary({ reviews }) {
  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="text-center sm:w-40">
        <p className="text-5xl font-bold text-slate-900">{avg.toFixed(1)}</p>
        <Stars value={avg} className="mt-2 justify-center" />
        <p className="mt-1 text-sm text-slate-500">{total} đánh giá</p>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = reviews.filter((r) => r.rating === star).length;
          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-slate-500">{star}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-400" style={{ width: total ? `${(n / total) * 100}%` : 0 }} />
              </div>
              <span className="w-6 text-right text-slate-400">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Reviews({ productId }) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: reviews, loading, reload } = useAsync(() => reviewApi.list(productId), [productId], { initial: [] });
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await reviewApi.create({ product_id: Number(productId), rating, comment_text: text.trim() });
      setText('');
      setRating(5);
      toast('Cảm ơn bạn đã đánh giá!');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  const remove = async (review) => {
    if (!(await confirm({ title: 'Xoá đánh giá?', message: 'Thao tác này không thể hoàn tác.', danger: true, confirmText: 'Xoá' }))) return;
    try {
      await reviewApi.remove(review.id);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Card className="p-6">
      <h2 className="mb-6 text-lg font-semibold text-slate-900">Đánh giá sản phẩm</h2>
      {loading ? (
        <Skeleton className="h-28" />
      ) : (
        reviews.length > 0 && <Summary reviews={reviews} />
      )}

      {user ? (
        <form onSubmit={submit} className="mt-8 rounded-2xl bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Đánh giá của bạn</p>
          <StarInput value={rating} onChange={setRating} />
          <Textarea
            className="mt-3"
            rows={3}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" loading={sending} disabled={!text.trim()}>
              Gửi đánh giá
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-8 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Đăng nhập
          </Link>{' '}
          để viết đánh giá.
        </p>
      )}

      <div className="mt-6 divide-y divide-slate-100">
        {!loading && reviews.length === 0 && (
          <EmptyState icon={FiMessageSquare} title="Chưa có đánh giá" description="Hãy là người đầu tiên đánh giá sản phẩm này." />
        )}
        {reviews.map((r) => (
          <div key={r.id} className="flex gap-4 py-5">
            <Avatar name={r.username} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-slate-900">{r.username}</span>
                <Stars value={r.rating} size="h-3.5 w-3.5" />
                <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-sm text-slate-600">{r.comment_text}</p>
            </div>
            {user && (user.id === r.user_id || user.role === 'admin') && (
              <button
                onClick={() => remove(r)}
                className="self-start rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Xoá đánh giá"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
