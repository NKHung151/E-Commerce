import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { cx } from './cx';

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

/** "← Label" link shown above a page title. */
export function BackLink({ to, children }) {
  return (
    <Link to={to} className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
      <FiArrowLeft /> {children}
    </Link>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && <BackLink to={back.to}>{back.label}</BackLink>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const AVATAR_SIZES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-2xl',
};

const AVATAR_TONES = {
  soft: 'bg-brand-100 text-brand-700',
  solid: 'bg-brand-500 text-white',
};

/** Round initial-letter avatar. `tone="solid"` for dark backgrounds. */
export function Avatar({ name = '', size = 'md', tone = 'soft', className }) {
  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        AVATAR_TONES[tone],
        AVATAR_SIZES[size],
        className
      )}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
