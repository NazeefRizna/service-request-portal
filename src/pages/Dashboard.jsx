import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CircleCheck, Clock, FolderOpen, RotateCcw, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchLookups } from '../lib/api'
import { friendlyError } from '../lib/errors'
import { STATUSES, STATUS_COLORS } from '../lib/constants'
import { Alert, Button, Card, CardHeader, PageHeader, Spinner, inputClass } from '../components/ui'

const DASHBOARD_SQL = `-- public.get_dashboard_metrics(p_from, p_to, p_department_id, p_status)
-- SECURITY INVOKER: Row Level Security still applies, so employees only see their own requests.
with filtered as (
  select r.*, d.name as department_name
    from public.service_requests r
    join public.departments d on d.id = r.department_id
   where (p_from is null or r.submitted_at >= p_from::timestamptz)
     and (p_to   is null or r.submitted_at <  (p_to + 1)::timestamptz)
     and (p_department_id is null or r.department_id = p_department_id)
     and (p_status is null or r.status = p_status)
)
select jsonb_build_object(
  -- KPI 1: Open requests
  'open_requests', (select count(*) from filtered
                     where status in ('Submitted','Pending Approval','Approved')),

  -- KPI 2: Average days from submission to approval decision
  'avg_days_to_approval', (select round((avg(extract(epoch from (decided_at - submitted_at)) / 86400.0))::numeric, 1)
                             from filtered where status in ('Approved','Completed')),

  -- KPI 3: Approval rate = approved / all decided
  'approval_rate', (select case when count(*) filter (where status in ('Approved','Completed','Rejected')) = 0 then null
                           else round(100.0 * count(*) filter (where status in ('Approved','Completed'))
                                / count(*) filter (where status in ('Approved','Completed','Rejected')), 1) end
                      from filtered),

  -- KPI 4: Overdue = still open and past SLA due date
  'overdue_requests', (select count(*) from filtered
                        where status in ('Submitted','Pending Approval','Approved')
                          and due_date < current_date),

  -- Chart 1: Requests by department
  'by_department', (select jsonb_agg(jsonb_build_object('department', department_name, 'count', c) order by c desc)
                      from (select department_name, count(*) c from filtered group by department_name) x),

  -- Chart 2: Requests over time (weekly)
  'over_time', (select jsonb_agg(jsonb_build_object('week', to_char(wk, 'YYYY-MM-DD'), 'count', c) order by wk)
                  from (select date_trunc('week', submitted_at) wk, count(*) c from filtered group by 1) x),

  -- Chart 3: Status breakdown
  'status_breakdown', (select jsonb_agg(jsonb_build_object('status', status, 'count', c) order by c desc)
                         from (select status, count(*) c from filtered group by status) x)
);`

const weekFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

// Fills empty weeks with zero so the trend line is continuous.
function fillWeeks(series) {
  if (!Array.isArray(series) || series.length === 0) return []
  const counts = new Map(series.map((p) => [p.week, p.count]))
  const start = new Date(`${series[0].week}T00:00:00Z`)
  const end = new Date(`${series[series.length - 1].week}T00:00:00Z`)
  const out = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 7)) {
    const key = d.toISOString().slice(0, 10)
    out.push({ week: key, label: weekFormatter.format(d), count: counts.get(key) ?? 0 })
  }
  return out
}

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  sky: 'bg-sky-50 text-sky-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
}

function KpiCard({ label, value, suffix, hint, icon: Icon, tone }) {
  const hasValue = value !== null && value !== undefined
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {hasValue ? value : '—'}
            {hasValue && suffix && <span className="ml-1 text-base font-medium text-slate-500">{suffix}</span>}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <span className={`rounded-lg p-2.5 ${TONES[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  )
}

function ChartCard({ title, description, children, empty }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="h-72 px-2 py-4">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No data for the selected filters</div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
  fontSize: 12,
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [departments, setDepartments] = useState([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [live, setLive] = useState(false)
  const [tick, setTick] = useState(0)

  const rangeError = from && to && from > to ? 'The start date must be on or before the end date.' : null

  useEffect(() => {
    let active = true
    fetchLookups()
      .then((data) => {
        if (active) setDepartments(data.departments)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Live updates: realtime subscription (RLS-aware) plus a 30s polling fallback.
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-service-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, () => {
        setTick((t) => t + 1)
      })
      .subscribe((state) => setLive(state === 'SUBSCRIBED'))

    const interval = setInterval(() => setTick((t) => t + 1), 30000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (rangeError) return undefined
    let active = true
    supabase
      .rpc('get_dashboard_metrics', {
        p_from: from || null,
        p_to: to || null,
        p_department_id: department ? Number(department) : null,
        p_status: status || null,
      })
      .then(({ data, error: rpcError }) => {
        if (!active) return
        if (rpcError) {
          setError(friendlyError(rpcError, 'Unable to load dashboard metrics.'))
        } else {
          setMetrics(data)
          setError(null)
          setUpdatedAt(new Date())
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [from, to, department, status, tick, rangeError])

  const overTime = useMemo(() => fillWeeks(metrics?.over_time), [metrics])
  const byDepartment = metrics?.by_department ?? []
  const statusData = (metrics?.status_breakdown ?? []).map((s) => ({ name: s.status, value: s.count }))

  function resetFilters() {
    setFrom('')
    setTo('')
    setDepartment('')
    setStatus('')
  }

  const scopeNote =
    profile.role === 'employee'
      ? 'Figures cover your own requests only (enforced by Row Level Security).'
      : 'Organisation-wide figures across all departments.'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={scopeNote}
        actions={
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`} />
              {live ? 'Live' : 'Polling'}
            </span>
            {updatedAt && <span>Updated {timeFormatter.format(updatedAt)}</span>}
          </div>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-slate-600">From</label>
            <input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-slate-600">To</label>
            <input id="f-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="f-dept" className="mb-1 block text-xs font-medium text-slate-600">Department</label>
            <select id="f-dept" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-status" className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={resetFilters} className="w-full">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset filters
            </Button>
          </div>
        </div>
      </Card>

      {rangeError && <Alert type="warning">{rangeError}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Spinner label="Loading dashboard…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Open requests"
              value={metrics?.open_requests}
              hint={`of ${metrics?.total_requests ?? 0} in selection`}
              icon={FolderOpen}
              tone="indigo"
            />
            <KpiCard
              label="Avg days to approval"
              value={metrics?.avg_days_to_approval}
              suffix="days"
              hint="Submission → approval decision"
              icon={Clock}
              tone="sky"
            />
            <KpiCard
              label="Approval rate"
              value={metrics?.approval_rate}
              suffix="%"
              hint="Approved ÷ all decided"
              icon={CircleCheck}
              tone="emerald"
            />
            <KpiCard
              label="Overdue requests"
              value={metrics?.overdue_requests}
              hint="Open and past SLA due date"
              icon={TriangleAlert}
              tone="rose"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Requests by department" description="Total requests per department" empty={byDepartment.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDepartment} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="count" name="Requests" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status breakdown" description="Current lifecycle status" empty={statusData.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Requests over time" description="New requests submitted per week" empty={overTime.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overTime} margin={{ top: 8, right: 24, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Week of ${l}`} />
                <Line type="monotone" dataKey="count" name="Requests" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <Card>
            <CardHeader
              title="SQL used to calculate these metrics"
              description="Database function public.get_dashboard_metrics, called via Supabase RPC with the filters above."
            />
            <details className="group px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:underline">Show SQL</summary>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
                <code>{DASHBOARD_SQL}</code>
              </pre>
            </details>
          </Card>
        </>
      )}
    </div>
  )
}