import React from 'react';
import { FiCheck, FiXCircle } from 'react-icons/fi';
import { cx } from '../../shared/ui';
import { ORDER_FLOW, ORDER_STATUS } from '../../shared/utils/constants';

/** pending → processing → shipped → delivered stepper (or a cancelled notice). */
export default function OrderTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
        <FiXCircle className="h-5 w-5 shrink-0" />
        Đơn hàng đã bị huỷ. Nếu bạn đã thanh toán, tiền sẽ được hoàn lại và tồn kho được trả về.
      </div>
    );
  }
  const current = ORDER_FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2">
      {ORDER_FLOW.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="flex flex-col items-center text-center">
            <div className="relative flex w-full items-center justify-center">
              {i > 0 && (
                <span className={cx('absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2', i <= current ? 'bg-brand-500' : 'bg-slate-200')} />
              )}
              <span
                className={cx(
                  'relative z-10 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white',
                  done ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'
                )}
              >
                {done ? <FiCheck className="h-4 w-4" /> : i + 1}
              </span>
            </div>
            <span className={cx('mt-2 text-xs font-medium', done ? 'text-slate-900' : 'text-slate-400')}>{ORDER_STATUS[step].label}</span>
          </li>
        );
      })}
    </ol>
  );
}
