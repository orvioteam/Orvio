create extension if not exists "uuid-ossp";
create schema if not exists cleanflow_private;

revoke all on schema cleanflow_private from public, anon, authenticated;
grant usage on schema cleanflow_private to authenticated;

create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations
  add column if not exists created_by uuid references auth.users (id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now();

alter table public.organizations
  alter column created_by set default auth.uid();

create table if not exists public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'manager', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create or replace function public.ensure_current_user_organization(p_organization_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select member.organization_id
  into v_organization_id
  from public.organization_members as member
  where member.user_id = v_user_id
  order by member.created_at asc
  limit 1;

  if v_organization_id is not null then
    return v_organization_id;
  end if;

  select organization.id
  into v_organization_id
  from public.organizations as organization
  where organization.created_by = v_user_id
  order by organization.created_at asc
  limit 1;

  if v_organization_id is null then
    insert into public.organizations (name, email, created_by)
    values (
      coalesce(nullif(btrim(p_organization_name), ''), 'Meine Organisation'),
      coalesce(auth.jwt() ->> 'email', ''),
      v_user_id
    )
    returning id into v_organization_id;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return v_organization_id;
end;
$$;

revoke all on function public.ensure_current_user_organization(text) from public, anon, authenticated;
grant execute on function public.ensure_current_user_organization(text) to authenticated;

alter table public.organization_members
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_user_id_fkey'
  ) then
    alter table public.organization_members
      add constraint organization_members_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end
$$;

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  company_name text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  color text not null default '#10b981',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  employee_id uuid,
  title text not null,
  description text,
  date date not null,
  start_time time not null,
  end_time time,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_end_after_start check (end_time is null or end_time >= start_time)
);

create index if not exists customers_org_idx on public.customers (organization_id);
create index if not exists employees_org_idx on public.employees (organization_id);
create index if not exists jobs_org_idx on public.jobs (organization_id);
create index if not exists jobs_date_idx on public.jobs (date);
create unique index if not exists customers_org_id_id_idx
  on public.customers (organization_id, id);
create unique index if not exists employees_org_id_id_idx
  on public.employees (organization_id, id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass
      and conname = 'jobs_customer_same_organization'
  ) then
    alter table public.jobs
      add constraint jobs_customer_same_organization
      foreign key (organization_id, customer_id)
      references public.customers (organization_id, id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass
      and conname = 'jobs_employee_same_organization'
  ) then
    alter table public.jobs
      add constraint jobs_employee_same_organization
      foreign key (organization_id, employee_id)
      references public.employees (organization_id, id)
      on delete set null (employee_id);
  end if;
end
$$;

create or replace function cleanflow_private.is_organization_creator(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations as organization
    where organization.id = p_organization_id
      and organization.created_by = (select auth.uid())
  );
$$;

revoke all on function cleanflow_private.is_organization_creator(uuid) from public, anon, authenticated;
grant execute on function cleanflow_private.is_organization_creator(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.employees enable row level security;
alter table public.jobs enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('organizations', 'organization_members')
  loop
    execute format('drop policy if exists %I on public.%I', existing_policy.policyname, existing_policy.tablename);
  end loop;
end
$$;

drop policy if exists "Users can manage their own customers" on public.customers;
drop policy if exists "Users can manage their own employees" on public.employees;
drop policy if exists "Users can manage their own jobs" on public.jobs;

grant select, insert, update on public.organizations to authenticated;
grant select, insert on public.organization_members to authenticated;

create policy "Organization creators can create organizations"
on public.organizations
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "Organization members can view their organizations"
on public.organizations
for select
to authenticated
using (
  created_by = (select auth.uid())
  or id in (
    select organization_id
    from public.organization_members
    where user_id = (select auth.uid())
  )
);

create policy "Organization members can update their organizations"
on public.organizations
for update
to authenticated
using (
  created_by = (select auth.uid())
  or id in (
    select organization_id
    from public.organization_members
    where user_id = (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  or id in (
    select organization_id
    from public.organization_members
    where user_id = (select auth.uid())
  )
);

create policy "Users can create their own organization membership"
on public.organization_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and cleanflow_private.is_organization_creator(organization_id)
);

create policy "Users can view their own organization memberships"
on public.organization_members
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Organization members can manage their customers"
on public.customers
for all
to authenticated
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = (select auth.uid())
  )
)
with check (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = (select auth.uid())
  )
);

create policy "Organization members can manage their employees"
on public.employees
for all
to authenticated
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = (select auth.uid())
  )
)
with check (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = (select auth.uid())
  )
);

create policy "Organization members can manage their jobs"
on public.jobs
for all
to authenticated
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = (select auth.uid())
  )
)
with check (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = (select auth.uid())
  )
);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_organization_creator_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'Organization creator cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_creator_immutable on public.organizations;
create trigger organizations_creator_immutable
before update of created_by on public.organizations
for each row execute function public.prevent_organization_creator_change();

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
before update on public.organizations
for each row execute function public.update_updated_at_column();

drop trigger if exists organization_members_updated_at on public.organization_members;
create trigger organization_members_updated_at
before update on public.organization_members
for each row execute function public.update_updated_at_column();

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
before update on public.customers
for each row execute function public.update_updated_at_column();

drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at
before update on public.employees
for each row execute function public.update_updated_at_column();

drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at
before update on public.jobs
for each row execute function public.update_updated_at_column();

-- Orvio owner/employee roles, invitation flow, and row-level security (migration 005)
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.organization_members
  add column if not exists language text not null default 'de';

alter table public.employees
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists employees_user_id_unique
  on public.employees (user_id)
  where user_id is not null;

alter table public.organizations
  add column if not exists workday_start time not null default '06:00',
  add column if not exists workday_end time not null default '24:00',
  add column if not exists week_starts_on smallint not null default 1;

alter table public.organization_members
  drop constraint if exists organization_members_role_check,
  drop constraint if exists organization_members_language_check;

update public.organization_members
set role = 'owner'
where role in ('manager', 'admin');

alter table public.organization_members
  add constraint organization_members_role_check check (role in ('owner', 'employee')),
  add constraint organization_members_language_check check (language in ('de', 'en', 'fr', 'it'));

alter table public.organizations
  drop constraint if exists organizations_week_starts_on_check,
  drop constraint if exists organizations_workday_hours_check;

alter table public.organizations
  add constraint organizations_week_starts_on_check check (week_starts_on between 1 and 7),
  add constraint organizations_workday_hours_check check (workday_end > workday_start);

create table if not exists public.employee_invitations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists employee_invitations_employee_idx
  on public.employee_invitations (employee_id, expires_at);

alter table public.employee_invitations enable row level security;
revoke all on public.employee_invitations from public, anon, authenticated;

create or replace function cleanflow_private.is_organization_owner(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as member
    where member.organization_id = p_organization_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  );
$$;

revoke all on function cleanflow_private.is_organization_owner(uuid) from public, anon, authenticated;
grant execute on function cleanflow_private.is_organization_owner(uuid) to authenticated;

create or replace function public.get_my_employee_organization()
returns table (
  id uuid,
  name text,
  workday_start time,
  workday_end time,
  week_starts_on smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select organization.id, organization.name, organization.workday_start,
    organization.workday_end, organization.week_starts_on
  from public.organization_members as member
  join public.employees as employee
    on employee.organization_id = member.organization_id
   and employee.user_id = member.user_id
  join public.organizations as organization
    on organization.id = member.organization_id
  where member.user_id = (select auth.uid())
    and member.role = 'employee';
$$;

revoke all on function public.get_my_employee_organization() from public, anon, authenticated;
grant execute on function public.get_my_employee_organization() to authenticated;

create or replace function cleanflow_private.hash_invitation_token(p_token text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_extension_schema name;
  v_hash text;
begin
  select namespace.nspname
  into v_extension_schema
  from pg_catalog.pg_extension as extension
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = extension.extnamespace
  where extension.extname = 'pgcrypto';

  if v_extension_schema is null then
    raise exception 'pgcrypto extension is not installed';
  end if;

  execute pg_catalog.format(
    'select pg_catalog.encode(%I.digest(pg_catalog.convert_to($1, ''UTF8''), ''sha256''), ''hex'')',
    v_extension_schema
  )
  into v_hash
  using p_token;

  return v_hash;
end;
$$;

revoke all on function cleanflow_private.hash_invitation_token(text) from public, anon, authenticated;

drop policy if exists "Organization creators can create organizations" on public.organizations;
create policy "Users without a membership can create their organization"
on public.organizations
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and not exists (
    select 1
    from public.organization_members as member
    where member.user_id = (select auth.uid())
  )
);

drop policy if exists "Organization members can view their organizations" on public.organizations;
create policy "Organization owners can view their organizations"
on public.organizations
for select
to authenticated
using (cleanflow_private.is_organization_owner(id));

drop policy if exists "Organization members can update their organizations" on public.organizations;
create policy "Organization owners can update their organizations"
on public.organizations
for update
to authenticated
using (cleanflow_private.is_organization_owner(id))
with check (cleanflow_private.is_organization_owner(id));

drop policy if exists "Users can create their own organization membership" on public.organization_members;
create policy "Organization creators can create their owner membership"
on public.organization_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and cleanflow_private.is_organization_creator(organization_id)
);

drop policy if exists "Organization members can manage their customers" on public.customers;
create policy "Organization owners can manage their customers"
on public.customers
for all
to authenticated
using (cleanflow_private.is_organization_owner(organization_id))
with check (cleanflow_private.is_organization_owner(organization_id));

drop policy if exists "Organization members can manage their employees" on public.employees;
create policy "Organization owners can manage their employees"
on public.employees
for all
to authenticated
using (cleanflow_private.is_organization_owner(organization_id))
with check (cleanflow_private.is_organization_owner(organization_id));

create policy "Employees can view their own employee record"
on public.employees
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Organization members can manage their jobs" on public.jobs;
create policy "Organization owners can manage their jobs"
on public.jobs
for all
to authenticated
using (cleanflow_private.is_organization_owner(organization_id))
with check (cleanflow_private.is_organization_owner(organization_id));

create policy "Employees can view their assigned jobs"
on public.jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.employees as employee
    join public.organization_members as member
      on member.organization_id = employee.organization_id
     and member.user_id = employee.user_id
    where employee.id = jobs.employee_id
      and employee.organization_id = jobs.organization_id
      and employee.user_id = (select auth.uid())
      and member.role = 'employee'
  )
);

create or replace function public.get_my_jobs()
returns table (
  id uuid,
  organization_id uuid,
  customer_id uuid,
  employee_id uuid,
  title text,
  description text,
  date date,
  start_time time,
  end_time time,
  status text,
  address text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  customer_name text,
  customer_company_name text,
  customer_address text,
  employee_first_name text,
  employee_last_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    job.id, job.organization_id, job.customer_id, job.employee_id, job.title,
    job.description, job.date, job.start_time, job.end_time, job.status,
    job.address, job.notes, job.created_at, job.updated_at,
    customer.name, customer.company_name, customer.address,
    employee.first_name, employee.last_name
  from public.jobs as job
  join public.employees as employee
    on employee.id = job.employee_id
   and employee.organization_id = job.organization_id
  join public.organization_members as member
    on member.organization_id = employee.organization_id
   and member.user_id = employee.user_id
  join public.customers as customer
    on customer.id = job.customer_id
   and customer.organization_id = job.organization_id
  where employee.user_id = (select auth.uid())
    and member.role = 'employee'
  order by job.date, job.start_time;
$$;

create or replace function public.create_employee_invitation(p_employee_id uuid, p_token text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid invitation request';
  end if;

  select employee.organization_id
  into v_organization_id
  from public.employees as employee
  where employee.id = p_employee_id
    and employee.user_id is null
    and employee.email is not null
    and btrim(employee.email) <> '';

  if v_organization_id is null
     or not cleanflow_private.is_organization_owner(v_organization_id) then
    raise exception 'Employee not found or invitation is not permitted';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_employee_id::text, 0));

  select employee.organization_id
  into v_organization_id
  from public.employees as employee
  where employee.id = p_employee_id
    and employee.user_id is null
    and employee.email is not null
    and btrim(employee.email) <> ''
  for update;

  if v_organization_id is null
     or not cleanflow_private.is_organization_owner(v_organization_id) then
    raise exception 'Employee not found or invitation is not permitted';
  end if;

  update public.employee_invitations
  set expires_at = now()
  where employee_id = p_employee_id
    and accepted_at is null
    and expires_at > now();

  insert into public.employee_invitations (organization_id, employee_id, token_hash, expires_at)
  values (
    v_organization_id,
    p_employee_id,
    cleanflow_private.hash_invitation_token(p_token),
    v_expires_at
  );

  return v_expires_at;
end;
$$;

create or replace function public.get_employee_invitation(p_token text)
returns table (employee_email text, first_name text, last_name text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select employee.email, employee.first_name, employee.last_name, invitation.expires_at
  from public.employee_invitations as invitation
  join public.employees as employee
    on employee.id = invitation.employee_id
   and employee.organization_id = invitation.organization_id
  where p_token is not null
    and length(p_token) = 64
    and p_token ~ '^[a-f0-9]{64}$'
    and invitation.token_hash = cleanflow_private.hash_invitation_token(p_token)
    and invitation.expires_at > now()
    and invitation.accepted_at is null
    and employee.user_id is null;
$$;

create or replace function public.accept_employee_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_invitation public.employee_invitations%rowtype;
  v_employee public.employees%rowtype;
  v_other_membership boolean;
  v_employee_id uuid;
begin
  if v_user_id is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Authentication required';
  end if;

  select invitation.employee_id
  into v_employee_id
  from public.employee_invitations as invitation
  where invitation.token_hash = cleanflow_private.hash_invitation_token(p_token);

  if v_employee_id is null then
    raise exception 'Invitation is invalid or expired';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_employee_id::text, 0));

  select invitation.*
  into v_invitation
  from public.employee_invitations as invitation
  where invitation.token_hash = cleanflow_private.hash_invitation_token(p_token)
  for update;

  if not found then
    raise exception 'Invitation is invalid or expired';
  end if;

  select employee.*
  into v_employee
  from public.employees as employee
  where employee.id = v_invitation.employee_id
    and employee.organization_id = v_invitation.organization_id
  for update;

  if not found
     or v_invitation.expires_at <= now()
     or (v_invitation.accepted_at is not null and v_employee.user_id is distinct from v_user_id) then
    raise exception 'Invitation is invalid or expired';
  end if;

  if lower(btrim(coalesce(v_employee.email, ''))) <> v_email then
    raise exception 'Signed-in email does not match this invitation';
  end if;

  if v_employee.user_id is not null and v_employee.user_id <> v_user_id then
    raise exception 'Employee is already linked to another account';
  end if;

  select exists (
    select 1
    from public.organization_members as member
    where member.user_id = v_user_id
      and member.organization_id <> v_invitation.organization_id
  )
  into v_other_membership;

  if v_other_membership then
    raise exception 'Account already belongs to another organization';
  end if;

  if exists (
    select 1
    from public.organization_members as member
    where member.user_id = v_user_id
      and member.organization_id = v_invitation.organization_id
      and member.role <> 'employee'
  ) then
    raise exception 'Account cannot join this employee invitation';
  end if;

  update public.employees
  set user_id = v_user_id
  where id = v_employee.id
    and organization_id = v_invitation.organization_id
    and user_id is null;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_invitation.organization_id, v_user_id, 'employee')
  on conflict (organization_id, user_id) do nothing;

  update public.employee_invitations
  set accepted_at = coalesce(accepted_at, now())
  where id = v_invitation.id;

  return v_invitation.organization_id;
end;
$$;

create or replace function public.update_my_job_status(p_job_id uuid, p_new_status text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_job public.jobs%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_new_status is null or p_new_status not in ('in_progress', 'completed') then
    raise exception 'Status transition is not allowed';
  end if;

  select job.*
  into v_job
  from public.jobs as job
  join public.employees as employee
    on employee.id = job.employee_id
   and employee.organization_id = job.organization_id
  join public.organization_members as member
    on member.organization_id = employee.organization_id
   and member.user_id = employee.user_id
  where job.id = p_job_id
    and employee.user_id = v_user_id
    and member.role = 'employee'
  for update of job;

  if not found then
    raise exception 'Assigned job not found';
  end if;

  if not (
    (v_job.status = 'scheduled' and p_new_status = 'in_progress')
    or (v_job.status = 'in_progress' and p_new_status = 'completed')
  ) then
    raise exception 'Status transition is not allowed';
  end if;

  update public.jobs
  set status = p_new_status
  where id = v_job.id;

  return v_job.id;
end;
$$;

create or replace function public.set_my_language(p_language text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_language is null or p_language not in ('de', 'en', 'fr', 'it') then
    raise exception 'Unsupported language';
  end if;

  update public.organization_members
  set language = p_language
  where user_id = auth.uid();

  if not found then
    raise exception 'Membership not found';
  end if;

  return p_language;
end;
$$;

revoke all on function public.create_employee_invitation(uuid, text) from public, anon, authenticated;
revoke all on function public.get_employee_invitation(text) from public, anon, authenticated;
revoke all on function public.get_my_jobs() from public, anon, authenticated;
revoke all on function public.accept_employee_invitation(text) from public, anon, authenticated;
revoke all on function public.update_my_job_status(uuid, text) from public, anon, authenticated;
revoke all on function public.set_my_language(text) from public, anon, authenticated;

grant execute on function public.create_employee_invitation(uuid, text) to authenticated;
grant execute on function public.get_employee_invitation(text) to anon, authenticated;
grant execute on function public.get_my_jobs() to authenticated;
grant execute on function public.accept_employee_invitation(text) to authenticated;
grant execute on function public.update_my_job_status(uuid, text) to authenticated;
grant execute on function public.set_my_language(text) to authenticated;

-- Public hashed invitation lookup and single-use acceptance (migration 006)
drop function if exists public.get_employee_invitation(text);

create function public.get_employee_invitation(p_token text)
returns table (
  invitation_status text,
  employee_email text,
  first_name text,
  last_name text,
  organization_name text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when invitation.accepted_at is not null or employee.user_id is not null then 'accepted'
      when invitation.expires_at <= now() then 'expired'
      else 'valid'
    end,
    case when invitation.accepted_at is null
      and employee.user_id is null
      and invitation.expires_at > now()
      then employee.email end,
    case when invitation.accepted_at is null
      and employee.user_id is null
      and invitation.expires_at > now()
      then employee.first_name end,
    case when invitation.accepted_at is null
      and employee.user_id is null
      and invitation.expires_at > now()
      then employee.last_name end,
    case when invitation.accepted_at is null
      and employee.user_id is null
      and invitation.expires_at > now()
      then organization.name end,
    invitation.expires_at
  from public.employee_invitations as invitation
  join public.employees as employee
    on employee.id = invitation.employee_id
   and employee.organization_id = invitation.organization_id
  join public.organizations as organization
    on organization.id = invitation.organization_id
  where p_token is not null
    and length(p_token) = 64
    and p_token ~ '^[a-f0-9]{64}$'
    and invitation.token_hash = cleanflow_private.hash_invitation_token(p_token);
$$;

revoke all on function public.get_employee_invitation(text) from public, anon, authenticated;
grant execute on function public.get_employee_invitation(text) to anon, authenticated;

create or replace function public.accept_employee_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_invitation public.employee_invitations%rowtype;
  v_employee public.employees%rowtype;
  v_other_membership boolean;
  v_employee_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_token is null or length(p_token) <> 64 or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Invitation is invalid or expired';
  end if;

  select invitation.employee_id
  into v_employee_id
  from public.employee_invitations as invitation
  where invitation.token_hash = cleanflow_private.hash_invitation_token(p_token);

  if v_employee_id is null then
    raise exception 'Invitation is invalid or expired';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_employee_id::text, 0));

  select invitation.*
  into v_invitation
  from public.employee_invitations as invitation
  where invitation.token_hash = cleanflow_private.hash_invitation_token(p_token)
  for update;

  if not found then
    raise exception 'Invitation is invalid or expired';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'Invitation already used';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception 'Invitation is invalid or expired';
  end if;

  select employee.*
  into v_employee
  from public.employees as employee
  where employee.id = v_invitation.employee_id
    and employee.organization_id = v_invitation.organization_id
  for update;

  if not found then
    raise exception 'Invitation is invalid or expired';
  end if;
  if v_employee.user_id is not null then
    raise exception 'Invitation already used';
  end if;
  if lower(btrim(coalesce(v_employee.email, ''))) <> v_email then
    raise exception 'Signed-in email does not match this invitation';
  end if;

  select exists (
    select 1
    from public.organization_members as member
    where member.user_id = v_user_id
      and member.organization_id <> v_invitation.organization_id
  )
  into v_other_membership;

  if v_other_membership then
    raise exception 'Account already belongs to another organization';
  end if;

  if exists (
    select 1
    from public.organization_members as member
    where member.user_id = v_user_id
      and member.organization_id = v_invitation.organization_id
      and member.role <> 'employee'
  ) then
    raise exception 'Account cannot join this employee invitation';
  end if;

  update public.employees
  set user_id = v_user_id
  where id = v_employee.id
    and organization_id = v_invitation.organization_id
    and user_id is null;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_invitation.organization_id, v_user_id, 'employee')
  on conflict (organization_id, user_id) do nothing;

  update public.employee_invitations
  set accepted_at = now()
  where id = v_invitation.id;

  return v_invitation.organization_id;
end;
$$;

revoke all on function public.accept_employee_invitation(text) from public, anon, authenticated;
grant execute on function public.accept_employee_invitation(text) to authenticated;

notify pgrst, 'reload schema';