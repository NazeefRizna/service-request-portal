import { Card, CardHeader, PageHeader } from '../components/ui'

const ROLES = [
  {
    role: 'Employee',
    can: 'Submit service requests; view own requests, their current status and full status history; view a dashboard scoped to own requests; export own data.',
    cannot: 'View other employees’ requests; approve, reject or complete any request.',
  },
  {
    role: 'Manager',
    can: 'View all requests; approve or reject requests in Pending Approval with a comment; view the organisation-wide dashboard; submit own requests.',
    cannot: 'Approve or reject their own requests (separation of duties); mark requests as completed.',
  },
  {
    role: 'Administrator',
    can: 'View all requests; mark approved requests as Completed after fulfilment; monitor the organisation-wide dashboard; export the full dataset.',
    cannot: 'Approve or reject requests (approval authority stays with managers).',
  },
]

const STORIES = [
  {
    id: 'US-01',
    story: 'As an employee, I want to submit a service request with a type, department and priority so that my need is formally recorded and routed for approval.',
    criteria: [
      'Title (5–120 chars), description (10–2000 chars), department, request type and priority are mandatory.',
      'Invalid input shows inline field errors and nothing is saved.',
      'On success a unique reference (SR-xxxx) is shown and the request status is Pending Approval.',
      'An SLA due date is calculated from priority (Critical 2, High 5, Medium 10, Low 15 days).',
    ],
  },
  {
    id: 'US-02',
    story: 'As an employee, I want to see my requests and their status history so that I always know where a request stands.',
    criteria: [
      'Employees only ever see their own requests (enforced by Row Level Security).',
      'Each request shows a timeline of every status change with who, when and any comment.',
    ],
  },
  {
    id: 'US-03',
    story: 'As a manager, I want an approval queue so that I can approve or reject pending requests quickly.',
    criteria: [
      'The queue lists only requests in Pending Approval, oldest and highest priority first.',
      'Rejecting requires a comment; approving accepts an optional comment (max 500 chars).',
      'A manager cannot approve or reject their own request.',
      'The decision, decision maker and timestamp are recorded in the status history.',
    ],
  },
  {
    id: 'US-04',
    story: 'As an administrator, I want to mark approved requests as completed so that fulfilled work is closed.',
    criteria: [
      'Only requests in Approved status can be completed.',
      'Completion is recorded in the status history with timestamp and user.',
    ],
  },
  {
    id: 'US-05',
    story: 'As an administrator or manager, I want a dashboard of KPIs and charts so that I can monitor demand, throughput and SLA risk.',
    criteria: [
      'Shows Open requests, Average days to approval, Approval rate and Overdue requests.',
      'Shows charts for requests by department, requests over time and status breakdown.',
      'Filters for date range, department and status update all figures.',
      'A newly submitted request is reflected in the figures without a page reload.',
      'The SQL used to calculate the metrics is visible on the dashboard.',
    ],
  },
  {
    id: 'US-06',
    story: 'As an administrator, I want to export request data as CSV or JSON so that I can analyse or archive it.',
    criteria: [
      'Exports contain only data the current user is authorised to see.',
      'CSV values are escaped, including protection against spreadsheet formula injection.',
      'A data dictionary explains every field.',
    ],
  },
  {
    id: 'US-07',
    story: 'As a DevSecOps engineer, I want every push to be scanned and only safe builds deployed so that insecure code never reaches production.',
    criteria: [
      'Pipeline runs dependency vulnerability scanning, secret detection and SAST on every push and pull request.',
      'Any critical finding fails the pipeline and blocks deployment.',
      'Pushes to main that pass all checks are deployed to production automatically.',
      'The latest pipeline result and repository link are displayed in the application.',
    ],
  },
  {
    id: 'US-08',
    story: 'As the organisation, I want access strictly controlled so that unauthorised users cannot read or change request data.',
    criteria: [
      'Unauthenticated users are redirected to sign-in and receive no data from the API.',
      'All data changes go through database functions that enforce role and lifecycle rules.',
      'No privileged (service-role) key exists in frontend code or the repository.',
    ],
  },
]

const QUESTIONS = [
  { q: 'Who can approve a request?', a: 'Any user with the Manager role, except for requests they submitted themselves.' },
  { q: 'Is multi-level approval required?', a: 'No. A single manager approval is sufficient for this release.' },
  { q: 'Who marks a request as Completed?', a: 'Administrators, acting as the service desk that fulfils approved requests.' },
  { q: 'How is “overdue” defined?', a: 'A request that is still open (Submitted, Pending Approval or Approved) after its SLA due date, which is derived from priority.' },
  { q: 'Can users self-register?', a: 'No. Accounts are provisioned by an administrator and public sign-up is disabled.' },
  { q: 'Can employees edit or cancel a request after submission?', a: 'Not in this release; a rejected request can be resubmitted as a new request.' },
  { q: 'Are attachments and email notifications required?', a: 'No. Both are out of scope for the two-hour release; status is tracked in-app.' },
]

const ASSUMPTIONS = [
  'The Submitted status is recorded on creation and the request is automatically routed to Pending Approval in the same transaction; both steps appear in the history.',
  'Department on a request is the department the request is raised for; an employee may raise requests on behalf of their team.',
  'Average days to approval counts the time from submission to approval decision for Approved and Completed requests.',
  'Approval rate = (Approved + Completed) ÷ (Approved + Completed + Rejected).',
  'Employees see dashboard figures for their own requests only; managers and administrators see organisation-wide figures.',
  'All sample data is fictional and contains no real personal information.',
  'The GitHub repository is public so the latest pipeline result can be read without an access token.',
]

export default function Requirements() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Requirements"
        description="Problem statement, user roles, user stories with acceptance criteria, clarifying questions and explicit assumptions."
      />

      <Card>
        <CardHeader title="Problem statement" />
        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-slate-600">
          <p>
            Internal service requests such as hardware, software access, facilities, travel and procurement are currently raised
            through email and shared spreadsheets. Requests get lost, approvals have no audit trail, nobody can see which requests
            are breaching their service levels, and leadership has no reliable data on demand by department.
          </p>
          <p>
            The Service Request Management Portal provides a single, secure channel to submit requests, an enforced approval
            lifecycle (Submitted → Pending Approval → Approved / Rejected → Completed) with a complete status history, and a live
            dashboard of operational KPIs.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="User roles" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Can</th>
                <th className="px-5 py-3">Cannot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ROLES.map((r) => (
                <tr key={r.role} className="align-top">
                  <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">{r.role}</td>
                  <td className="px-5 py-3 text-slate-600">{r.can}</td>
                  <td className="px-5 py-3 text-slate-600">{r.cannot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="User stories & acceptance criteria" description={`${STORIES.length} stories`} />
        <div className="divide-y divide-slate-100">
          {STORIES.map((s) => (
            <div key={s.id} className="px-5 py-4">
              <div className="flex gap-3">
                <span className="h-fit rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{s.id}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{s.story}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {s.criteria.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Clarifying questions & answers" />
          <dl className="divide-y divide-slate-100">
            {QUESTIONS.map((item) => (
              <div key={item.q} className="px-5 py-3">
                <dt className="text-sm font-medium text-slate-900">{item.q}</dt>
                <dd className="mt-1 text-sm text-slate-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Explicit assumptions" />
          <ul className="list-disc space-y-2 px-5 py-4 pl-10 text-sm text-slate-600">
            {ASSUMPTIONS.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}