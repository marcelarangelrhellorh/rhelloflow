-- Adicionar foreign key de scorecard_templates.created_by para profiles.id
ALTER TABLE scorecard_templates
ADD CONSTRAINT fk_scorecard_templates_created_by
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;