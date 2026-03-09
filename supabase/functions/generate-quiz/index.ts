import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, questionCount = 5, difficulty = "medium", quizType = "quiz" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const questionTypes = quizType === "flashcard_deck"
      ? "flashcard (question on front, answer on back)"
      : "multiple_choice, true_false, fill_blank, and drag_drop_match";

    const systemPrompt = `You are a quiz generator. Generate exactly ${questionCount} questions about "${topic}" at ${difficulty} difficulty.

Return JSON using the suggest_questions tool. Question types to use: ${questionTypes}.

For multiple_choice: options is an array of 4 strings, correct_answer is one of them.
For true_false: options is ["True","False"], correct_answer is "True" or "False".
For fill_blank: options is null, correct_answer is the answer text.
For flashcard: options is null, correct_answer is the answer.
For drag_drop_match: options is array of {left, right} pairs, correct_answer is "matched".`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${questionCount} ${difficulty} questions about: ${topic}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_questions",
              description: "Return generated quiz questions",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string" },
                        question_type: { type: "string", enum: ["multiple_choice", "true_false", "fill_blank", "flashcard", "drag_drop_match"] },
                        options: {},
                        correct_answer: { type: "string" },
                        explanation: { type: "string" },
                        points: { type: "number" },
                      },
                      required: ["question_text", "question_type", "correct_answer"],
                    },
                  },
                },
                required: ["title", "questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_questions" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : { title: topic, questions: [] };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
