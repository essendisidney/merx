-- Team: add members by email + list/update/deactivate

create or replace function public.add_business_member(
  p_business_id uuid,
  p_email text,
  p_role public.staff_role default 'sales'
)
returns public.business_members
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  main_branch uuid;
  result public.business_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_business_role(p_business_id, array['admin'::public.staff_role]) then
    raise exception 'Only admins can add team members';
  end if;

  if p_role = 'admin' and not public.has_business_role(p_business_id, array['admin'::public.staff_role]) then
    raise exception 'Only admins can assign admin role';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No Merx account found for %. Ask them to sign up first, then add them again.', trim(p_email);
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You are already a member of this business';
  end if;

  select id into main_branch
  from public.branches
  where business_id = p_business_id and is_main = true
  limit 1;

  insert into public.business_members (business_id, user_id, role, branch_id, is_active)
  values (p_business_id, target_user_id, p_role, main_branch, true)
  on conflict (business_id, user_id) do update
    set role = excluded.role,
        is_active = true,
        branch_id = coalesce(public.business_members.branch_id, excluded.branch_id)
  returning * into result;

  return result;
end;
$$;

create or replace function public.update_business_member_role(
  p_member_id uuid,
  p_role public.staff_role
)
returns public.business_members
language plpgsql
security definer
set search_path = public
as $$
declare
  member public.business_members;
  result public.business_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into member
  from public.business_members
  where id = p_member_id;

  if member.id is null then
    raise exception 'Member not found';
  end if;

  if not public.has_business_role(member.business_id, array['admin'::public.staff_role]) then
    raise exception 'Only admins can change roles';
  end if;

  if member.user_id = auth.uid() and p_role is distinct from 'admin' then
    raise exception 'You cannot remove your own admin role';
  end if;

  update public.business_members
  set role = p_role
  where id = p_member_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.deactivate_business_member(
  p_member_id uuid
)
returns public.business_members
language plpgsql
security definer
set search_path = public
as $$
declare
  member public.business_members;
  result public.business_members;
  admin_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into member
  from public.business_members
  where id = p_member_id;

  if member.id is null then
    raise exception 'Member not found';
  end if;

  if not public.has_business_role(member.business_id, array['admin'::public.staff_role]) then
    raise exception 'Only admins can remove team members';
  end if;

  if member.user_id = auth.uid() then
    raise exception 'You cannot remove yourself';
  end if;

  if member.role = 'admin' then
    select count(*) into admin_count
    from public.business_members
    where business_id = member.business_id
      and role = 'admin'
      and is_active = true;
    if admin_count <= 1 then
      raise exception 'Cannot remove the last admin';
    end if;
  end if;

  update public.business_members
  set is_active = false
  where id = p_member_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.list_business_members(
  p_business_id uuid
)
returns table (
  id uuid,
  user_id uuid,
  role public.staff_role,
  is_active boolean,
  full_name text,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Not a member of this business';
  end if;

  return query
  select
    m.id,
    m.user_id,
    m.role,
    m.is_active,
    p.full_name,
    u.email::text,
    m.created_at
  from public.business_members m
  left join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.business_id = p_business_id
  order by m.created_at asc;
end;
$$;

revoke all on function public.add_business_member(uuid, text, public.staff_role) from public, anon;
revoke all on function public.update_business_member_role(uuid, public.staff_role) from public, anon;
revoke all on function public.deactivate_business_member(uuid) from public, anon;
revoke all on function public.list_business_members(uuid) from public, anon;

grant execute on function public.add_business_member(uuid, text, public.staff_role) to authenticated;
grant execute on function public.update_business_member_role(uuid, public.staff_role) to authenticated;
grant execute on function public.deactivate_business_member(uuid) to authenticated;
grant execute on function public.list_business_members(uuid) to authenticated;
