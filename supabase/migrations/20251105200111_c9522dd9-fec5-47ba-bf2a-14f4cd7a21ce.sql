-- Allow public read access to share_links when accessed by token
-- This is needed so the get-share-link edge function can work without authentication
DROP POLICY IF EXISTS "Authenticated users can view share links" ON share_links;

-- Create a new policy that allows public access to active share links
CREATE POLICY "Public can view active share links by token"
ON share_links
FOR SELECT
TO public
USING (active = true);

-- Keep the authenticated users policy for broader access
CREATE POLICY "Authenticated users can view all share links"
ON share_links
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);