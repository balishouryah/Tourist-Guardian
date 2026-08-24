-- Stage 7D: Authentication & RLS Policies

-- 1. Ensure auth_user_id is strictly unique so one auth account = one tourist profile.
ALTER TABLE tourists ADD CONSTRAINT tourists_auth_user_id_key UNIQUE (auth_user_id);

-- 2. Drop any previous existing policies on tourists if they exist
DROP POLICY IF EXISTS "Users can manage their own profile" ON tourists;

-- 3. Create RLS policies for tourists
CREATE POLICY "Users can manage their own profile"
ON tourists
FOR ALL
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- 4. Drop any previous existing policies on emergency_contacts
DROP POLICY IF EXISTS "Users can manage their own emergency contacts" ON emergency_contacts;

-- 5. Create RLS policies for emergency_contacts
CREATE POLICY "Users can manage their own emergency contacts"
ON emergency_contacts
FOR ALL
USING (
  tourist_id IN (
    SELECT id FROM tourists WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  tourist_id IN (
    SELECT id FROM tourists WHERE auth_user_id = auth.uid()
  )
);
