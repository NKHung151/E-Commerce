import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { cx } from './index';

/** Compact page list: 1 … 4 5 [6] 7 8 … 20 */
function pages(current, total) {
  const set = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…' + p);
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, pageSize, count, onChange, className }) {
  const total = Math.max(1, Math.ceil((count || 0) / pageSize));
  if (total <= 1) return null;
  const btn = 'flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors';

  return (
    <nav className={cx('flex items-center justify-between gap-4', className)} aria-label="Phân trang">
      <p className="hidden text-sm text-slate-500 sm:block">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} trên {count}
      </p>
      <div className="flex items-center gap-1">
        <button
          className={cx(btn, 'text-slate-600 hover:bg-slate-100 disabled:opacity-40')}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Trang trước"
        >
          <FiChevronLeft />
        </button>
        {pages(page, total).map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cx(btn, p === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
        <button
          className={cx(btn, 'text-slate-600 hover:bg-slate-100 disabled:opacity-40')}
          disabled={page >= total}
          onClick={() => onChange(page + 1)}
          aria-label="Trang sau"
        >
          <FiChevronRight />
        </button>
      </div>
    </nav>
  );
}
