-- Allow public read access to vagas when accessed via share links
-- This is needed for the share link functionality to work without authentication

CREATE POLICY "Public can view vagas via active share links"
ON vagas
FOR SELECT
TO public
USING (
  -- Check if there's an active share link for this vaga
  EXISTS (
    SELECT 1 FROM share_links
    WHERE share_links.vaga_id = vagas.id
    AND share_links.active = true
    AND (share_links.expires_at IS NULL OR share_links.expires_at > now())
  )
);