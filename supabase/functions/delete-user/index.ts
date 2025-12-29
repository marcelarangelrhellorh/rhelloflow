import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, getRestrictedCorsHeaders } from '../_shared/cors.ts';

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

    // Delete candidate_notes
    const { error: candidateNotesError } = await supabaseAdmin
      .from('candidate_notes')
      .delete()
      .eq('user_id', userId);
    
    if (candidateNotesError) {
      console.error('Error deleting candidate_notes:', candidateNotesError);
    } else {
      console.log('✓ Deleted candidate_notes');
    }

    // Delete job_history
    const { error: jobHistoryError } = await supabaseAdmin
      .from('job_history')
      .delete()
      .eq('user_id', userId);
    
    if (jobHistoryError) {
      console.error('Error deleting job_history:', jobHistoryError);
    } else {
      console.log('✓ Deleted job_history');
    }

    // Delete empresa_notes
    const { error: empresaNotesError } = await supabaseAdmin
      .from('empresa_notes')
      .delete()
      .eq('user_id', userId);
    
    if (empresaNotesError) {
      console.error('Error deleting empresa_notes:', empresaNotesError);
    } else {
      console.log('✓ Deleted empresa_notes');
    }

    // Delete tasks created by user or assigned to user
    const { error: tasksError } = await supabaseAdmin
      .from('tasks')
      .delete()
      .or(`created_by.eq.${userId},assignee_id.eq.${userId}`);
    
    if (tasksError) {
      console.error('Error deleting tasks:', tasksError);
    } else {
      console.log('✓ Deleted tasks');
    }

    // Nullify job_stage_history changed_by
    const { error: jobStageHistoryError } = await supabaseAdmin
      .from('job_stage_history')
      .update({ changed_by: null })
      .eq('changed_by', userId);
    
    if (jobStageHistoryError) {
      console.error('Error updating job_stage_history:', jobStageHistoryError);
    } else {
      console.log('✓ Nullified job_stage_history');
    }

    // Delete whatsapp_sends
    const { error: whatsappSendsError } = await supabaseAdmin
      .from('whatsapp_sends')
      .delete()
      .eq('sent_by', userId);
    
    if (whatsappSendsError) {
      console.error('Error deleting whatsapp_sends:', whatsappSendsError);
    } else {
      console.log('✓ Deleted whatsapp_sends');
    }

    // Nullify candidate_tags added_by
    const { error: candidateTagsError } = await supabaseAdmin
      .from('candidate_tags')
      .update({ added_by: null })
      .eq('added_by', userId);
    
    if (candidateTagsError) {
      console.error('Error updating candidate_tags:', candidateTagsError);
    } else {
      console.log('✓ Nullified candidate_tags');
    }

    // Delete deletion_approvals
    const { error: deletionApprovalsError } = await supabaseAdmin
      .from('deletion_approvals')
      .delete()
      .or(`requested_by.eq.${userId},approved_by.eq.${userId}`);
    
    if (deletionApprovalsError) {
      console.error('Error deleting deletion_approvals:', deletionApprovalsError);
    } else {
      console.log('✓ Deleted deletion_approvals');
    }

    // Nullify pre_delete_snapshots deleted_by (keep audit trail)
    const { error: preDeleteSnapshotsError } = await supabaseAdmin
      .from('pre_delete_snapshots')
      .update({ deleted_by: null })
      .eq('deleted_by', userId);
    
    if (preDeleteSnapshotsError) {
      console.error('Error updating pre_delete_snapshots:', preDeleteSnapshotsError);
    } else {
      console.log('✓ Nullified pre_delete_snapshots');
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
        deleted_by: null,
        last_status_change_by: null,
        cliente_id: null
      })
      .or(`recrutador_id.eq.${userId},cs_id.eq.${userId},created_by.eq.${userId},updated_by.eq.${userId},deleted_by.eq.${userId},last_status_change_by.eq.${userId},cliente_id.eq.${userId}`);
    
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

    // Nullify references in feedbacks deleted_by
    const { error: feedbacksDeletedByError } = await supabaseAdmin
      .from('feedbacks')
      .update({ deleted_by: null })
      .eq('deleted_by', userId);
    
    if (feedbacksDeletedByError) {
      console.error('Error updating feedbacks deleted_by:', feedbacksDeletedByError);
    } else {
      console.log('✓ Nullified feedbacks deleted_by');
    }

    // Nullify cs_responsavel_id in empresas
    const { error: empresasUpdateError } = await supabaseAdmin
      .from('empresas')
      .update({ cs_responsavel_id: null })
      .eq('cs_responsavel_id', userId);
    
    if (empresasUpdateError) {
      console.error('Error updating empresas:', empresasUpdateError);
    } else {
      console.log('✓ Nullified empresas cs_responsavel_id');
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
      { headers: { ...restrictedCors, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting user:', error);
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