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
  v_membership_role text;
  v_other_membership boolean;
  v_employee_id uuid;
  v_affected_rows integer;
begin
  if v_user_id is null then
    raise exception using
      message = 'AUTH: Authentication required',
      detail = 'The authenticated user context is missing.',
      hint = 'Sign in with the email address invited to this organization.';
  end if;
  if p_token is null or length(p_token) <> 64 or p_token !~ '^[a-f0-9]{64}$' then
    raise exception using
      message = 'INVITE_ACCEPT: Invitation is invalid or expired',
      detail = 'The invitation token format is invalid.',
      hint = 'Reopen the original invitation link or request a new invitation.';
  end if;

  select invitation.employee_id
  into v_employee_id
  from public.employee_invitations as invitation
  where invitation.token_hash = cleanflow_private.hash_invitation_token(p_token);

  if v_employee_id is null then
    raise exception using
      message = 'INVITE_ACCEPT: Invitation is invalid or expired',
      detail = 'No invitation matched the supplied token hash.',
      hint = 'Check that the invitation has not expired or been replaced.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_employee_id::text, 0));

  select invitation.*
  into v_invitation
  from public.employee_invitations as invitation
  where invitation.token_hash = cleanflow_private.hash_invitation_token(p_token)
  for update;

  if not found then
    raise exception using
      message = 'INVITE_ACCEPT: Invitation is invalid or expired',
      detail = 'The invitation disappeared before it could be locked.',
      hint = 'Request a new invitation from the organization owner.';
  end if;

  select employee.*
  into v_employee
  from public.employees as employee
  where employee.id = v_invitation.employee_id
    and employee.organization_id = v_invitation.organization_id
  for update;

  if not found then
    raise exception using
      message = 'EMPLOYEE_LINK: Employee does not belong to the invitation organization',
      detail = 'The employee and invitation organization identifiers do not match.',
      hint = 'Ask the organization owner to verify the employee record.';
  end if;
  if v_employee.user_id is not null and v_employee.user_id <> v_user_id then
    raise exception using
      message = 'EMPLOYEE_LINK: Employee is already linked to another account',
      detail = 'The employee record is linked to a different authenticated user.',
      hint = 'Ask the organization owner to correct the employee account link.';
  end if;
  if lower(btrim(coalesce(v_employee.email, ''))) <> v_email then
    raise exception using
      message = 'INVITE_ACCEPT: Signed-in email does not match this invitation',
      detail = 'The authenticated email does not match the employee email on the invitation.',
      hint = 'Sign in using the email address the invitation was sent to.';
  end if;

  if v_invitation.accepted_at is not null then
    if v_employee.user_id is distinct from v_user_id then
      raise exception using
        message = 'INVITE_ACCEPT: Invitation already used',
        detail = 'The invitation has already been accepted by another or unlinked account.',
        hint = 'Ask the organization owner to issue a new invitation if needed.';
    end if;

    select member.role
    into v_membership_role
    from public.organization_members as member
    where member.organization_id = v_invitation.organization_id
      and member.user_id = v_user_id;

    if v_membership_role = 'employee' then
      return v_invitation.organization_id;
    end if;
  elsif v_invitation.expires_at <= now() then
    raise exception using
      message = 'INVITE_ACCEPT: Invitation is invalid or expired',
      detail = 'The invitation expiry timestamp has passed.',
      hint = 'Ask the organization owner to create a new invitation.';
  end if;

  select exists (
    select 1
    from public.organization_members as member
    where member.user_id = v_user_id
      and member.organization_id <> v_invitation.organization_id
  )
  into v_other_membership;

  if v_other_membership then
    raise exception using
      message = 'MEMBERSHIP: Account already belongs to another organization',
      detail = 'Employee invitation acceptance is restricted to the invited organization.',
      hint = 'Use an account that is not linked to another organization.';
  end if;

  if exists (
    select 1
    from public.organization_members as member
    where member.user_id = v_user_id
      and member.organization_id = v_invitation.organization_id
      and member.role <> 'employee'
  ) then
    raise exception using
      message = 'MEMBERSHIP: Account already has a non-employee role in this organization',
      detail = 'An existing owner membership cannot be converted by an invitation.',
      hint = 'Ask the organization owner to review the account membership.';
  end if;

  if v_employee.user_id is null then
    begin
      update public.employees
      set user_id = v_user_id
      where id = v_employee.id
        and organization_id = v_invitation.organization_id
        and user_id is null;
      get diagnostics v_affected_rows = row_count;
    exception when others then
      raise exception using
        message = 'EMPLOYEE_LINK: Employee account could not be linked',
        detail = sqlerrm,
        hint = 'Verify that the employee record is not linked to another account.';
    end;
    if v_affected_rows <> 1 then
      raise exception using
        message = 'EMPLOYEE_LINK: Employee account could not be linked',
        detail = 'The employee row was not updated after it had been locked.',
        hint = 'Request a new invitation after verifying the employee record.';
    end if;
  end if;

  begin
    insert into public.organization_members (organization_id, user_id, role)
    values (v_invitation.organization_id, v_user_id, 'employee')
    on conflict (organization_id, user_id) do nothing;
  exception when others then
    raise exception using
      message = 'MEMBERSHIP: Employee membership could not be created',
      detail = sqlerrm,
      hint = 'Check membership constraints and whether this account already has an organization role.';
  end;

  select member.role
  into v_membership_role
  from public.organization_members as member
  where member.organization_id = v_invitation.organization_id
    and member.user_id = v_user_id;

  if v_membership_role is distinct from 'employee' then
    raise exception using
      message = 'MEMBERSHIP: Employee membership was not created',
      detail = 'No employee membership exists for the authenticated user after insertion.',
      hint = 'Check the membership table constraints and deployed migration version.';
  end if;

  update public.employee_invitations
  set accepted_at = coalesce(accepted_at, now())
  where id = v_invitation.id;

  return v_invitation.organization_id;
end;
$$;

revoke all on function public.accept_employee_invitation(text) from public, anon, authenticated;
grant execute on function public.accept_employee_invitation(text) to authenticated;

notify pgrst, 'reload schema';
