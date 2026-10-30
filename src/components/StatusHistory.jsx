import { STATUS_COLORS, ROLE_LABELS } from '../lib/constants'
import { formatDateTime } from '../lib/format'
import { StatusBadge } from './ui'

export default function StatusHistory({ history }) {
  if (!history || history.length === 0) {
    return <p className="px-5 py-4 text-sm text-slate-500">No status changes recorded.</p>
  }

  return (
    <ol className="relative px-5 py-4">
      {history.map((entry, index) => {
        const isLast = index === history.length - 1
        return (
          <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <span className="absolute left-[7px] top-5 h-full w-px bg-slate-200" aria-hidden="true" />}
            <span
              className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white"
              style={{ backgroundColor: STATUS_COLORS[entry.to_status] || '#94a3b8' }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {entry.from_status && (
                  <>
                    <StatusBadge status={entry.from_status} />
                    <span className="text-xs text-slate-400">→</span>
                  </>
                )}
                <StatusBadge status={entry.to_status} />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {formatDateTime(entry.changed_at)} · {entry.actor?.full_name || 'System'}
                {entry.actor?.role ? ` (${ROLE_LABELS[entry.actor.role] || entry.actor.role})` : ''}
              </p>
              {entry.comment && (
                <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{entry.comment}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}