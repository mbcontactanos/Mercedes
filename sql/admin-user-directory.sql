create or replace function public.admin_list_users()
returns table(
  user_id text,
  display_name text,
  role text,
  supervision_level text,
  assigned_operator_id text,
  user_email text,
  disabled boolean,
  email_verified boolean,
  has_profile boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.user_profiles admin_profile
    where admin_profile.user_id = auth.uid()::text
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.disabled, false) = false
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    au.id::text as user_id,
    coalesce(
      nullif(btrim(up.display_name), ''),
      nullif(btrim(au.profile ->> 'name'), ''),
      split_part(au.email, '@', 1),
      au.id::text
    ) as display_name,
    case
      when up.role is not null then up.role
      when coalesce(au.is_project_admin, false) then 'admin'
      else 'operator'
    end as role,
    coalesce(
      up.supervision_level,
      case
        when coalesce(au.is_project_admin, false) then 'full'
        else 'standard'
      end
    ) as supervision_level,
    coalesce(up.assigned_operator_id, '') as assigned_operator_id,
    lower(
      coalesce(
        nullif(btrim(up.user_email), ''),
        nullif(btrim(au.email), ''),
        ''
      )
    ) as user_email,
    coalesce(up.disabled, false) as disabled,
    coalesce(au.email_verified, false) as email_verified,
    (up.user_id is not null) as has_profile,
    au.created_at,
    greatest(au.updated_at, coalesce(up.updated_at, au.updated_at)) as updated_at
  from auth.users au
  left join public.user_profiles up on up.user_id = au.id::text
  where not coalesce(au.is_anonymous, false)
  order by au.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_delete_user(target_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target_operator_id text;
  deleted_profile_count integer := 0;
  deleted_auth_count integer := 0;
begin
  if target_user_id is null or btrim(target_user_id) = '' then
    raise exception 'missing_user_id' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.user_profiles admin_profile
    where admin_profile.user_id = auth.uid()::text
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.disabled, false) = false
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if auth.uid()::text = target_user_id then
    raise exception 'cannot_delete_self' using errcode = '22023';
  end if;

  select up.assigned_operator_id
  into target_operator_id
  from public.user_profiles up
  where up.user_id = target_user_id;

  delete from public.approval_requests where requester_user_id = target_user_id;
  delete from public.approval_requests where decided_by_user_id = target_user_id;

  if target_operator_id is not null and btrim(target_operator_id) <> '' then
    delete from public.approval_requests where assigned_operator_id = target_operator_id;
  end if;

  delete from public.user_profiles where user_id = target_user_id;
  get diagnostics deleted_profile_count = row_count;

  delete from auth.users where id = target_user_id::uuid;
  get diagnostics deleted_auth_count = row_count;

  return jsonb_build_object(
    'deleted', (deleted_profile_count > 0 or deleted_auth_count > 0),
    'deleted_profile', deleted_profile_count > 0,
    'deleted_auth', deleted_auth_count > 0
  );
end;
$$;

grant execute on function public.admin_delete_user(text) to authenticated;
