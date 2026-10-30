-- =====================================================================
-- 02_security.sql  |  Functions, triggers, RLS, grants, realtime
-- Run after 01_schema.sql.
-- =====================================================================

-- ---------- Auto-create a profile when an auth user is created ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
                     split_part(new.email, '@', 1));
  if v_name is null or char_length(v_name) < 2 then
    v_name := 'New User';
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), left(v_name, 80))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Role helper used by RLS (SECURITY DEFINER avoids policy recursion) ----------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- SLA (resolution target in days) ----------
create or replace function public.sla_days(p_priority text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_priority
           when 'Critical' then 2
           when 'High'     then 5
           when 'Medium'   then 10
           else 15
         end;
$$;

-- ---------- Lifecycle enforcement (defence in depth) ----------
create or replace function public.enforce_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status <> 'Submitted' then
    raise exception 'New requests must start in Submitted status' using errcode = '22023';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not (
         (old.status = 'Submitted'        and new.status = 'Pending Approval')
      or (old.status = 'Pending Approval' and new.status in ('Approved', 'Rejected'))
      or (old.status = 'Approved'         and new.status = 'Completed')
    ) then
      raise exception 'Invalid status transition: % -> %', old.status, new.status
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_status_transition on public.service_requests;
create trigger trg_enforce_status_transition
  before insert or update on public.service_requests
  for each row execute function public.enforce_status_transition();

-- ---------- Automatic status history logging ----------
create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comment text := nullif(current_setting('app.status_comment', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.request_status_history (request_id, from_status, to_status, changed_by, comment)
    values (new.id, null, new.status, auth.uid(), v_comment);
  elsif new.status is distinct from old.status then
    insert into public.request_status_history (request_id, from_status, to_status, changed_by, comment)
    values (new.id, old.status, new.status, auth.uid(), v_comment);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_status_change on public.service_requests;
create trigger trg_log_status_change
  after insert or update of status on public.service_requests
  for each row execute function public.log_status_change();

-- ---------- RPC: submit a request (any authenticated user) ----------
create or replace function public.submit_request(
  p_title           text,
  p_description     text,
  p_department_id   integer,
  p_request_type_id integer,
  p_priority        text
)
returns public.service_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.service_requests;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'User profile not found' using errcode = '42501';
  end if;

  p_title       := btrim(coalesce(p_title, ''));
  p_description := btrim(coalesce(p_description, ''));

  if char_length(p_title) not between 5 and 120 then
    raise exception 'Title must be between 5 and 120 characters' using errcode = '22023';
  end if;
  if char_length(p_description) not between 10 and 2000 then
    raise exception 'Description must be between 10 and 2000 characters' using errcode = '22023';
  end if;
  if p_priority is null or p_priority not in ('Low', 'Medium', 'High', 'Critical') then
    raise exception 'Invalid priority' using errcode = '22023';
  end if;
  if not exists (select 1 from public.departments where id = p_department_id) then
    raise exception 'Invalid department' using errcode = '22023';
  end if;
  if not exists (select 1 from public.request_types where id = p_request_type_id) then
    raise exception 'Invalid request type' using errcode = '22023';
  end if;

  perform set_config('app.status_comment', 'Request submitted', true);

  insert into public.service_requests
    (title, description, department_id, request_type_id, priority, status, requester_id, due_date)
  values
    (p_title, p_description, p_department_id, p_request_type_id, p_priority, 'Submitted', v_uid,
     (now() + make_interval(days => public.sla_days(p_priority)))::date)
  returning * into v_req;

  perform set_config('app.status_comment', 'Automatically routed for manager approval', true);

  update public.service_requests
     set status = 'Pending Approval'
   where id = v_req.id
  returning * into v_req;

  return v_req;
end;
$$;

-- ---------- RPC: approve / reject (managers only, not own requests) ----------
create or replace function public.decide_request(
  p_request_id bigint,
  p_decision   text,
  p_comment    text default null
)
returns public.service_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.service_requests;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if public.current_user_role() is distinct from 'manager' then
    raise exception 'Only managers can approve or reject requests' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('Approved', 'Rejected') then
    raise exception 'Decision must be Approved or Rejected' using errcode = '22023';
  end if;

  p_comment := nullif(btrim(coalesce(p_comment, '')), '');
  if p_decision = 'Rejected' and p_comment is null then
    raise exception 'A comment is required when rejecting a request' using errcode = '22023';
  end if;
  if p_comment is not null and char_length(p_comment) > 500 then
    raise exception 'Comment must be 500 characters or fewer' using errcode = '22023';
  end if;

  select * into v_req from public.service_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if v_req.requester_id = v_uid then
    raise exception 'You cannot approve or reject your own request' using errcode = '42501';
  end if;
  if v_req.status <> 'Pending Approval' then
    raise exception 'Only requests pending approval can be decided (current status: %)', v_req.status
      using errcode = '22023';
  end if;

  perform set_config('app.status_comment',
                     coalesce(p_comment, 'Approved by manager'), true);

  update public.service_requests
     set status           = p_decision,
         decided_at       = now(),
         decided_by       = v_uid,
         decision_comment = p_comment
   where id = p_request_id
  returning * into v_req;

  return v_req;
end;
$$;

-- ---------- RPC: complete an approved request (admins only) ----------
create or replace function public.complete_request(
  p_request_id bigint,
  p_comment    text default null
)
returns public.service_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.service_requests;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Only administrators can complete requests' using errcode = '42501';
  end if;

  p_comment := nullif(btrim(coalesce(p_comment, '')), '');
  if p_comment is not null and char_length(p_comment) > 500 then
    raise exception 'Comment must be 500 characters or fewer' using errcode = '22023';
  end if;

  select * into v_req from public.service_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if v_req.status <> 'Approved' then
    raise exception 'Only approved requests can be completed (current status: %)', v_req.status
      using errcode = '22023';
  end if;

  perform set_config('app.status_comment',
                     coalesce(p_comment, 'Request fulfilled and closed'), true);

  update public.service_requests
     set status = 'Completed', completed_at = now()
   where id = p_request_id
  returning * into v_req;

  return v_req;
end;
$$;

-- ---------- RPC: dashboard metrics (SECURITY INVOKER => RLS applies) ----------
create or replace function public.get_dashboard_metrics(
  p_from          date    default null,
  p_to            date    default null,
  p_department_id integer default null,
  p_status        text    default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
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
    'total_requests',
      (select count(*) from filtered),
    'open_requests',
      (select count(*) from filtered
        where status in ('Submitted', 'Pending Approval', 'Approved')),
    'avg_days_to_approval',
      (select round((avg(extract(epoch from (decided_at - submitted_at)) / 86400.0))::numeric, 1)
         from filtered where status in ('Approved', 'Completed')),
    'approval_rate',
      (select case
                when count(*) filter (where status in ('Approved', 'Completed', 'Rejected')) = 0 then null
                else round(100.0 * count(*) filter (where status in ('Approved', 'Completed'))
                           / count(*) filter (where status in ('Approved', 'Completed', 'Rejected')), 1)
              end
         from filtered),
    'overdue_requests',
      (select count(*) from filtered
        where status in ('Submitted', 'Pending Approval', 'Approved')
          and due_date < current_date),
    'by_department', coalesce((
      select jsonb_agg(jsonb_build_object('department', department_name, 'count', c)
                       order by c desc, department_name)
        from (select department_name, count(*) as c from filtered group by department_name) x
    ), '[]'::jsonb),
    'over_time', coalesce((
      select jsonb_agg(jsonb_build_object('week', to_char(wk, 'YYYY-MM-DD'), 'count', c) order by wk)
        from (select date_trunc('week', submitted_at) as wk, count(*) as c from filtered group by 1) x
    ), '[]'::jsonb),
    'status_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('status', status, 'count', c) order by c desc)
        from (select status, count(*) as c from filtered group by status) x
    ), '[]'::jsonb)
  );
$$;

-- ---------- Row Level Security ----------
alter table public.departments            enable row level security;
alter table public.request_types          enable row level security;
alter table public.profiles               enable row level security;
alter table public.service_requests       enable row level security;
alter table public.request_status_history enable row level security;

drop policy if exists departments_read on public.departments;
create policy departments_read on public.departments
  for select to authenticated using (true);

drop policy if exists request_types_read on public.request_types;
create policy request_types_read on public.request_types
  for select to authenticated using (true);

-- Internal staff directory: signed-in staff can read names/roles (needed for history display).
-- No insert/update/delete policies => nobody can change their own role.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

-- Employees see their own requests; managers and admins see all.
drop policy if exists requests_read on public.service_requests;
create policy requests_read on public.service_requests
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or (select public.current_user_role()) in ('manager', 'admin')
  );

-- History is visible when the parent request is visible (RLS applies inside the subquery).
drop policy if exists history_read on public.request_status_history;
create policy history_read on public.request_status_history
  for select to authenticated
  using (exists (select 1 from public.service_requests r where r.id = request_id));

-- ---------- Grants: read-only tables, writes only via RPC ----------
revoke all on public.departments, public.request_types, public.profiles,
              public.service_requests, public.request_status_history
  from anon, authenticated;

grant select on public.departments, public.request_types, public.profiles,
                public.service_requests, public.request_status_history
  to authenticated;

revoke all on sequence public.request_reference_seq from anon, authenticated;

revoke execute on function public.handle_new_user()           from public, anon, authenticated;
revoke execute on function public.log_status_change()         from public, anon, authenticated;
revoke execute on function public.enforce_status_transition() from public, anon, authenticated;
revoke execute on function public.set_updated_at()            from public, anon, authenticated;
revoke execute on function public.sla_days(text)              from public, anon, authenticated;

revoke execute on function public.current_user_role()                               from public, anon;
revoke execute on function public.submit_request(text, text, integer, integer, text) from public, anon;
revoke execute on function public.decide_request(bigint, text, text)                from public, anon;
revoke execute on function public.complete_request(bigint, text)                    from public, anon;
revoke execute on function public.get_dashboard_metrics(date, date, integer, text)  from public, anon;

grant execute on function public.current_user_role()                               to authenticated;
grant execute on function public.submit_request(text, text, integer, integer, text) to authenticated;
grant execute on function public.decide_request(bigint, text, text)                to authenticated;
grant execute on function public.complete_request(bigint, text)                    to authenticated;
grant execute on function public.get_dashboard_metrics(date, date, integer, text)  to authenticated;

-- ---------- Realtime (live dashboard updates; RLS still applies) ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'service_requests'
  ) then
    alter publication supabase_realtime add table public.service_requests;
  end if;
end;
$$;