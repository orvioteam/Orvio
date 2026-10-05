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
