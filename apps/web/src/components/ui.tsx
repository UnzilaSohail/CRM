import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneClass: Record<Tone, string> = {
  success: 'bg-success-50 text-success',
  warning: 'bg-warning-50 text-amber-700',
  danger: 'bg-danger-50 text-danger',
  info: 'bg-brand-50 text-brand',
  neutral: 'bg-slate-100 text-slate-600',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}

export const statusTone = (s: string): Tone =>
  (
    ({
      'On Track': 'success',
      'At Risk': 'warning',
      Delayed: 'danger',
      Active: 'success',
      Prospect: 'info',
      Archived: 'neutral',
      High: 'danger',
      Medium: 'warning',
      Low: 'neutral',
      Done: 'success',
      'In progress': 'info',
      'Not started': 'neutral',
      critical: 'danger',
      watch: 'warning',
      none: 'success',
    }) as Record<string, Tone>
  )[s] ?? 'neutral';

export function Progress({
  value,
  tone = 'info',
  label,
}: {
  value: number;
  tone?: Tone;
  label?: string;
}) {
  const bar = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-brand',
    neutral: 'bg-slate-400',
  }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={Math.round(v)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={clsx('h-full rounded-full', bar)} style={{ width: `${v}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-slate-500">{Math.round(v)}%</span>
    </div>
  );
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'info',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <span className={clsx('rounded-lg p-2.5', toneClass[tone])} aria-hidden>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-navy">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-navy md:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('card p-4', className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold text-navy">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand"
      title={name}
    >
      {initials}
    </span>
  );
}
