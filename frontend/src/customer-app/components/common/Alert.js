import React, { useState, useEffect } from 'react';

export const Alert = ({ type = 'info', title, message, onClose, duration }) => {
  const bgColor =
    type === 'success'
      ? 'bg-green-100'
      : type === 'error'
      ? 'bg-red-100'
      : type === 'warning'
      ? 'bg-yellow-100'
      : 'bg-blue-100';

  const borderColor =
    type === 'success'
      ? 'border-green-400'
      : type === 'error'
      ? 'border-red-400'
      : type === 'warning'
      ? 'border-yellow-400'
      : 'border-blue-400';

  const textColor =
    type === 'success'
      ? 'text-green-800'
      : type === 'error'
      ? 'text-red-800'
      : type === 'warning'
      ? 'text-yellow-800'
      : 'text-blue-800';

  const progressColor =
    type === 'success'
      ? 'bg-green-400'
      : type === 'error'
      ? 'bg-red-400'
      : type === 'warning'
      ? 'bg-yellow-400'
      : 'bg-blue-400';

  const [visible, setVisible] = useState(true);

  // Auto-dismiss: default 3s
  const autoDuration = duration ?? 3000;

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, autoDuration);
    return () => clearTimeout(timer);
  }, [message, autoDuration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`${bgColor} border-l-4 ${borderColor} mb-4 rounded shadow-sm overflow-hidden`}
      style={{ animation: 'slideInDown 0.3s ease' }}
    >
      <div className={`flex justify-between items-start ${textColor} p-4`}>
        <div>
          {title && <h4 className="font-bold">{title}</h4>}
          {message && <p className="text-sm">{message}</p>}
        </div>
        {onClose && (
          <button onClick={() => { setVisible(false); onClose(); }} className="ml-4 font-bold cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
            ✕
          </button>
        )}
      </div>
      {/* Progress bar */}
      <div className="h-0.5 w-full">
          <div
            className={`${progressColor} h-full opacity-50`}
            style={{
              animation: `shrinkWidth ${autoDuration}ms linear forwards`,
            }}
          />
        </div>
      <style>{`
        @keyframes slideInDown {
          from { transform: translateY(-8px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default Alert;
