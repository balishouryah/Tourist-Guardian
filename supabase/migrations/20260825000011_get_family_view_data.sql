-- 20260825000011_get_family_view_data.sql

CREATE OR REPLACE FUNCTION public.get_family_view_data(p_token text)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
  v_tourist_id uuid;
  v_tracking_enabled boolean;
  v_tourist_data json;
  v_incidents_data json;
BEGIN
  -- 1. Find the active family tracking access record
  SELECT tourist_id INTO v_tourist_id
  FROM public.family_tracking_access
  WHERE access_token = p_token AND status = 'ACTIVE';

  IF v_tourist_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid or inactive token.');
  END IF;

  -- 2. Check if the tourist has family tracking enabled
  SELECT family_tracking_enabled INTO v_tracking_enabled
  FROM public.tourists
  WHERE id = v_tourist_id;

  IF NOT v_tracking_enabled THEN
    RETURN json_build_object('error', 'Tracking disabled by tourist.');
  END IF;

  -- 3. Gather permitted tourist data
  SELECT row_to_json(t) INTO v_tourist_data
  FROM (
    SELECT 
      name, 
      safety_id, 
      current_latitude, 
      current_longitude, 
      current_safety_score, 
      current_safety_severity,
      current_location_text,
      last_location_update
    FROM public.tourists
    WHERE id = v_tourist_id
  ) t;

  -- 4. Check for active SOS incidents for this tourist
  SELECT json_agg(row_to_json(i)) INTO v_incidents_data
  FROM (
    SELECT status, severity, incident_type, created_at
    FROM public.incidents
    WHERE tourist_id = v_tourist_id AND status = 'ACTIVE' AND incident_type = 'SOS'
  ) i;

  RETURN json_build_object(
    'tourist', v_tourist_data,
    'sos_active', v_incidents_data IS NOT NULL,
    'incidents', COALESCE(v_incidents_data, '[]'::json)
  );

END;
$$ LANGUAGE plpgsql;

-- Allow anonymous and authenticated to call it
GRANT EXECUTE ON FUNCTION public.get_family_view_data(text) TO public;
GRANT EXECUTE ON FUNCTION public.get_family_view_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_family_view_data(text) TO authenticated;
