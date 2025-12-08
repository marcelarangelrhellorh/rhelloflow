// Public CORS headers - for endpoints that need wide access (job forms, share applications)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed origins for restricted endpoints
const allowedOrigins = [
  'https://feclxfhohmovmxqxyexz.lovable.app',
  'https://rhello.lovable.app',
];

// Add preview URLs pattern
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) return true;
  
  // Allow Lovable preview URLs
  if (origin.match(/^https:\/\/[a-z0-9]+-preview--[a-z0-9-]+\.lovable\.app$/)) return true;
  
  // Allow localhost for development
  if (origin.startsWith('http://localhost:')) return true;
  
  return false;
};

// Restricted CORS headers - for admin/sensitive operations
export const getRestrictedCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
};
