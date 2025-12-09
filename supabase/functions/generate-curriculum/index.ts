import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackName, trackDescription, internshipWeeks, focusAreas } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating curriculum for track: ${trackName}, weeks: ${internshipWeeks}`);

    const systemPrompt = `You are an expert curriculum designer for professional internship programs. 
Your task is to create comprehensive, practical, and industry-relevant weekly curricula for internship tracks.

Guidelines:
- Create realistic, achievable weekly goals
- Include hands-on projects and deliverables
- Progress from foundational to advanced topics
- Include industry best practices and tools
- Make deliverables specific and measurable`;

    const userPrompt = `Create a detailed ${internshipWeeks}-week curriculum for an internship track with the following details:

Track Name: ${trackName}
Description: ${trackDescription || 'General internship program'}
${focusAreas ? `Focus Areas: ${focusAreas}` : ''}

For each week, provide:
1. Week Focus (main topic/theme)
2. Learning Objectives (2-3 key objectives)
3. Tasks (specific activities to complete)
4. Deliverables (what the intern should produce)
5. Tools/Technologies to use

Return the curriculum as a JSON array with this structure:
[
  {
    "week_number": 1,
    "week_focus": "string",
    "objectives": ["string"],
    "tasks": "string (multi-line description)",
    "deliverables": "string",
    "tools": ["string"]
  }
]

Only return valid JSON, no additional text.`;

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few moments." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content received from AI");
    }

    // Parse the JSON from the response
    let curriculum;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      curriculum = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse curriculum JSON:", content);
      throw new Error("Failed to parse generated curriculum");
    }

    console.log(`Successfully generated ${curriculum.length} weeks of curriculum`);

    return new Response(
      JSON.stringify({ curriculum }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating curriculum:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
