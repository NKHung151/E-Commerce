import React from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../../config';
import { cx } from './cx';

/**
 * Brand mark + name. `tone="light"` is for dark backgrounds (back office sidebar,
 * auth screens); `subtitle` adds a small second line.
 */
export function Logo({ to, tone = 'dark', subtitle, className }) {
  const content = (
    <>
      <span
        className={cx(
          'flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold',
          tone === 'light' ? 'bg-white/20 text-white' : 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
        )}
      >
        P
      </span>
      <span className={cx('text-lg font-bold tracking-tight', tone === 'light' ? 'text-white' : 'text-slate-900')}>
        {APP_NAME}
        {subtitle && <span className="block text-xs font-medium text-slate-400">{subtitle}</span>}
      </span>
    </>
  );
  const classes = cx('flex items-center gap-2', subtitle && 'leading-tight', className);
  return to ? (
    <Link to={to} className={classes}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
