import React, { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { Button, cx, Input } from '../../shared/ui';
import { categoryMeta } from '../categoryMeta';

export function PriceFilter({ min = '', max = '', onApply }) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  useEffect(() => {
    setLo(min);
    setHi(max);
  }, [min, max]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(lo, hi);
      }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <Input type="number" min="0" placeholder="Từ" value={lo} onChange={(e) => setLo(e.target.value)} />
        <span className="text-slate-400">–</span>
        <Input type="number" min="0" placeholder="Đến" value={hi} onChange={(e) => setHi(e.target.value)} />
      </div>
      <Button type="submit" variant="secondary" size="sm" className="w-full">
        Áp dụng
      </Button>
    </form>
  );
}

export function FilterChip({ children, onClear }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-3 pr-1.5 text-sm text-slate-700 ring-1 ring-slate-200">
      {children}
      <button onClick={onClear} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Bỏ lọc">
        <FiX className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

/** Vertical list on desktop, horizontally scrolling pills on mobile. */
export function CategoryFilter({ categories, value = '', onChange }) {
  const pill = (active) =>
    cx(
      'shrink-0 rounded-full px-4 py-1.5 text-sm ring-1 ring-inset',
      active ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200'
    );
  const row = (active) =>
    cx(
      'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors',
      active ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
    );
  const options = categories.map((c) => ({ id: String(c.id), ...categoryMeta(c.name) }));

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none lg:hidden">
        <button className={pill(!value)} onClick={() => onChange('')}>
          Tất cả
        </button>
        {options.map((o) => (
          <button key={o.id} className={pill(o.id === value)} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="hidden lg:block">
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Danh mục</h3>
        <button className={row(!value)} onClick={() => onChange('')}>
          Tất cả
        </button>
        {options.map(({ id, icon: Icon, label }) => (
          <button key={id} className={row(id === value)} onClick={() => onChange(id)}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
    </>
  );
}
