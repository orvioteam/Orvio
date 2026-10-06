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
