import { useMemo } from 'react';
import rolesCatalog from '@/data/roles_catalog.json';

interface Role {
  role_id: string;
  title: string;
  synonyms?: string[];
  category: string;
  seniority: string;
}

export function useRolesSynonyms() {
  const roles = useMemo(() => rolesCatalog as Role[], []);

  const findRoleByTitle = (title: string): Role | undefined => {
    const normalizedTitle = title.toLowerCase().trim();
    
    // Busca exata pelo título
    const exactMatch = roles.find(
      role => role.title.toLowerCase() === normalizedTitle
    );
    if (exactMatch) return exactMatch;

    // Busca por sinônimo
    const synonymMatch = roles.find(
      role => role.synonyms?.some(
        syn => syn.toLowerCase() === normalizedTitle
      )
    );
    if (synonymMatch) return synonymMatch;

    // Busca parcial pelo título
    const partialMatch = roles.find(
      role => role.title.toLowerCase().includes(normalizedTitle) ||
              normalizedTitle.includes(role.title.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // Busca parcial por sinônimo
    const partialSynonymMatch = roles.find(
      role => role.synonyms?.some(
        syn => syn.toLowerCase().includes(normalizedTitle) ||
               normalizedTitle.includes(syn.toLowerCase())
      )
    );
    
    return partialSynonymMatch;
  };

  const getSynonymsForRole = (title: string): string[] => {
    const role = findRoleByTitle(title);
    if (!role) return [];
    return role.synonyms || [];
  };

  const getAllSearchTerms = (title: string, additionalTerms: string[] = []): string[] => {
    const role = findRoleByTitle(title);
    const terms = new Set<string>();
    
    // Adicionar o título principal
    terms.add(title);
    
    // Adicionar sinônimos do catálogo
    if (role?.synonyms) {
      role.synonyms.forEach(syn => terms.add(syn));
    }
    
    // Adicionar termos adicionais do usuário
    additionalTerms.forEach(term => {
      if (term.trim()) terms.add(term.trim());
    });
    
    return Array.from(terms);
  };

  return {
    roles,
    findRoleByTitle,
    getSynonymsForRole,
    getAllSearchTerms
  };
}
