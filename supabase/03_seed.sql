-- =====================================================================
-- 03_seed.sql  |  Lookup data, demo roles, 36 fictional requests + history
-- Run AFTER creating the 4 demo users in Authentication. Safe to re-run.
-- All names and request contents are fictional.
-- =====================================================================
begin;

-- ---------- Guard: demo users must exist ----------
do $$
begin
  if (select count(*) from public.profiles
       where email in ('employee1@demo.local', 'employee2@demo.local',
                       'manager@demo.local', 'admin@demo.local')) < 4 then
    raise exception 'Create the 4 demo users in Authentication before running this seed';
  end if;
end;
$$;

-- ---------- Lookup data ----------
insert into public.departments (name) values
  ('IT'), ('HR'), ('Finance'), ('Operations'), ('Marketing'), ('Sales')
on conflict (name) do nothing;

insert into public.request_types (name) values
  ('Hardware'), ('Software Access'), ('Network/VPN'), ('Facilities'),
  ('HR Letter'), ('Travel'), ('Procurement')
on conflict (name) do nothing;

-- ---------- Assign demo roles ----------
update public.profiles p
   set role = v.role, full_name = v.full_name, department_id = d.id
  from (values
          ('employee1@demo.local', 'employee', 'Alex Employee', 'IT'),
          ('employee2@demo.local', 'employee', 'Sam Employee',  'Finance'),
          ('manager@demo.local',   'manager',  'Morgan Manager','Operations'),
          ('admin@demo.local',     'admin',    'Jordan Admin',  'IT')
       ) as v(email, role, full_name, dept)
  join public.departments d on d.name = v.dept
 where p.email = v.email;

-- ---------- Reset request data ----------
truncate public.request_status_history, public.service_requests restart identity;
alter sequence public.request_reference_seq restart with 1001;

-- Seed historical rows directly (bypasses lifecycle/history triggers for this load only)
alter table public.service_requests disable trigger trg_enforce_status_transition;
alter table public.service_requests disable trigger trg_log_status_change;

insert into public.service_requests
  (title, description, department_id, request_type_id, priority, status, requester_id,
   submitted_at, due_date, decided_at, decided_by, decision_comment, completed_at,
   created_at, updated_at)
select
  s.title, s.description, d.id, t.id, s.priority, s.status, req.id,
  s.submitted_at,
  (s.submitted_at + make_interval(days => public.sla_days(s.priority)))::date,
  s.submitted_at + s.decide_after,
  case when s.decide_after is not null then mgr.id end,
  s.decision_comment,
  s.submitted_at + s.decide_after + s.complete_after,
  s.submitted_at,
  coalesce(s.submitted_at + s.decide_after + s.complete_after,
           s.submitted_at + s.decide_after,
           s.submitted_at)
from (values
  ('Replacement laptop for failing SSD', 'Current laptop shows repeated disk errors and blue screens; needs replacement before quarter-end reporting.', 'IT', 'Hardware', 'High', 'Completed', 'employee1@demo.local', timestamptz '2026-05-04 09:15+05:30', interval '6 hours', interval '2 days', 'Approved: device past warranty.'::text),
  ('Employment confirmation letter for bank', 'Need a signed employment confirmation letter to support a personal housing loan application.', 'HR', 'HR Letter', 'Low', 'Completed', 'employee2@demo.local', timestamptz '2026-05-07 10:30+05:30', interval '1 day', interval '1 day', null),
  ('ERP accounts payable module access', 'Request read and post access to the accounts payable module for invoice processing duties.', 'Finance', 'Software Access', 'Medium', 'Completed', 'employee2@demo.local', timestamptz '2026-05-12 14:00+05:30', interval '1 day 3 hours', interval '2 days', null),
  ('Standing desks for dispatch team', 'Four height-adjustable desks requested for the dispatch team to reduce reported back strain.', 'Operations', 'Facilities', 'Medium', 'Rejected', 'employee1@demo.local', timestamptz '2026-05-18 08:45+05:30', interval '3 days', null, 'Furniture budget exhausted this quarter; please resubmit in Q3.'),
  ('Design collaboration tool licences', 'Ten seats of a design collaboration tool for the campaign creative team.', 'Marketing', 'Procurement', 'High', 'Completed', 'employee1@demo.local', timestamptz '2026-05-22 11:20+05:30', interval '2 days', interval '3 days', null),
  ('Travel booking for distributor visit', 'Return flights and two nights accommodation for a regional distributor review meeting.', 'Sales', 'Travel', 'Medium', 'Completed', 'employee2@demo.local', timestamptz '2026-05-28 16:05+05:30', interval '20 hours', interval '1 day', null),
  ('VPN access failure for remote staff', 'Remote finance staff cannot connect to VPN after certificate rotation; month-end close is blocked.', 'IT', 'Network/VPN', 'Critical', 'Completed', 'employee1@demo.local', timestamptz '2026-06-03 09:00+05:30', interval '2 hours', interval '3 hours', 'Approved as P1 incident.'),
  ('HRIS reporting role for HR analyst', 'Grant the reporting role in the HR information system so headcount reports can be produced.', 'HR', 'Software Access', 'Medium', 'Completed', 'employee2@demo.local', timestamptz '2026-06-09 13:40+05:30', interval '2 days', interval '1 day', null),
  ('Second accounting software licence', 'Purchase an additional standalone licence of the accounting package for the tax team.', 'Finance', 'Procurement', 'High', 'Rejected', 'employee2@demo.local', timestamptz '2026-06-15 10:10+05:30', interval '1 day', null, 'Duplicate of the existing enterprise licence; use the shared licence pool.'),
  ('Barcode scanners for warehouse bay 3', 'Three handheld barcode scanners to replace damaged units in warehouse bay 3.', 'Operations', 'Hardware', 'Medium', 'Completed', 'employee1@demo.local', timestamptz '2026-06-19 15:30+05:30', interval '3 days', interval '5 days', null),
  ('Training room booking for workshop', 'Book the large training room for a full-day campaign planning workshop.', 'Marketing', 'Facilities', 'Low', 'Completed', 'employee1@demo.local', timestamptz '2026-06-26 09:50+05:30', interval '1 day', interval '2 days', null),
  ('CRM access for new sales executives', 'Create CRM accounts with the sales role for two newly onboarded sales executives.', 'Sales', 'Software Access', 'High', 'Completed', 'employee2@demo.local', timestamptz '2026-07-02 11:00+05:30', interval '5 hours', interval '1 day', null),
  ('Local admin rights on workstation', 'Request permanent local administrator rights on a developer workstation to install tools.', 'IT', 'Software Access', 'Medium', 'Rejected', 'employee1@demo.local', timestamptz '2026-07-08 14:20+05:30', interval '1 day', null, 'Violates endpoint policy; request a managed development VM instead.'),
  ('Second monitor for month-end close', 'Additional monitor to support reconciliation work during month-end close.', 'Finance', 'Hardware', 'Low', 'Completed', 'employee2@demo.local', timestamptz '2026-07-14 08:30+05:30', interval '2 days', interval '3 days', null),
  ('Travel for campus recruitment drive', 'Ground transport and meals for three staff attending a university recruitment fair.', 'HR', 'Travel', 'Medium', 'Completed', 'employee2@demo.local', timestamptz '2026-07-21 10:45+05:30', interval '1 day', interval '1 day', null),
  ('Wi-Fi dead zone in loading dock', 'Handheld devices lose connectivity in the loading dock; an additional access point is needed.', 'Operations', 'Network/VPN', 'High', 'Completed', 'employee1@demo.local', timestamptz '2026-07-27 13:15+05:30', interval '8 hours', interval '3 days', null),
  ('Merchandise order for trade fair', 'Branded promotional items for the regional trade fair booth.', 'Marketing', 'Procurement', 'Medium', 'Rejected', 'employee1@demo.local', timestamptz '2026-08-03 09:25+05:30', interval '4 days', null, 'Event postponed; request not required this period.'),
  ('Tablets for field sales demos', 'Five tablets for field sales staff to run product demonstrations at client sites.', 'Sales', 'Hardware', 'Medium', 'Approved', 'employee2@demo.local', timestamptz '2026-08-10 15:00+05:30', interval '2 days', null, 'Approved; procure through the preferred vendor.'),
  ('Server room UPS battery replacement', 'UPS self-test failed; batteries must be replaced to protect core infrastructure.', 'IT', 'Hardware', 'Critical', 'Completed', 'employee1@demo.local', timestamptz '2026-08-17 11:35+05:30', interval '1 hour', interval '1 day', null),
  ('Treasury dashboard access for auditors', 'Temporary read-only access to the treasury dashboard for the external audit team.', 'Finance', 'Software Access', 'High', 'Completed', 'employee2@demo.local', timestamptz '2026-08-24 10:00+05:30', interval '1 day', interval '1 day', 'Approved for audit period only.'),
  ('Wellness room setup on level 2', 'Convert the unused level 2 meeting room into a quiet wellness room.', 'HR', 'Facilities', 'Medium', 'Completed', 'employee2@demo.local', timestamptz '2026-09-01 09:40+05:30', interval '3 days', interval '6 days', null),
  ('Forklift lease extension', 'Extend the lease on two forklifts for six months to cover peak season.', 'Operations', 'Procurement', 'High', 'Rejected', 'employee1@demo.local', timestamptz '2026-09-07 14:50+05:30', interval '2 days', null, 'Vendor contract under renegotiation; Operations head will raise directly.'),
  ('Social media scheduling tool access', 'Access to the corporate social media scheduling tool for the content coordinator.', 'Marketing', 'Software Access', 'Low', 'Completed', 'employee1@demo.local', timestamptz '2026-09-14 08:55+05:30', interval '2 days', interval '1 day', null),
  ('Client visit travel for renewal', 'Travel to an enterprise client site to support a contract renewal negotiation.', 'Sales', 'Travel', 'High', 'Completed', 'employee2@demo.local', timestamptz '2026-09-21 16:20+05:30', interval '1 day', interval '1 day', null),
  ('Firewall rule for payroll integration', 'Open outbound HTTPS from the payroll server to the new payroll provider endpoint.', 'IT', 'Network/VPN', 'Medium', 'Approved', 'employee1@demo.local', timestamptz '2026-09-28 10:30+05:30', interval '2 days', null, 'Approved after security review.'),
  ('Salary certificate in custom format', 'Salary certificate requested in a bank-specific format instead of the standard template.', 'Finance', 'HR Letter', 'Low', 'Rejected', 'employee2@demo.local', timestamptz '2026-10-05 11:10+05:30', interval '1 day', null, 'Certificates are issued in the standard template only.'),
  ('Learning platform licence for HR', 'Licence for the online learning platform to deliver mandatory compliance training.', 'HR', 'Software Access', 'Medium', 'Pending Approval', 'employee2@demo.local', timestamptz '2026-10-08 09:05+05:30', null, null, null),
  ('Replacement pallet jack', 'Hydraulic pallet jack in the receiving area is leaking and unsafe to use.', 'Operations', 'Hardware', 'High', 'Pending Approval', 'employee1@demo.local', timestamptz '2026-10-12 13:30+05:30', null, null, null),
  ('Laptop for new marketing analyst', 'Standard laptop build for a marketing analyst joining next month.', 'Marketing', 'Hardware', 'Medium', 'Approved', 'employee1@demo.local', timestamptz '2026-10-15 10:20+05:30', interval '2 days', null, null),
  ('CRM outage for sales region', 'Sales staff in one region cannot log in to CRM; quotes cannot be issued.', 'Sales', 'Software Access', 'Critical', 'Pending Approval', 'employee2@demo.local', timestamptz '2026-10-19 15:45+05:30', null, null, null),
  ('Password manager team vault', 'Create a shared password manager vault for the infrastructure team.', 'IT', 'Software Access', 'Low', 'Approved', 'employee1@demo.local', timestamptz '2026-10-21 09:30+05:30', interval '1 day', null, null),
  ('Travel for budget planning offsite', 'Accommodation for finance staff attending the annual budget planning offsite.', 'Finance', 'Travel', 'Medium', 'Pending Approval', 'employee2@demo.local', timestamptz '2026-10-23 11:50+05:30', null, null, null),
  ('Ergonomic chairs for HR team', 'Replace four worn office chairs in the HR area with ergonomic models.', 'HR', 'Facilities', 'Low', 'Pending Approval', 'employee2@demo.local', timestamptz '2026-10-26 14:10+05:30', null, null, null),
  ('VPN capacity for warehouse terminals', 'Additional VPN licences for new warehouse terminals at the satellite depot.', 'Operations', 'Network/VPN', 'High', 'Pending Approval', 'employee1@demo.local', timestamptz '2026-10-27 08:40+05:30', null, null, null),
  ('Docking stations for IT support desk', 'Six docking stations for the IT support desk hot-desking area.', 'IT', 'Hardware', 'Medium', 'Pending Approval', 'employee1@demo.local', timestamptz '2026-10-28 10:15+05:30', null, null, null),
  ('Travel for product launch event', 'Travel and accommodation for two marketing staff supporting a product launch.', 'Marketing', 'Travel', 'Low', 'Pending Approval', 'employee1@demo.local', timestamptz '2026-10-29 16:30+05:30', null, null, null)
) as s(title, description, dept, rtype, priority, status, requester_email,
       submitted_at, decide_after, complete_after, decision_comment)
join public.departments   d   on d.name   = s.dept
join public.request_types t   on t.name   = s.rtype
join public.profiles      req on req.email = s.requester_email
cross join (select id from public.profiles where email = 'manager@demo.local') mgr
order by s.submitted_at;

-- ---------- Matching status history ----------
insert into public.request_status_history (request_id, from_status, to_status, changed_by, comment, changed_at)
select id, null, 'Submitted', requester_id, 'Request submitted', submitted_at
  from public.service_requests
union all
select id, 'Submitted', 'Pending Approval', requester_id,
       'Automatically routed for manager approval', submitted_at + interval '1 second'
  from public.service_requests
union all
select id, 'Pending Approval',
       case when status = 'Rejected' then 'Rejected' else 'Approved' end,
       decided_by, coalesce(decision_comment, 'Approved by manager'), decided_at
  from public.service_requests where decided_at is not null
union all
select r.id, 'Approved', 'Completed', a.id, 'Request fulfilled and closed', r.completed_at
  from public.service_requests r
 cross join (select id from public.profiles where email = 'admin@demo.local') a
 where r.completed_at is not null;

alter table public.service_requests enable trigger trg_enforce_status_transition;
alter table public.service_requests enable trigger trg_log_status_change;

commit;