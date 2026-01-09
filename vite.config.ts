import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['quill'],
  },
  optimizeDeps: {
    include: ['quill', 'react-quill', 'quill-mention'],
  },
  build: {
    outDir: 'dist',
    // Bundle optimization - FASE 2.2
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separate React and core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          'vendor-charts': ['recharts'],
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'date-fns'],
          // Heavy libraries - lazy loaded
          'vendor-calendar': ['react-big-calendar'],
          'vendor-excel': ['xlsx'],
          'vendor-pdf': ['jspdf'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
    // Chunk size warning threshold (KB)
    chunkSizeWarningLimit: 1000,
    // Minification with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.log in production
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
      },
      format: {
        comments: false, // Remove comments
      },
    },
    // Enable source maps for debugging (only in dev)
    sourcemap: mode !== 'production',
  },
}));
