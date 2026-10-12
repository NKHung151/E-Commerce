import React from 'react';
import { FiAlertCircle, FiInbox, FiLoader } from 'react-icons/fi';
import { Button } from './Button';
import { cx } from './cx';

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

/** Stack of skeleton rows (table / list placeholders). */
export function SkeletonList({ rows = 6, rowClassName = 'h-12', className = 'space-y-2 p-4' }) {
  return (
    <div className={className}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  );
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
