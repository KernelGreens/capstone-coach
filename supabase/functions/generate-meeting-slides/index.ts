import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingTitle, meetingDescription, studentName, scheduledAt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Act as a world-class presentation creator. Create a complete, slide-by-slide presentation for a meeting.

Meeting Title: ${meetingTitle}
Student: ${studentName || "N/A"}
Scheduled: ${scheduledAt || "N/A"}
Agenda/Description:
${meetingDescription || "General meeting discussion"}

Create a structured presentation using the topics/items from the agenda and description above. Include title slides, key points, examples, data suggestions, metaphors, visual suggestions, and a closing call-to-action. Structure it like a TED-level presentation with storytelling flow.

Return your response as a valid JSON array of slide objects. Each slide must have:
- "title": string (slide title)
- "subtitle": string (optional subtitle, can be empty)
- "bullets": string[] (array of bullet points, max 5 per slide)
- "notes": string (speaker notes for this slide)
- "visualSuggestion": string (suggestion for what visual/image would enhance this slide)

Create between 8-15 slides. The first slide should be a title slide and the last should be a closing/call-to-action slide.

IMPORTANT: Return ONLY the JSON array, no markdown, no code blocks, no explanation.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "You are a presentation design expert. Always return valid JSON arrays only, with no extra text or formatting.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate slides from AI");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    // Parse JSON from the response, handling potential markdown code blocks
    let slides;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      slides = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse presentation structure from AI");
    }

    return new Response(JSON.stringify({ slides }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-meeting-slides error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
