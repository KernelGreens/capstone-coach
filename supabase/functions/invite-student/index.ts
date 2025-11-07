import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import Resend from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend.Resend(Deno.env.get('RESEND_API_KEY'));

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

    // Generate temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12);

    // Create user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
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

    // Get supervisor profile
    const { data: supervisorProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', supervisor.id)
      .single();

    // Get track info
    const { data: track } = await supabaseAdmin
      .from('tracks')
      .select('name')
      .eq('id', track_id)
      .single();

    const loginUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/v1', '')}/auth/v1/verify`;

    // Send invitation email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Welcome to the Internship Mentorship Platform</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${full_name}</strong>,</p>
              
              <p>You've been invited by <strong>${supervisorProfile?.full_name || 'your supervisor'}</strong> to join the Internship Mentorship Platform.</p>
              
              <p><strong>Program Details:</strong></p>
              <ul>
                <li>Track: <strong>${track?.name || 'Not specified'}</strong></li>
                <li>Start Date: <strong>${new Date(start_date).toLocaleDateString()}</strong></li>
                <li>End Date: <strong>${new Date(end_date).toLocaleDateString()}</strong></li>
              </ul>
              
              <div class="credentials">
                <h3>Your Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
              </div>
              
              <p><strong>Important:</strong> Please change your password after your first login for security.</p>
              
              <center>
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://your-app-url.com'}/auth" class="button">
                  Login to Platform
                </a>
              </center>
              
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>If you have any questions, please contact your supervisor.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Internship Platform <onboarding@resend.dev>',
      to: [email],
      subject: '🎓 Welcome to Internship Mentorship Platform',
      html: emailHtml,
    });

    if (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails, just log it
    }

    console.log(`Student invited successfully: ${email}`);

    return new Response(
      JSON.stringify({ success: true, student: studentData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    console.error('Invitation error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
