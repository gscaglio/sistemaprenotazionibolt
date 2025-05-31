/*
  # Enable Row Level Security and Add Policies

  1. Security Changes
    - Enable RLS on all tables (rooms, availability, bookings, settings)
    - Add policies for authenticated users to manage all data
    - Add policies for anonymous users to read room and availability data
  
  2. Changes
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Allow authenticated users to manage rooms"
ON rooms
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public read access to rooms"
ON rooms
FOR SELECT
TO anon
USING (active = true);

-- Availability policies
CREATE POLICY "Allow authenticated users to manage availability"
ON availability
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public read access to availability"
ON availability
FOR SELECT
TO anon
USING (true);

-- Bookings policies
CREATE POLICY "Allow authenticated users to manage bookings"
ON bookings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public to create bookings"
ON bookings
FOR INSERT
TO anon
WITH CHECK (true);

-- Settings policies
CREATE POLICY "Allow authenticated users to manage settings"
ON settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);