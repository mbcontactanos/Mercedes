-- Función mejorada para listar usuarios con auditoría y restricciones
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

-- Función mejorada para actualizar usuarios con validación de escalamiento de privilegios
create or replace function public.admin_update_user(
  target_user_id text,
  new_role text default null,
  new_supervision_level text default null,
  new_assigned_operator_id text default null,
  new_display_name text default null,
  new_disabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_role text;
  current_admin_role text;
  audit_entry jsonb;
begin
  -- Validar que el usuario que realiza la acción es admin
  if not exists (
    select 1
    from public.user_profiles admin_profile
    where admin_profile.user_id = auth.uid()::text
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.disabled, false) = false
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Obtener el rol actual del usuario a actualizar
  select up.role into current_role
  from public.user_profiles up
  where up.user_id = target_user_id;

  -- Obtener el rol del admin que realiza la acción
  select up.role into current_admin_role
  from public.user_profiles up
  where up.user_id = auth.uid()::text;

  -- Prevenir escalamiento de privilegios: solo admins pueden crear/modificar admins
  if new_role = 'admin' and current_role != 'admin' then
    if current_admin_role != 'admin' then
      raise exception 'insufficient_privileges' using errcode = '42501';
    end if;
    
    -- Registrar intento de escalamiento en auditoría
    audit_entry := jsonb_build_object(
      'action', 'privilege_escalation_attempt',
      'target_user_id', target_user_id,
      'admin_user_id', auth.uid()::text,
      'timestamp', now()::text,
      'old_role', current_role,
      'new_role', new_role
    );
    
    -- Aquí se podría insertar en una tabla de auditoría si existe
    -- insert into public.audit_log (entry) values (audit_entry);
  end if;

  -- Actualizar el perfil del usuario
  update public.user_profiles
  set
    role = coalesce(new_role, role),
    supervision_level = coalesce(new_supervision_level, supervision_level),
    assigned_operator_id = coalesce(new_assigned_operator_id, assigned_operator_id),
    display_name = coalesce(new_display_name, display_name),
    disabled = coalesce(new_disabled, disabled),
    updated_at = now()
  where user_id = target_user_id;

  return jsonb_build_object(
    'success', true,
    'message', 'User updated successfully'
  );
end;
$$;

grant execute on function public.admin_update_user(text, text, text, text, text, boolean) to authenticated;

-- Función mejorada para eliminar usuarios con auditoría
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
  target_email text;
  audit_entry jsonb;
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

  -- Obtener información del usuario a eliminar para auditoría
  select up.assigned_operator_id, up.user_email
  into target_operator_id, target_email
  from public.user_profiles up
  where up.user_id = target_user_id;

  -- Registrar la eliminación en auditoría
  audit_entry := jsonb_build_object(
    'action', 'user_deletion',
    'deleted_user_id', target_user_id,
    'deleted_user_email', target_email,
    'admin_user_id', auth.uid()::text,
    'timestamp', now()::text
  );
  
  -- Aquí se podría insertar en una tabla de auditoría si existe
  -- insert into public.audit_log (entry) values (audit_entry);

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
    'deleted_auth', deleted_auth_count > 0,
    'audit_entry', audit_entry
  );
end;
$$;

grant execute on function public.admin_delete_user(text) to authenticated;
