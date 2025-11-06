-- Remove the 'Pausada' stage from vaga_status_ref table
DELETE FROM vaga_status_ref WHERE slug = 'pausada';

-- Update any existing vagas that might be in 'Pausada' status to 'Congelada'
-- Only update the new fields (status_slug and status_order), leave the enum field alone
UPDATE vagas 
SET status_slug = 'congelada',
    status_order = 11
WHERE status_slug = 'pausada';

-- Update job_stage_history to replace 'Pausada' references
UPDATE job_stage_history 
SET from_status = 'Congelada' 
WHERE from_status = 'Pausada';

UPDATE job_stage_history 
SET to_status = 'Congelada' 
WHERE to_status = 'Pausada';