-- Stage 7D.5: Expand Tourist Profile

ALTER TABLE tourists
ADD COLUMN profile_photo_url text,
ADD COLUMN date_of_birth text,
ADD COLUMN gender text,
ADD COLUMN accessibility_notes text,
ADD COLUMN current_location_text text,
ADD COLUMN current_latitude double precision,
ADD COLUMN current_longitude double precision,
ADD COLUMN planned_destination text,
ADD COLUMN trip_start_date text,
ADD COLUMN trip_end_date text,
ADD COLUMN travel_purpose text,
ADD COLUMN home_city text,
ADD COLUMN home_country text,
ADD COLUMN blood_group text,
ADD COLUMN medical_notes text;
