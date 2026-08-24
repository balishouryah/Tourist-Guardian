-- Stage 7C: Emergency Contacts Backend

CREATE TABLE emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id uuid REFERENCES tourists(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text,
  phone text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Note: In a fully authenticated architecture, the policy would look like:
-- CREATE POLICY "Users can manage their own emergency contacts"
-- ON emergency_contacts FOR ALL
-- USING ( tourist_id IN (SELECT id FROM tourists WHERE auth_user_id = auth.uid()) );

-- Enable Row Level Security
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- No public policies are created.
-- Default is DENY ALL for anonymous traffic.
-- The frontend gracefully falls back to local storage upon write denial.
