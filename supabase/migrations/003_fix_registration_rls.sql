alter table public.organizations
  add column if not exists created_by uuid references auth.users (id) on delete cascade;

alter table public.organizations
  alter column created_by set default auth.uid();

create schema if not exists cleanflow_private;
revoke all on schema cleanflow_private from public, anon, authenticated;
grant usage on schema cleanflow_private to authenticated;

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
