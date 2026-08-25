-- 20260825000009_create_authority_tourist_directory_rpc.sql

CREATE OR REPLACE FUNCTION get_authority_tourist_directory()
RETURNS json
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.authority_profiles 
    WHERE public.authority_profiles.auth_user_id = auth.uid() 
    AND role IN ('AUTHORITY', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT t.*, au.email
      FROM public.tourists t
      LEFT JOIN auth.users au ON t.auth_user_id = au.id
    ) t
  );
END;
$$ LANGUAGE plpgsql;
