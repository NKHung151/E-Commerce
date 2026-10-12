import React, { useState } from 'react';
import { FiMinus, FiPlus, FiStar } from 'react-icons/fi';
import { formatPrice, originalPrice } from '../utils/format';
import { cx } from './cx';

// Deterministic soft gradient per product so missing images still look intentional.
const GRADIENTS = [
  'from-indigo-100 to-sky-100',
  'from-rose-100 to-orange-100',
  'from-emerald-100 to-teal-100',
  'from-amber-100 to-yellow-100',
  'from-violet-100 to-fuchsia-100',
  'from-cyan-100 to-blue-100',
];

export function ProductImage({ src, name = '', id = 0, className }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cx('h-full w-full object-cover', className)}
      />
    );
  }
  return (
    <div
      className={cx(
        'flex h-full w-full items-center justify-center bg-gradient-to-br',
        GRADIENTS[Number(id) % GRADIENTS.length],
        className
      )}
      aria-label={name}
    >
      <span className="text-4xl font-bold text-slate-500/40">{name.trim().charAt(0).toUpperCase() || '?'}</span>
    </div>
  );
}

export function Price({ value, discount, size = 'md', className }) {
  const original = originalPrice(value, discount);
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-3xl' };
  return (
    <div className={cx('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cx('font-bold text-slate-900', sizes[size])}>{formatPrice(value)}</span>
      {original && (
        <span className={cx('text-slate-400 line-through', size === 'lg' ? 'text-lg' : 'text-xs')}>{formatPrice(original)}</span>
      )}
    </div>
  );
}

export function Stars({ value = 0, size = 'h-4 w-4', className }) {
  const rating = Number(value) || 0;
  return (
    <div className={cx('flex items-center gap-0.5', className)} aria-label={`${rating.toFixed(1)} / 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <FiStar
          key={i}
          className={cx(size, i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')}
        />
      ))}
    </div>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          type="button"
          key={i}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          aria-label={`${i} sao`}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <FiStar className={cx('h-6 w-6', i <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
        </button>
      ))}
    </div>
  );
}

/** − [n] + quantity control. `size="sm"` is the compact cart variant. */
export function QuantityStepper({ value, min = 1, max = Infinity, onChange, disabled, size = 'md', editable = true }) {
  const box = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const btn = cx(box, 'flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40');
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl ring-1 ring-slate-200">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Giảm">
        <FiMinus className="h-3.5 w-3.5" />
      </button>
      {editable ? (
        <input
          type="number"
          className={cx(size === 'sm' ? 'h-9 w-10' : 'h-11 w-14', 'border-0 p-0 text-center text-sm font-semibold focus:ring-0')}
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        />
      ) : (
        <span className="w-10 text-center text-sm font-semibold">{value}</span>
      )}
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Tăng">
        <FiPlus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
