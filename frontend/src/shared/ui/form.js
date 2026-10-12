import React from 'react';
import { FiSearch } from 'react-icons/fi';
import { cx } from './cx';

const FIELD = cx(
  'block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900',
  'ring-1 ring-inset ring-slate-200 placeholder:text-slate-400',
  'focus:ring-2 focus:ring-inset focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500'
);

export const Input = React.forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx(FIELD, className)} {...props} />;
});

export const Textarea = React.forwardRef(function Textarea({ className, rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cx(FIELD, 'resize-y', className)} {...props} />;
});

export const Select = React.forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx(FIELD, 'pr-9', className)} {...props}>
      {children}
    </select>
  );
});

/** Input with a leading search icon. `variant="filled"` is the grey header style. */
export function SearchInput({ className, variant = 'outline', ...props }) {
  return (
    <div className={cx('relative', className)}>
      <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="search"
        className={cx('pl-10', variant === 'filled' && 'bg-slate-100 ring-0 focus:bg-white')}
        {...props}
      />
    </div>
  );
}

export function Field({ label, hint, error, children, className, required }) {
  return (
    <label className={cx('block space-y-1.5', className)}>
      {label && (
        <span className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="block text-xs text-rose-600">{error}</span>
      ) : (
        hint && <span className="block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm text-slate-700"
    >
      <span className={cx('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-slate-300')}>
        <span
          className={cx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </span>
      {label}
    </button>
  );
}
