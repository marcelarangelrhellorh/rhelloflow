import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const restrictedCors = getRestrictedCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: restrictedCors });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar autenticação e se é admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Sem autorização");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    // Verificar se é admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Apenas administradores podem atualizar emails");
    }

    const { userId, newEmail } = await req.json();

    if (!userId || !newEmail) {
      throw new Error("userId e newEmail são obrigatórios");
    }

    // Atualizar email no auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
    });

    if (error) throw error;

    // Atualizar na tabela users também
    await supabaseAdmin
      .from("users")
      .update({ email: newEmail })
      .eq("id", userId);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...restrictedCors, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const origin = req.headers.get('origin');
    const restrictedCors = getRestrictedCorsHeaders(origin);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...restrictedCors, "Content-Type": "application/json" },
      status: 400,
    });
  }
});