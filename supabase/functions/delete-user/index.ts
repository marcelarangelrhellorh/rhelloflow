import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      throw new Error('Only admins can delete users');
    }

    // Get user ID to delete from request
    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Prevent self-deletion
    if (userId === requestingUser.id) {
      throw new Error('You cannot delete your own account');
    }

    console.log(`Starting deletion process for user: ${userId}`);

    // Step 1: Clean up related data in order of dependencies
    
    // Delete notifications
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    
    if (notifError) {
      console.error('Error deleting notifications:', notifError);
    } else {
      console.log('✓ Deleted notifications');
    }

    // Delete user_roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (rolesError) {
      console.error('Error deleting user_roles:', rolesError);
    } else {
      console.log('✓ Deleted user_roles');
    }

    // Delete feedback_requests
    const { error: feedbackReqError } = await supabaseAdmin
      .from('feedback_requests')
      .delete()
      .eq('recrutador_id', userId);
    
    if (feedbackReqError) {
      console.error('Error deleting feedback_requests:', feedbackReqError);
    } else {
      console.log('✓ Deleted feedback_requests');
    }

    // Delete feedbacks authored by user
    const { error: feedbacksError } = await supabaseAdmin
      .from('feedbacks')
      .delete()
      .eq('author_user_id', userId);
    
    if (feedbacksError) {
      console.error('Error deleting feedbacks:', feedbacksError);
    } else {
      console.log('✓ Deleted feedbacks');
    }

    // Delete scorecards evaluated by user
    const { error: scorecardsError } = await supabaseAdmin
      .from('candidate_scorecards')
      .delete()
      .eq('evaluator_id', userId);
    
    if (scorecardsError) {
      console.error('Error deleting scorecards:', scorecardsError);
    } else {
      console.log('✓ Deleted scorecards');
    }

    // Delete scorecard templates created by user
    const { error: templatesError } = await supabaseAdmin
      .from('scorecard_templates')
      .delete()
      .eq('created_by', userId);
    
    if (templatesError) {
      console.error('Error deleting scorecard_templates:', templatesError);
    } else {
      console.log('✓ Deleted scorecard_templates');
    }

    // Delete import logs
    const { error: importLogsError } = await supabaseAdmin
      .from('import_logs')
      .delete()
      .eq('created_by', userId);
    
    if (importLogsError) {
      console.error('Error deleting import_logs:', importLogsError);
    } else {
      console.log('✓ Deleted import_logs');
    }

    // Delete PDF imports
    const { error: pdfImportsError } = await supabaseAdmin
      .from('pdf_imports')
      .delete()
      .eq('created_by', userId);
    
    if (pdfImportsError) {
      console.error('Error deleting pdf_imports:', pdfImportsError);
    } else {
      console.log('✓ Deleted pdf_imports');
    }

    // Delete share links created by user
    const { error: shareLinksError } = await supabaseAdmin
      .from('share_links')
      .delete()
      .eq('created_by', userId);
    
    if (shareLinksError) {
      console.error('Error deleting share_links:', shareLinksError);
    } else {
      console.log('✓ Deleted share_links');
    }

    // Delete client view links
    const { error: clientLinksError } = await supabaseAdmin
      .from('client_view_links')
      .delete()
      .eq('created_by', userId);
    
    if (clientLinksError) {
      console.error('Error deleting client_view_links:', clientLinksError);
    } else {
      console.log('✓ Deleted client_view_links');
    }

    // Delete tags created by user
    const { error: tagsError } = await supabaseAdmin
      .from('tags')
      .delete()
      .eq('created_by', userId);
    
    if (tagsError) {
      console.error('Error deleting tags:', tagsError);
    } else {
      console.log('✓ Deleted tags');
    }

    // Delete vacancy_tags
    const { error: vacancyTagsError } = await supabaseAdmin
      .from('vacancy_tags')
      .delete()
      .eq('created_by', userId);
    
    if (vacancyTagsError) {
      console.error('Error deleting vacancy_tags:', vacancyTagsError);
    } else {
      console.log('✓ Deleted vacancy_tags');
    }

    // Nullify references in vagas (don't delete vagas, just remove user reference)
    const { error: vagasUpdateError } = await supabaseAdmin
      .from('vagas')
      .update({ 
        recrutador_id: null,
        cs_id: null,
        created_by: null,
        updated_by: null,
        deleted_by: null
      })
      .or(`recrutador_id.eq.${userId},cs_id.eq.${userId},created_by.eq.${userId},updated_by.eq.${userId},deleted_by.eq.${userId}`);
    
    if (vagasUpdateError) {
      console.error('Error updating vagas:', vagasUpdateError);
    } else {
      console.log('✓ Nullified references in vagas');
    }

    // Nullify references in candidatos
    const { error: candidatosUpdateError } = await supabaseAdmin
      .from('candidatos')
      .update({ deleted_by: null })
      .eq('deleted_by', userId);
    
    if (candidatosUpdateError) {
      console.error('Error updating candidatos:', candidatosUpdateError);
    } else {
      console.log('✓ Nullified references in candidatos');
    }

    // Delete profiles (this should cascade if properly configured)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
    } else {
      console.log('✓ Deleted profile');
    }

    // Delete users table record
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (usersError) {
      console.error('Error deleting from users table:', usersError);
    } else {
      console.log('✓ Deleted from users table');
    }

    // Step 2: Finally delete user from auth
    console.log('Attempting to delete from auth.users...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Auth deletion error:', deleteError);
      throw new Error(`Failed to delete user from auth: ${deleteError.message}`);
    }

    console.log('✓ User successfully deleted from auth');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User and all related data deleted successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
