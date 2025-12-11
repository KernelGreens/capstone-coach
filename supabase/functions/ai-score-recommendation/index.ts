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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verify supervisor role
    const { data: roleCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'supervisor')
      .single();

    if (!roleCheck) {
      throw new Error('Only supervisors can use AI scoring');
    }

    const { weekly_progress_id, student_name, week_number, tasks, completed_tasks, self_assessment_score, self_assessment_notes, deliverables, project_details } = await req.json();

    console.log('AI Scoring request for:', { weekly_progress_id, student_name, week_number });

    const systemPrompt = `You are an experienced internship mentor providing constructive feedback and scoring for student work. 
Your role is to:
1. Evaluate the student's progress objectively
2. Provide a score from 0-10 based on their work quality, completion rate, and effort
3. Give specific, actionable recommendations for improvement
4. Be encouraging while honest about areas needing work

Consider:
- Task completion rate
- Quality of deliverables (if described)
- Self-reflection quality
- Effort and engagement demonstrated`;

    const userPrompt = `Please evaluate this student's weekly progress and provide a score and recommendations.

**Student:** ${student_name}
**Week:** ${week_number}

**Project/Week Focus:**
${project_details || 'Not specified'}

**Tasks for the week:**
${tasks || 'No tasks defined'}

**Completed Tasks:**
${completed_tasks || 'None marked as completed'}

**Self-Assessment Score:** ${self_assessment_score || 'Not provided'}/10

**Student's Self-Assessment Notes:**
${self_assessment_notes || 'No notes provided'}

**Deliverables Submitted:**
${deliverables || 'None'}

Please provide:
1. A suggested score (0-10)
2. Brief justification for the score
3. 2-3 specific recommendations for improvement
4. One positive highlight from their work`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_evaluation",
              description: "Provide structured evaluation with score and recommendations",
              parameters: {
                type: "object",
                properties: {
                  suggested_score: {
                    type: "number",
                    description: "Suggested score from 0 to 10"
                  },
                  score_justification: {
                    type: "string",
                    description: "Brief explanation for the suggested score"
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 specific recommendations for improvement"
                  },
                  positive_highlight: {
                    type: "string",
                    description: "One positive aspect of the student's work"
                  }
                },
                required: ["suggested_score", "score_justification", "recommendations", "positive_highlight"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_evaluation" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required for AI features." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const evaluation = JSON.parse(toolCall.function.arguments);
    console.log('Evaluation:', evaluation);

    return new Response(
      JSON.stringify({
        success: true,
        evaluation: {
          suggested_score: evaluation.suggested_score,
          score_justification: evaluation.score_justification,
          recommendations: evaluation.recommendations,
          positive_highlight: evaluation.positive_highlight
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    console.error('AI Scoring error:', message, error);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
