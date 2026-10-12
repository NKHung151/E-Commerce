import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi';
import { Button, cx } from './index';

/* ---------------------------------- Toasts --------------------------------- */
const ToastContext = createContext(null);
const TOAST_STYLE = {
  success: { icon: FiCheckCircle, className: 'text-emerald-600' },
  error: { icon: FiXCircle, className: 'text-rose-600' },
  info: { icon: FiInfo, className: 'text-brand-600' },
};

/* -------------------------------- Confirm modal ---------------------------- */
const ConfirmContext = createContext(null);

/** Provides useToast() and useConfirm() to the whole app. */
export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, type = 'success') => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setDialog(options);
      }),
    []
  );

  const close = (result) => {
    resolver.current?.(result);
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
          {toasts.map((t) => {
            const { icon: Icon, className } = TOAST_STYLE[t.type] || TOAST_STYLE.info;
            return (
              <div
                key={t.id}
                className="pointer-events-auto flex w-full max-w-sm animate-slide-down items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200"
              >
                <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', className)} />
                <p className="flex-1 text-sm text-slate-700">{t.message}</p>
                <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Đóng">
                  <FiX />
                </button>
              </div>
            );
          })}
        </div>

        {dialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => close(false)}>
            <div
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-md animate-pop rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-4">
                <div
                  className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    dialog.danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'
                  )}
                >
                  <FiAlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{dialog.title}</h3>
                  {dialog.message && <p className="mt-1 text-sm text-slate-500">{dialog.message}</p>}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => close(false)}>
                  Huỷ
                </Button>
                <Button variant={dialog.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                  {dialog.confirmText || 'Xác nhận'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
export const useConfirm = () => useContext(ConfirmContext);

/* ----------------------------------- Modal --------------------------------- */
export function Modal({ open, title, onClose, children, footer, size = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cx('flex max-h-[90vh] w-full animate-pop flex-col rounded-2xl bg-white shadow-xl', size)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Đóng">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
