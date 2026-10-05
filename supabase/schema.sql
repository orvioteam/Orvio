create extension if not exists "uuid-ossp";

create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner' check (role in ('owner', 'manager', 'admin')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

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
  customer_id uuid not null references public.customers (id) on delete restrict,
  employee_id uuid references public.employees (id) on delete set null,
  title text not null,
  description text,
  date date not null,
  start_time time not null,
  end_time time,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
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

alter table public.customers enable row level security;
alter table public.employees enable row level security;
alter table public.jobs enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "Users can view their own organization data" on public.organizations
for select using (
  id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
);

create policy "Users can update their own organization" on public.organizations
for update using (
  id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
);

create policy "Users can view their own organization members" on public.organization_members
for select using (
  organization_id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
);

create policy "Users can manage their own customers" on public.customers
for all using (
  organization_id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
) with check (
  organization_id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
);

create policy "Users can manage their own employees" on public.employees
for all using (
  organization_id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
) with check (
  organization_id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
);

create policy "Users can manage their own jobs" on public.jobs
for all using (
  organization_id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
) with check (
  organization_id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger customers_updated_at
before update on public.customers
for each row execute function public.update_updated_at_column();

create trigger employees_updated_at
before update on public.employees
for each row execute function public.update_updated_at_column();

create trigger jobs_updated_at
before update on public.jobs
for each row execute function public.update_updated_at_column();
