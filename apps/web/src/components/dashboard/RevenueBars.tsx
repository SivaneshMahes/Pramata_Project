import { useState } from 'react';
import type { MonthlyRevenuePoint } from '@vrp/shared-types';
import { cn } from '@/utils/cn';
import { formatCurrency, formatMonth } from '@/utils/format';

const CHART_HEIGHT = 140;

/**
 * Six-month earnings as columns from one baseline. Single series, so no
 * legend: the card title names it. Columns are capped at 24px with a 4px
 * rounded data-end; each whole slot is the hover/focus target. The current
 * month is the accent; earlier months are a lighter step of the same hue.
 */
export function RevenueBars({ data }: { data: MonthlyRevenuePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((point) => point.revenue), 1);
  const lastIndex = data.length - 1;
  const shown = active ?? lastIndex;
  const focus = data[shown];

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">{focus ? formatMonth(focus.month) : ''}</span>
        <span className="text-lg font-semibold">{focus ? formatCurrency(focus.revenue) : '—'}</span>
      </figcaption>

      <div
        className="relative"
        style={{ height: CHART_HEIGHT }}
        aria-hidden
        onPointerLeave={() => setActive(null)}
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-line" />
        <div className="absolute inset-0 flex items-end">
          {data.map((point, index) => {
            const height =
              point.revenue > 0 ? Math.max(4, (point.revenue / max) * (CHART_HEIGHT - 8)) : 0;
            return (
              <div
                key={point.month}
                className="flex h-full flex-1 items-end justify-center"
                onPointerEnter={() => setActive(index)}
              >
                <div
                  className={cn(
                    'w-full max-w-6 rounded-t transition-[height,background-color] duration-300 ease-[var(--ease-out-quart)] motion-reduce:transition-none',
                    index === shown ? 'bg-primary' : 'bg-blue-200',
                  )}
                  style={{ height }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex" aria-hidden>
        {data.map((point, index) => (
          <span
            key={point.month}
            className={cn(
              'flex-1 text-center text-xs',
              index === shown ? 'font-medium text-ink' : 'text-muted',
            )}
          >
            {formatMonth(point.month)}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Earnings by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Earnings</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.month}>
              <th scope="row">{point.month}</th>
              <td>{formatCurrency(point.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
