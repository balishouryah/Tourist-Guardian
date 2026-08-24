-- Add last_location_update timestamp to tourists table
ALTER TABLE public.tourists
ADD COLUMN last_location_update timestamp with time zone;

-- Enable Realtime for tourists table to broadcast live location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tourists;
