-- Ensure RLS is enabled on the table (this command is idempotent)
-- ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
-- It's assumed RLS is already enabled as per standard Supabase setup.
-- If not, the CREATE POLICY commands would fail, so it's good practice
-- to have it, but often it's part of initial table setup.

-- Drop the existing general policy for authenticated users on availability, if it exists.
DROP POLICY IF EXISTS "Allow authenticated users to manage availability" ON public.availability;

-- Recreate the policy for authenticated users, now including the rate limit check for INSERT and UPDATE operations.
CREATE POLICY "Allow authenticated users to manage availability with rate limit check"
ON public.availability
FOR ALL -- This applies to SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (true) -- Basic condition for row visibility/applicability for SELECT, DELETE
WITH CHECK (
    CASE
        WHEN (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') -- Apply check only for INSERT and UPDATE operations
        THEN public.check_bulk_update_limit(auth.uid()::text)
        ELSE true -- For SELECT and DELETE, bypass this specific check
    END
);

-- Note: This migration assumes that `check_bulk_update_limit` function is available,
-- which should be true if migrations are run in order.
-- Also assumes `auth.uid()` is available in the context, which is standard for RLS policies in Supabase.

-- The policy "Allow public read access to availability" (FOR SELECT TO anon USING (true))
-- is assumed to exist and is not modified by this migration.
