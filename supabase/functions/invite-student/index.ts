import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { sendEmailViaResend, getResendFromEmail } from "../_shared/resendGateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const fromEmail = getResendFromEmail();
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user: supervisor } } = await supabaseAdmin.auth.getUser(token);
    if (!supervisor) {
      console.error('No authenticated user found');
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
      console.error('User is not a supervisor:', supervisor.id);
      throw new Error('Only supervisors can invite students');
    }

    const { email, full_name, track_id, start_date, end_date } = await req.json();
    console.log('Inviting student:', { email, full_name, track_id });

    // Check student limit based on subscription
    const EXCLUDED_EMAILS = ['abiodunodukaye@gmail.com', 'abiodunahmadaws@gmail.com'];
    const supervisorEmail = supervisor.email || '';
    
    if (!EXCLUDED_EMAILS.includes(supervisorEmail.toLowerCase())) {
      const { count, error: countError } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('supervisor_id', supervisor.id)
        .eq('status', 'active');

      if (countError) throw countError;
      const activeStudents = count || 0;

      const Stripe = (await import("https://esm.sh/stripe@18.5.0")).default;
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
        apiVersion: '2025-08-27.basil',
      });

      const PREMIUM_PRODUCT_IDS = [
        "prod_U74B4nS5LsUWIU",
        "prod_U74C240Qcx85oz",
      ];

      let maxStudents = 1;
      let tierName = 'Free';
      const customers = await stripe.customers.list({ email: supervisorEmail, limit: 1 });
      if (customers.data.length > 0) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          status: 'active',
          limit: 10,
        });
        if (subscriptions.data.length > 0) {
          const productId = subscriptions.data[0].items.data[0].price.product as string;
          if (PREMIUM_PRODUCT_IDS.includes(productId)) {
            maxStudents = 999;
            tierName = 'Premium';
          } else {
            maxStudents = 10;
            tierName = 'Pro';
          }
        }
      }

      if (activeStudents >= maxStudents) {
        throw new Error(
          maxStudents === 1
            ? 'Free plan allows only 1 active student. Upgrade to Pro to add more.'
            : `${tierName} plan allows up to ${maxStudents} active students. You have ${activeStudents}.`
        );
      }
    }

    // Generate temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12);

    // Create user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      console.error('Auth error creating user:', authError);
      throw authError;
    }

    console.log('User created:', authData.user.id);

    // Create student role
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: authData.user.id,
      role: 'student',
    });

    if (roleError) {
      console.error('Error creating role:', roleError);
    }

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

    if (studentError) {
      console.error('Error creating student record:', studentError);
      throw studentError;
    }

    console.log('Student record created:', studentData.id);

    // Also add to student_tracks junction table for multi-track support
    const { error: trackError } = await supabaseAdmin.from('student_tracks').insert({
      student_id: studentData.id,
      track_id,
    });

    if (trackError) {
      console.error('Error adding student track:', trackError);
    }

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

    // Get app URL
    const appUrl = Deno.env.get('APP_URL') || 'https://capstone-coach.lovable.app';

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
                <a href="${appUrl}/auth" class="button">
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

    // Send invitation email via Resend gateway
    console.log('Attempting to send email to:', email);
    const emailResult = await sendEmailViaResend({
      from: `Internship Platform <${fromEmail}>`,
      to: [email],
      subject: '🎓 Welcome to Internship Mentorship Platform',
      html: emailHtml,
    });

    if (emailResult.error) {
      console.error('Email sending error:', emailResult.error);
    } else {
      console.log('Email sent successfully:', emailResult.id);
    }

    console.log(`Student invited successfully: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        student: studentData,
        emailSent: !emailResult.error,
        emailNote: emailResult.error ? `Email send failed: ${emailResult.error}` : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    console.error('Invitation error:', message, error);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
