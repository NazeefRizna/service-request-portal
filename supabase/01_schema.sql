-- =====================================================================
-- 01_schema.sql  |  Service Request Management Portal
-- Tables, constraints, indexes. Run first.
-- =====================================================================

-- ---------- Lookup tables ----------
create table if not exists public.departments (
  id   smallint generated always as identity primary key,
  name text not null unique check (char_length(btrim(name)) between 2 and 60)
);

create table if not exists public.request_types (
  id   smallint generated always as identity primary key,
  name text not null unique check (char_length(btrim(name)) between 2 and 60)
);

-- ---------- User profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text not null check (char_length(btrim(full_name)) between 2 and 80),
  role          text not null default 'employee'
                check (role in ('employee', 'manager', 'admin')),
  department_id smallint references public.departments(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ---------- Service requests ----------
create sequence if not exists public.request_reference_seq start with 1001;

create table if not exists public.service_requests (
  id               bigint generated always as identity primary key,
  reference        text not null unique
                   default ('SR-' || nextval('public.request_reference_seq')::text),
  title            text not null check (char_length(btrim(title)) between 5 and 120),
  description      text not null check (char_length(btrim(description)) between 10 and 2000),
  department_id    smallint not null references public.departments(id) on delete restrict,
  request_type_id  smallint not null references public.request_types(id) on delete restrict,
  priority         text not null check (priority in ('Low', 'Medium', 'High', 'Critical')),
  status           text not null default 'Submitted'
                   check (status in ('Submitted', 'Pending Approval', 'Approved', 'Rejected', 'Completed')),
  requester_id     uuid not null references public.profiles(id) on delete restrict,
  submitted_at     timestamptz not null default now(),
  due_date         date not null,
  decided_at       timestamptz,
  decided_by       uuid references public.profiles(id) on delete set null,
  decision_comment text check (decision_comment is null or char_length(decision_comment) <= 500),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint chk_decided_after_submitted
    check (decided_at is null or decided_at >= submitted_at),
  constraint chk_completed_after_decided
    check (completed_at is null or (decided_at is not null and completed_at >= decided_at)),
  constraint chk_decision_fields check (
       (status in ('Submitted', 'Pending Approval') and decided_at is null)
    or (status in ('Approved', 'Rejected', 'Completed') and decided_at is not null)
  ),
  constraint chk_completed_fields
    check ((status = 'Completed') = (completed_at is not null))
);

create index if not exists idx_requests_status       on public.service_requests (status);
create index if not exists idx_requests_department   on public.service_requests (department_id);
create index if not exists idx_requests_submitted_at on public.service_requests (submitted_at);
create index if not exists idx_requests_requester    on public.service_requests (requester_id);

-- ---------- Status history (audit trail) ----------
create table if not exists public.request_status_history (
  id          bigint generated always as identity primary key,
  request_id  bigint not null references public.service_requests(id) on delete cascade,
  from_status text check (from_status is null or from_status in
              ('Submitted', 'Pending Approval', 'Approved', 'Rejected', 'Completed')),
  to_status   text not null check (to_status in
              ('Submitted', 'Pending Approval', 'Approved', 'Rejected', 'Completed')),
  changed_by  uuid references public.profiles(id) on delete set null,
  comment     text check (comment is null or char_length(comment) <= 500),
  changed_at  timestamptz not null default now()
);

create index if not exists idx_history_request on public.request_status_history (request_id, changed_at);

-- ---------- updated_at maintenance ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_service_requests_updated_at on public.service_requests;
create trigger trg_service_requests_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();