# 🚀 Guia de Migração para React Query

Este guia mostra como migrar componentes existentes para usar React Query.

---

## 📋 Checklist de Migração

Para migrar um hook ou componente:

- [ ] Criar novo hook com sufixo `Query` (ex: `useVagaQuery.tsx`)
- [ ] Definir query keys hierárquicas
- [ ] Implementar função de fetch
- [ ] Configurar `useQuery` com opções
- [ ] Adicionar real-time listeners que invalidam queries
- [ ] Implementar mutations se necessário
- [ ] Adicionar optimistic updates onde faz sentido
- [ ] Re-exportar com nome original para migração gradual
- [ ] Atualizar componentes para usar novo hook
- [ ] Testar e validar

---

## 📖 Padrão de Migração

### 1️⃣ Hook Antigo (sem React Query)

```typescript
// hooks/data/useItems.tsx
export function useItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
    
    // Real-time
    const channel = supabase.channel('items')
      .on('postgres_changes', { ... }, () => {
        loadItems(); // ❌ Refetch completo
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('items').select('*');
    setItems(data || []);
    setLoading(false);
  };

  return { items, loading, reload: loadItems };
}
```

### 2️⃣ Hook Novo (com React Query)

```typescript
// hooks/data/useItemsQuery.tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// 1. Definir query keys
export const itemsKeys = {
  all: ["items"] as const,
  detail: (id: string) => [...itemsKeys.all, id] as const,
};

// 2. Função de fetch pura
async function fetchItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*");
  
  if (error) throw error;
  return data || [];
}

// 3. Hook com React Query
export function useItemsQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: itemsKeys.all,
    queryFn: fetchItems,
  });

  // 4. Real-time que invalida cache
  React.useEffect(() => {
    const channel = supabase
      .channel("items")
      .on("postgres_changes", { ... }, () => {
        queryClient.invalidateQueries({ queryKey: itemsKeys.all });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [queryClient]);

  return {
    items: query.data || [],
    loading: query.isLoading,
    error: query.error as Error | null,
    reload: query.refetch,
  };
}

// 5. Re-exportar para migração gradual
export { useItemsQuery as useItems };
```

---

## 🔄 Padrão para Mutations

### Criar Item

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newItem: Item) => {
      const { data, error } = await supabase
        .from("items")
        .insert([newItem])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalida lista para refetch
      queryClient.invalidateQueries({ queryKey: itemsKeys.all });
    },
  });
}

// Uso no componente
function MyComponent() {
  const createItem = useCreateItem();

  const handleCreate = () => {
    createItem.mutate({
      name: "New Item",
      description: "..."
    });
  };

  return (
    <button 
      onClick={handleCreate}
      disabled={createItem.isPending}
    >
      {createItem.isPending ? "Criando..." : "Criar"}
    </button>
  );
}
```

### Update Item (com Optimistic Update)

```typescript
export function useUpdateItem(itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Item>) => {
      const { error } = await supabase
        .from("items")
        .update(updates)
        .eq("id", itemId);
      
      if (error) throw error;
    },
    onMutate: async (updates) => {
      // 1. Cancela refetches
      await queryClient.cancelQueries({ 
        queryKey: itemsKeys.detail(itemId) 
      });

      // 2. Snapshot
      const previous = queryClient.getQueryData(
        itemsKeys.detail(itemId)
      );

      // 3. Optimistic update
      queryClient.setQueryData(
        itemsKeys.detail(itemId),
        (old: Item) => ({ ...old, ...updates })
      );

      return { previous };
    },
    onError: (err, updates, context) => {
      // Rollback
      queryClient.setQueryData(
        itemsKeys.detail(itemId),
        context?.previous
      );
    },
    onSettled: () => {
      // Refetch para garantir
      queryClient.invalidateQueries({ 
        queryKey: itemsKeys.detail(itemId) 
      });
    },
  });
}
```

### Delete Item

```typescript
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalida lista completa
      queryClient.invalidateQueries({ queryKey: itemsKeys.all });
    },
  });
}
```

---

## 🎯 Padrões de Query Keys

### Hierarquia Recomendada

```typescript
export const entityKeys = {
  // Lista tudo
  all: ["entities"] as const,
  
  // Lista com filtros
  lists: () => [...entityKeys.all, "list"] as const,
  list: (filters: string) => [...entityKeys.lists(), filters] as const,
  
  // Detalhes
  details: () => [...entityKeys.all, "detail"] as const,
  detail: (id: string) => [...entityKeys.details(), id] as const,
  
  // Relacionamentos
  related: (id: string, relation: string) => 
    [...entityKeys.detail(id), relation] as const,
};

// Exemplos de uso:
// ["entities"] - Invalida tudo
// ["entities", "list"] - Invalida todas as listas
// ["entities", "list", "active=true"] - Invalida lista específica
// ["entities", "detail", "123"] - Invalida item específico
// ["entities", "detail", "123", "comments"] - Invalida comentários do item
```

### Invalidação Inteligente

```typescript
// Invalida TODAS as queries de entities
queryClient.invalidateQueries({ queryKey: entityKeys.all });

// Invalida APENAS listas (não detalhes)
queryClient.invalidateQueries({ queryKey: entityKeys.lists() });

// Invalida item específico
queryClient.invalidateQueries({ queryKey: entityKeys.detail(id) });

// Invalida com exact match
queryClient.invalidateQueries({ 
  queryKey: entityKeys.detail(id),
  exact: true 
});
```

---

## 🔥 Dicas e Boas Práticas

### 1. Sempre use Query Keys Tipadas

```typescript
// ✅ Bom
export const vagaKeys = {
  all: ["vagas"] as const,
  detail: (id: string) => [...vagaKeys.all, id] as const,
};

// ❌ Ruim
const key = ["vagas", id]; // Sem tipagem
```

### 2. Separe Lógica de Fetch

```typescript
// ✅ Bom - função pura
async function fetchVaga(id: string) {
  const { data, error } = await supabase
    .from("vagas")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return data;
}

// Hook usa a função
export function useVaga(id: string) {
  return useQuery({
    queryKey: vagaKeys.detail(id),
    queryFn: () => fetchVaga(id),
  });
}
```

### 3. Configure `enabled` para Conditional Queries

```typescript
// ✅ Bom - só busca se tiver ID
export function useVaga(id: string | undefined) {
  return useQuery({
    queryKey: vagaKeys.detail(id!),
    queryFn: () => fetchVaga(id!),
    enabled: !!id, // 👈 Previne query sem ID
  });
}
```

### 4. Use Optimistic Updates Estrategicamente

```typescript
// ✅ Use para: Likes, Toggles, Updates simples
// ❌ Evite para: Operações complexas, Criações

// Bom caso de uso
const toggleLike = useMutation({
  mutationFn: async () => { ... },
  onMutate: async () => {
    // Update instantâneo no cache
    queryClient.setQueryData(key, (old) => ({
      ...old,
      liked: !old.liked,
      likes: old.liked ? old.likes - 1 : old.likes + 1
    }));
  }
});
```

### 5. Combine Real-time com Invalidation

```typescript
useEffect(() => {
  const channel = supabase
    .channel('updates')
    .on('postgres_changes', { ... }, (payload) => {
      // Opção 1: Invalidar e refetch
      queryClient.invalidateQueries({ queryKey: ['items'] });
      
      // Opção 2: Update direto no cache (mais rápido)
      queryClient.setQueryData(['items', payload.new.id], payload.new);
    })
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, [queryClient]);
```

---

## 📊 Ordem de Migração Recomendada

1. ✅ **Hooks de dados base** (useVaga, useCandidatos) - FEITO
2. 🔲 **Hooks de detalhes** (useCandidatoDetalhes, useVagaDetalhes)
3. 🔲 **Listas e filtros** (useCandidatosList, useVagasList)
4. 🔲 **Mutations** (criar, editar, deletar)
5. 🔲 **Features avançadas** (search, analytics)

---

## 🐛 Debugging com DevTools

```typescript
// src/App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MyApp />
      {/* Só em dev */}
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

---

## ✅ Checklist Final

Antes de considerar a migração completa:

- [ ] Todos os hooks principais migrados
- [ ] Real-time funcionando com invalidation
- [ ] Optimistic updates implementados onde faz sentido
- [ ] Query keys organizadas hierarquicamente
- [ ] Mutations com tratamento de erro
- [ ] Loading e error states tratados
- [ ] DevTools testadas
- [ ] Performance melhorada (verificar Network tab)
- [ ] Cache funcionando entre navegações
- [ ] Documentação atualizada

---

## 📚 Referências Úteis

- [React Query Docs](https://tanstack.com/query/latest)
- [Query Keys Guide](https://tkdodo.eu/blog/effective-react-query-keys)
- [Optimistic Updates](https://tkdodo.eu/blog/optimistic-updates-in-react-query)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
