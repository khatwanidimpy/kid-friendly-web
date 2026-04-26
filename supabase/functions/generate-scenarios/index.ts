// Edge function: generate DevOps troubleshooting scenarios via Lovable AI Gateway.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = {
  type: "object",
  properties: {
    scenarios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["Docker", "Kubernetes", "Linux"] },
          difficulty: { type: "string", enum: ["Mid", "Senior", "Staff"] },
          title: { type: "string" },
          scene: { type: "string" },
          question: { type: "string" },
          hint: { type: "string" },
          answer: { type: "string" },
          commands: { type: "array", items: { type: "string" } },
          takeaway: { type: "string" },
        },
        required: [
          "category",
          "difficulty",
          "title",
          "scene",
          "question",
          "hint",
          "answer",
          "commands",
          "takeaway",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["scenarios"],
  additionalProperties: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 10, existingTitles = [] } = await req
      .json()
      .catch(() => ({}));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const safeCount = Math.min(Math.max(Number(count) || 10, 1), 15);

    const avoid =
      existingTitles.length > 0
        ? `Avoid duplicating any of these existing titles or near-duplicates:\n- ${existingTitles
            .slice(-80)
            .join("\n- ")}`
        : "";

    const system = `You generate realistic DevOps troubleshooting scenarios that mid-to-staff engineers face on real on-call shifts. Each scenario must read like a real production incident — concrete symptoms, exit codes, error strings, log lines. Mix categories evenly across Docker, Kubernetes, and Linux. Mix difficulty across Mid/Senior/Staff. Always include 2-5 exact shell commands a senior would run. Be specific, never generic.`;

    const user = `Generate ${safeCount} new troubleshooting scenarios. Vary categories and difficulty. ${avoid}`;

    const resp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "emit_scenarios",
                description: "Return generated troubleshooting scenarios.",
                parameters: SCHEMA,
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "emit_scenarios" },
          },
        }),
      },
    );

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit reached. Please wait a moment and try again.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) throw new Error("No tool call returned by model");
    const parsed = JSON.parse(args);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-scenarios error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
