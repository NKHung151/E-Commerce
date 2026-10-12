import React from 'react';
import { FiAlertCircle, FiInbox, FiLoader } from 'react-icons/fi';

const cx = (...classes) => classes.filter(Boolean).join(' ');
export { cx };

/* ---------------------------------- Button --------------------------------- */
const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  'danger-ghost': 'text-rose-600 hover:bg-rose-50',
};
const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
};

export const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, as: As = 'button', ...props },
  ref
) {
  return (
    <As
      ref={ref}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      disabled={As === 'button' ? disabled || loading : undefined}
      {...props}
    >
      {loading && <FiLoader className="h-4 w-4 animate-spin" />}
      {children}
    </As>
  );
});

/* ---------------------------------- Inputs --------------------------------- */
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

/* ---------------------------------- Layout --------------------------------- */
export function Card({ className, children, ...props }) {
  return (
    <div className={cx('rounded-2xl bg-white shadow-card ring-1 ring-slate-100', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cx('flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4', className)}>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* --------------------------------- Feedback -------------------------------- */
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

/** Badge for a value of one of the STATUS maps in lib/constants. */
export function StatusBadge({ map, value }) {
  const s = map[value] || { label: value || '—', tone: 'gray' };
  return (
    <Badge tone={s.tone}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </Badge>
  );
}

export function Spinner({ className }) {
  return <FiLoader className={cx('animate-spin text-brand-600', className || 'h-6 w-6')} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-xl bg-slate-200/70', className)} />;
}

export function EmptyState({ icon: Icon = FiInbox, title, description, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      icon={FiAlertCircle}
      title="Không tải được dữ liệu"
      description={message}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Thử lại
          </Button>
        )
      }
    />
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
