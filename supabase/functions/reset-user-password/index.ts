import { createClient } from "npm:@supabase/supabase-js@2";
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const restrictedCors = getRestrictedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: restrictedCors });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error('Unauthorized');
    }

    // Check if requesting user is admin
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    if (roleError || !roles?.some(r => r.role === 'admin')) {
      throw new Error('Only admins can reset passwords');
    }

    // Get user ID and new password from request
    const { userId, newPassword } = await req.json();
    
    if (!userId || !newPassword) {
      throw new Error('User ID and new password are required');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );
    
    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset successfully' }),
      { headers: { ...restrictedCors, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error resetting password:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...restrictedCors, 'Content-Type': 'application/json' }
      }
    );
  }
});