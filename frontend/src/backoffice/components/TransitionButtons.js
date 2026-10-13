import React from 'react';
import { Button } from '../../shared/ui';

/**
 * One button per allowed next state of a backend state machine
 * (ORDER_TRANSITIONS); "cancelled" is rendered as a danger action.
 */
export default function TransitionButtons({ statusMap, transitions, current, busy, onSelect }) {
  const next = transitions[current] || [];
  if (!next.length) return <p className="text-sm text-slate-400">Không còn bước tiếp theo.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {next.map((s) =>
        s === 'cancelled' ? (
          <Button key={s} size="sm" variant="danger-ghost" className="ring-1 ring-inset ring-rose-200" disabled={busy} onClick={() => onSelect(s)}>
            Huỷ
          </Button>
        ) : (
          <Button key={s} size="sm" variant="secondary" disabled={busy} onClick={() => onSelect(s)}>
            → {statusMap[s].label}
          </Button>
        )
      )}
    </div>
  );
}
