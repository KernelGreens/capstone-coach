import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user: supervisor } } = await supabaseAdmin.auth.getUser(token);
    if (!supervisor) {
      throw new Error('Unauthorized');
    }

    // Verify supervisor role
    const { data: roleCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', supervisor.id)
      .eq('role', 'supervisor')
      .single();

    if (!roleCheck) {
      throw new Error('Only supervisors can invite students');
    }

    const { email, full_name, track_id, start_date, end_date } = await req.json();

    // Create user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) throw authError;

    // Create student role
    await supabaseAdmin.from('user_roles').insert({
      user_id: authData.user.id,
      role: 'student',
    });

    // Create student record
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('students')
      .insert({
        user_id: authData.user.id,
        track_id,
        supervisor_id: supervisor.id,
        start_date,
        end_date,
        status: 'active',
      })
      .select()
      .single();

    if (studentError) throw studentError;

    return new Response(
      JSON.stringify({ success: true, student: studentData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
