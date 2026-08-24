-- Stage 7B: Tourist Profile Database Foundation

CREATE TABLE tourists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid, -- Nullable pending Stage 7 Auth integration
  safety_id text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  nationality text,
  preferred_language text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE tourists ENABLE ROW LEVEL SECURITY;

-- Note: We are intentionally NOT creating an insecure public policy.
-- The tourists table defaults to "DENY ALL" for anonymous access.
-- This ensures strict security until authentication is implemented.
-- The frontend will gracefully fall back to local demo mode when the backend correctly denies anonymous writes.
