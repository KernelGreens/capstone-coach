import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, week_number, objectives, tools_technologies, student_notes } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Firecrawl is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build search query from context
    const searchTerms = [topic];
    if (tools_technologies) searchTerms.push(tools_technologies);
    if (objectives) searchTerms.push("tutorial guide");
    const searchQuery = searchTerms.join(" ");

    console.log("Searching for resources:", searchQuery);

    // Use Firecrawl search to find relevant web resources
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error("Firecrawl search error:", searchData);
      // If Firecrawl fails (e.g. 402), fall back to AI-only recommendations
      if (searchResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Search service credits exhausted. Please check your Firecrawl plan." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(searchData.error || "Search failed");
    }

    // Format search results for AI curation
    const searchResults = (searchData.data || []).map((r: any, i: number) => ({
      index: i + 1,
      title: r.title || "Untitled",
      url: r.url || "",
      description: r.description || "",
      snippet: r.markdown?.substring(0, 500) || "",
    }));

    console.log(`Found ${searchResults.length} search results, curating with AI...`);

    // Use Lovable AI to curate and rank the resources
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a learning resource curator for internship students. Given search results and learning context, select and organize the most relevant and high-quality resources. Focus on tutorials, documentation, guides, and video content that directly help with the weekly topic. Exclude irrelevant, low-quality, or paywalled content.`,
          },
          {
            role: "user",
            content: `Week ${week_number} Topic: ${topic}
${objectives ? `Learning Objectives: ${objectives}` : ""}
${tools_technologies ? `Tools/Technologies: ${tools_technologies}` : ""}
${student_notes ? `Student's notes/struggles: ${student_notes}` : ""}

Here are search results to curate from:
${JSON.stringify(searchResults, null, 2)}

Select the best 3-6 resources and provide a curated list.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "curate_resources",
              description: "Return curated learning resources",
              parameters: {
                type: "object",
                properties: {
                  resources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Resource title" },
                        url: { type: "string", description: "Resource URL" },
                        type: { type: "string", enum: ["article", "tutorial", "video", "documentation", "course", "tool"], description: "Resource type" },
                        relevance: { type: "string", description: "Brief explanation of why this is relevant (1-2 sentences)" },
                        difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"], description: "Difficulty level" },
                      },
                      required: ["title", "url", "type", "relevance", "difficulty"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "Brief overview of the curated resources and how they help with the week's learning goals (2-3 sentences)" },
                },
                required: ["resources", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "curate_resources" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI curation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("AI did not return structured resources");
    }

    const curated = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, ...curated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("suggest-resources error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
