import React from 'react';
import { FiLoader } from 'react-icons/fi';
import { cx } from './cx';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  'danger-ghost': 'text-rose-600 hover:bg-rose-50',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
};

/** `as` lets the button render a router <Link> with the same styling. */
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
        VARIANTS[variant],
        SIZES[size],
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
