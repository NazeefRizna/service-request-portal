import { ExternalLink, GitBranch } from 'lucide-react'
import { Card, CardHeader, PageHeader } from '../components/ui'
import PipelineStatus from '../components/PipelineStatus'
import { GITHUB_REPO, GITHUB_URL } from '../lib/constants'

const PIPELINE = [
  { stage: 'Build & lint', tool: 'npm ci, ESLint, Vite build', gate: 'Fails on lint errors or build failure' },
  { stage: 'Dependency scanning', tool: 'npm audit --audit-level=critical', gate: 'Fails on any critical vulnerability' },
  { stage: 'Secret detection', tool: 'Gitleaks (full git history)', gate: 'Fails on any detected secret' },
  { stage: 'SAST', tool: 'Semgrep (JavaScript, React, secrets rulesets)', gate: 'Fails on ERROR-severity findings' },
  { stage: 'Deploy', tool: 'Vercel CLI (production)', gate: 'Runs only on push to main after all gates pass' },
]

const CONTROLS = [
  { area: 'Authorisation', items: ['Row Level Security on every table', 'Employees can read only their own requests', 'Role checks inside every write function', 'Managers cannot decide their own requests'] },
  { area: 'Data access', items: ['No direct INSERT/UPDATE/DELETE grants to clients', 'All writes via SECURITY DEFINER RPCs with fixed search_path', 'Lifecycle transitions enforced by trigger', 'Status history written only by trigger'] },
  { area: 'Secrets', items: ['Only the publishable key ships to the browser', 'App refuses to start with a secret/service-role key', 'Env files git-ignored; Gitleaks in CI', 'Deploy token stored as a GitHub Actions secret'] },
  { area: 'Input & output', items: ['Client and database validation with the same limits', 'Control characters stripped from text input', 'React output escaping (no dangerouslySetInnerHTML)', 'CSV formula-injection protection on export'] },
  { area: 'Web hardening', items: ['Content-Security-Policy restricting script/connect sources', 'HSTS, X-Frame-Options DENY, nosniff', 'Strict Referrer-Policy and Permissions-Policy', 'Open-redirect protection on login'] },
  { area: 'Errors & sessions', items: ['Internal errors mapped to safe messages', 'Raw errors logged only in development', 'Public sign-up disabled; accounts provisioned', 'Automatic session refresh and sign-out'] },
]

const HEADERS = [
  ['Content-Security-Policy', "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.github.com; frame-ancestors 'none'; …"],
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'],
]

export default function Security() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & CI/CD"
        description="Source control, automated security gates, deployment and the security controls built into the application."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Source repository" />
          <div className="px-5 py-4">
            {GITHUB_URL ? (
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <GitBranch className="h-5 w-5 text-slate-500" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{GITHUB_REPO}</p>
                  <p className="truncate text-xs text-slate-500">{GITHUB_URL}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </a>
            ) : (
              <p className="text-sm text-slate-500">VITE_GITHUB_REPO is not configured.</p>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Last pipeline execution" description="Latest GitHub Actions run on the main branch (public GitHub API)" />
          <div className="px-5 py-4">
            <PipelineStatus />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Pipeline stages" description=".github/workflows/ci-cd.yml" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Tool</th>
                <th className="px-5 py-3">Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PIPELINE.map((p) => (
                <tr key={p.stage}>
                  <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">{p.stage}</td>
                  <td className="px-5 py-3 text-slate-600">{p.tool}</td>
                  <td className="px-5 py-3 text-slate-600">{p.gate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CONTROLS.map((c) => (
          <Card key={c.area} className="p-5">
            <h3 className="text-sm font-semibold text-slate-900">{c.area}</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
              {c.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {i}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="HTTP security headers" description="Applied to every response by vercel.json" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {HEADERS.map(([name, value]) => (
                <tr key={name} className="align-top">
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-medium text-slate-900">{name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}