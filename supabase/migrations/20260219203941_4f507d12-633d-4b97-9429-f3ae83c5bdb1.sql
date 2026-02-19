DROP FUNCTION IF EXISTS public.get_profiles_with_email();

CREATE OR REPLACE FUNCTION public.get_profiles_with_email()
 RETURNS TABLE(id uuid, user_id uuid, display_name text, avatar_url text, is_purchase boolean, onboarding_completed boolean, product_ids text[], created_at timestamp with time zone, updated_at timestamp with time zone, email text, role text, is_access boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.is_purchase,
    p.onboarding_completed,
    p.product_ids,
    p.created_at,
    p.updated_at,
    u.email,
    r.role::text,
    p.is_access
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.user_roles r ON p.user_id = r.user_id
  ORDER BY p.created_at DESC;
$function$;