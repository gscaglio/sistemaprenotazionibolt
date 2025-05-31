-- Update availability table RLS policy
DROP POLICY IF EXISTS "Allow authenticated users to manage availability" ON availability;

CREATE POLICY "Allow authenticated users to manage availability"
ON availability
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN current_setting('request.method', true) IN ('POST', 'PUT', 'PATCH', 'DELETE') THEN
      (SELECT true FROM check_bulk_update_limit(auth.uid()::text))
    ELSE true
  END
)
WITH CHECK (
  CASE 
    WHEN current_setting('request.method', true) IN ('POST', 'PUT', 'PATCH', 'DELETE') THEN
      (SELECT true FROM check_bulk_update_limit(auth.uid()::text))
    ELSE true
  END
);