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
  created_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations
  add column if not exists created_by uuid references auth.users (id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'manager', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

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

drop policy if exists "Users can create organizations" on public.organizations;
drop policy if exists "Users can view their own organization" on public.organizations;
drop policy if exists "Users can view their own organization data" on public.organizations;
drop policy if exists "Users can update their own organization" on public.organizations;
drop policy if exists "Users can create their own organization membership" on public.organization_members;
drop policy if exists "Users can view their own organization members" on public.organization_members;
drop policy if exists "Users can manage their own members" on public.organization_members;
drop policy if exists "Users can manage their own organization members" on public.organization_members;
drop policy if exists "Users can delete their own organization membership" on public.organization_members;
drop policy if exists "Users can delete their own organization members" on public.organization_members;
drop policy if exists "Users can manage their own customers" on public.customers;
drop policy if exists "Users can manage their own employees" on public.employees;
drop policy if exists "Users can manage their own jobs" on public.jobs;

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

create policy "Users can delete their own organization membership"
on public.organization_members
for delete
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
