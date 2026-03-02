-- Reset mot de passe utilisateur (super_admin only)
-- À exécuter dans le SQL Editor de Supabase Dashboard

CREATE OR REPLACE FUNCTION public.sa_reset_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  v_caller_role text;
BEGIN
  -- Vérifier que l'appelant est super_admin
  SELECT role::text INTO v_caller_role
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: super_admin only';
  END IF;

  -- Validation longueur minimale
  IF length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;

  -- Mise à jour directe du mot de passe dans auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$func$;
