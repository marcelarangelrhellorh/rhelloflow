import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { getApiErrorCode } from "./lib/errorHandler";
import { CACHE_TIMES } from "./lib/queryConfig";

// Configure React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIMES.DEFAULT.staleTime, // 5 minutes
      gcTime: CACHE_TIMES.DEFAULT.gcTime, // 30 minutes
      refetchOnWindowFocus: true, // Revalidar ao focar janela (melhor UX)
      refetchOnReconnect: true, // Revalidar ao reconectar
      retry: (failureCount, error) => {
        // Não retry em erros de auth ou forbidden
        const code = getApiErrorCode(error);
        if (code === 'AUTH' || code === 'FORBIDDEN' || code === 'NOT_FOUND') {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
