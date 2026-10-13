import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Button } from './Button';

/**
 * Catches render / effect errors so a bug shows a message instead of a blank page.
 * `resetKey` (e.g. the pathname) clears the error when it changes, so navigating
 * away from a broken page works without reloading.
 */
export class ErrorBoundary extends React.Component {
  state = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <FiAlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="font-semibold text-slate-900">Đã có lỗi khi hiển thị trang này</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Vui lòng tải lại trang. Nếu lỗi vẫn tiếp diễn, hãy thử lại sau.</p>
        <Button className="mt-5" onClick={() => window.location.reload()}>
          Tải lại trang
        </Button>
      </div>
    );
  }
}
