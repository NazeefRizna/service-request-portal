import { useEffect, useState } from 'react'
import { CircleCheck, CircleX, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react'
import { GITHUB_REPO } from '../lib/constants'
import { formatDateTime } from '../lib/format'
import { Alert, Button, Spinner } from './ui'

function describe(run) {
  if (run.status !== 'completed') {
    return { label: 'Running', Icon: LoaderCircle, style: 'bg-amber-50 text-amber-700 ring-amber-200', spin: true }
  }
  if (run.conclusion === 'success') {
    return { label: 'Passed', Icon: CircleCheck, style: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
  }
  return { label: run.conclusion === 'cancelled' ? 'Cancelled' : 'Failed', Icon: CircleX, style: 'bg-rose-50 text-rose-700 ring-rose-200' }
}

export default function PipelineStatus() {
  const [run, setRun] = useState(null)
  const [state, setState] = useState(GITHUB_REPO ? 'loading' : 'unconfigured')
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!GITHUB_REPO) return undefined
    let active = true
    const controller = new AbortController()
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs?branch=main&per_page=1`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 403) throw new Error('GitHub API rate limit reached. Try again later.')
        if (!res.ok) throw new Error(`GitHub API returned HTTP ${res.status}.`)
        return res.json()
      })
      .then((data) => {
        if (!active) return
        const latest = Array.isArray(data.workflow_runs) ? data.workflow_runs[0] ?? null : null
        setRun(latest)
        setError(null)
        setState(latest ? 'ready' : 'empty')
      })
      .catch((err) => {
        if (!active || err.name === 'AbortError') return
        setError(err.message || 'Unable to reach the GitHub API.')
        setState('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [reloadKey])

  function reload() {
    setState('loading')
    setReloadKey((k) => k + 1)
  }

  if (state === 'unconfigured') {
    return <Alert type="warning">Set VITE_GITHUB_REPO (owner/repo) to display pipeline results.</Alert>
  }
  if (state === 'loading') return <Spinner label="Fetching latest pipeline run…" />

  return (
    <div className="space-y-3">
      {state === 'error' && <Alert type="error">{error}</Alert>}
      {state === 'empty' && <Alert type="info">No pipeline runs on the main branch yet.</Alert>}
      {state === 'ready' &&
        run &&
        (() => {
          const { label, Icon, style, spin } = describe(run)
          const safeUrl = typeof run.html_url === 'string' && run.html_url.startsWith('https://github.com/') ? run.html_url : null
          return (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}>
                  <Icon className={`h-3.5 w-3.5 ${spin ? 'animate-spin' : ''}`} aria-hidden="true" />
                  {label}
                </span>
                <span className="text-xs text-slate-500">Run #{run.run_number}</span>
              </div>
              <p className="mt-3 truncate text-sm font-medium text-slate-900">{run.display_title}</p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>
                  <dt className="font-medium text-slate-600">Workflow</dt>
                  <dd>{run.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-600">Commit</dt>
                  <dd className="font-mono">{String(run.head_sha || '').slice(0, 7)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-600">Trigger</dt>
                  <dd>{run.event}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-600">Updated</dt>
                  <dd>{formatDateTime(run.updated_at)}</dd>
                </div>
              </dl>
              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                >
                  View run on GitHub <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          )
        })()}
      <Button variant="ghost" size="sm" onClick={reload}>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Refresh status
      </Button>
    </div>
  )
}