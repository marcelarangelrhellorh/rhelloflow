-- Alterar o enum status_candidato para substituir "Triado para a vaga" por "Selecionado"
ALTER TYPE status_candidato RENAME VALUE 'Triado para a vaga' TO 'Selecionado';