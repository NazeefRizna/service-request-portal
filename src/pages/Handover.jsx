import { Card, CardHeader, PageHeader } from '../components/ui'

const TOOLS = [
  { tool: 'Claude (claude.ai chat)', usage: 'Architecture and schema design, SQL (schema, RLS, RPC functions, seed data), React components, GitHub Actions workflow, security headers and documentation.' },
  { tool: 'Supabase SQL editor assistant', usage: 'Displayed automated warnings (destructive operations, missing RLS) that were reviewed before running scripts.' },
]

const ISSUES = [
  {
    title: 'Seed script failed: relation "a" does not exist',
    problem: 'The AI-generated seed script failed in the Supabase SQL editor. Choosing the editor’s “enable RLS” option rewrote the script and referenced a table alias as if it were a table.',
    fix: 'Replaced the derived-table join with a scalar subquery, typed the NULL column (null::text) for UNION inference, and ran the script without the editor’s automatic RLS statements, because RLS is already enforced in 02_security.sql. Verified 36 requests and 118 history rows.',
  },
  {
    title: 'Incorrect claim about RLS in the SQL editor',
    problem: 'The AI stated that the dashboard function would return empty results in the SQL editor because of RLS. The editor runs as the postgres role, which bypasses RLS, so the claim was wrong and could give false confidence when testing security.',
    fix: 'RLS was instead verified through the application with real user sessions: an employee sees only their own 19 requests, while managers and admins see all.',
  },
  {
    title: 'Windows commands incompatible with PowerShell',
    problem: 'Setup commands were generated in cmd.exe syntax (e.g. dir /b, del, rmdir /s /q). They failed in PowerShell, and a misnamed file (RequestAction.jsx vs RequestActions.jsx) went unnoticed, breaking the build with an unresolved import.',
    fix: 'Switched to PowerShell equivalents (Get-ChildItem -Name, Rename-Item), renamed the file to match the import exactly (important on Vercel’s case-sensitive Linux build), and added .gitattributes to normalise line endings.',
  },
  {
    title: 'Supabase URL misconfiguration',
    problem: 'The Supabase REST endpoint (…/rest/v1/) was used instead of the base project URL, which would cause every API call to fail with confusing 404 errors.',
    fix: 'The startup configuration check in supabase.js rejected the value with a clear message; the URL was corrected to https://<ref>.supabase.co. The check also blocks secret/service-role keys from ever being used in the browser.',
  },
]

const GUIDE = [
  { role: 'Employee', steps: ['Sign in with your organisation account.', 'Open New Request, complete all required fields and submit. Note the SR reference.', 'Track progress on Requests; open a request to see its full status history.', 'Use Dashboard for a summary of your own requests and Dataset to export them.'] },
  { role: 'Manager', steps: ['Open Approvals to see pending requests, highest priority first.', 'Approve (optional comment) or Reject (comment required).', 'Your own requests must be decided by another manager.', 'Monitor demand and SLA risk on the Dashboard.'] },
  { role: 'Administrator', steps: ['Open an Approved request and click Mark as completed once fulfilled.', 'Use the Dashboard filters to monitor open and overdue requests.', 'Export the dataset as CSV or JSON from Dataset & Export.', 'Check pipeline health on Security & CI/CD.'] },
]

function CodeBlock({ children }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
      <code>{children}</code>
    </pre>
  )
}

export default function Handover() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI review log & handover" description="AI usage, issues found in AI-generated work, user guide and operating instructions." />

      <Card className="overflow-hidden">
        <CardHeader title="AI tools used" />
        <table className="min-w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {TOOLS.map((t) => (
              <tr key={t.tool} className="align-top">
                <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">{t.tool}</td>
                <td className="px-5 py-3 text-slate-600">{t.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader title="Issues identified in AI-generated work" description={`${ISSUES.length} issues found and fixed during development`} />
        <div className="divide-y divide-slate-100">
          {ISSUES.map((i, index) => (
            <div key={i.title} className="px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">
                {index + 1}. {i.title}
              </p>
              <p className="mt-1.5 text-sm text-slate-600">
                <span className="font-medium text-rose-700">Problem: </span>
                {i.problem}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-medium text-emerald-700">Fix: </span>
                {i.fix}
              </p>
            </div>
          ))}
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Review practice: every AI-generated file was run and tested by role before commit; database scripts were reviewed
          against Supabase warnings; security claims were verified through the running application.
        </p>
      </Card>

      <Card>
        <CardHeader title="User guide" />
        <div className="grid gap-6 px-5 py-4 md:grid-cols-3">
          {GUIDE.map((g) => (
            <div key={g.role}>
              <h3 className="text-sm font-semibold text-slate-900">{g.role}</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
                {g.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Run locally" />
          <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
            <p>Prerequisites: Node.js 20+, a Supabase project.</p>
            <CodeBlock>{`git clone https://github.com/<owner>/service-request-portal.git
cd service-request-portal
npm ci
copy .env.example .env.local   # then fill in values
npm run dev`}</CodeBlock>
            <p>
              Database: run <code>supabase/01_schema.sql</code>, <code>02_security.sql</code>, create the four demo users in
              Supabase Auth, then run <code>03_seed.sql</code>.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Modify & redeploy" />
          <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>UI pages live in <code>src/pages</code>; shared components in <code>src/components</code>.</li>
              <li>Database changes: add a new numbered SQL file in <code>supabase/</code> and run it in Supabase.</li>
              <li>Business rules (roles, lifecycle) are enforced in <code>02_security.sql</code> — change them there, not only in the UI.</li>
            </ul>
            <CodeBlock>{`git checkout -b feature/my-change
npm run lint && npm run build
git commit -am "feat: my change"
git push   # open a PR; checks run automatically
# merge to main -> pipeline scans, then deploys to Vercel`}</CodeBlock>
            <p>Rollback: in Vercel → Deployments, promote the previous deployment, or revert the commit on main.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}