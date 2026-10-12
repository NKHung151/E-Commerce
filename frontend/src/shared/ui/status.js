import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { cx } from './cx';

const TONES = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

export function Badge({ tone = 'gray', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone] || TONES.gray,
        className
      )}
    >
      {children}
    </span>
  );
}

/** Badge for a value of one of the STATUS maps in shared/utils/constants. */
export function StatusBadge({ map, value }) {
  const s = map[value] || { label: value || '—', tone: 'gray' };
  return (
    <Badge tone={s.tone}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </Badge>
  );
}

export function Alert({ tone = 'red', children, className }) {
  return (
    <div className={cx('flex items-start gap-2 rounded-xl px-4 py-3 text-sm ring-1 ring-inset', TONES[tone], className)}>
      <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
