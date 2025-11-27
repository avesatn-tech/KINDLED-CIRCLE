// functions/api/chat.js
export async function onRequest(context) {
  // Handles all methods; returns 405 for unsupported methods except OPTIONS/GET/POST
  const method = context.request.method.toUpperCase();

  // Allow CORS preflight if needed
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      route: "/api/chat",
      methods: ["GET","POST"],
      note: "POST JSON { character, message }"
    }), { status: 200, headers: { "Content-Type":"application/json", ...corsHeaders }});
  }

  if (method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type":"application/json", ...corsHeaders }
    });
  }

  // POST processing
  try {
    const OPENAI_KEY = context.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY in environment" }), {
        status: 500,
        headers: { "Content-Type":"application/json", ...corsHeaders }
      });
    }

    // parse JSON safely
    let payload;
    try {
      payload = await context.request.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid JSON body", detail: String(err) }), {
        status: 400,
        headers: { "Content-Type":"application/json", ...corsHeaders }
      });
    }

    const { character, message } = payload || {};
    if (!character || !message) {
      return new Response(JSON.stringify({ error: "character and message required" }), {
        status: 400,
        headers: { "Content-Type":"application/json", ...corsHeaders }
      });
    }

    // system prompts
    const CHARACTER_PROMPTS = {
      seer: `You are "Seer" — poetic, helpful, and careful with spoilers. Answer about game lore and magic builds in a lyrical tone.`,
      knight: `You are "Knight" — blunt, tactical, and practical. Give concise actionable advice.`,
      dragon: `You are "Dragon" — majestic and concise. Provide high-level boss strategies.`,
    };

    const systemPrompt = CHARACTER_PROMPTS[character] || "You are a helpful game character.";

    // build OpenAI body
    const body = {
      model: context.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: character === 'seer' ? 0.8 : character === 'knight' ? 0.25 : 0.5,
      max_tokens: 700,
      top_p: 0.95
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch(e){ json = { raw: text }; }

    if (!resp.ok) {
      // propagate error details for debug
      return new Response(JSON.stringify({ error: "OpenAI error", status: resp.status, detail: json }), {
        status: 502,
        headers: { "Content-Type":"application/json", ...corsHeaders }
      });
    }

    const reply = json?.choices?.[0]?.message?.content ?? null;
    if (!reply) {
      return new Response(JSON.stringify({ error: "No reply from OpenAI", detail: json }), {
        status: 502,
        headers: { "Content-Type":"application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type":"application/json", ...corsHeaders }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", detail: String(err) }), {
      status: 500,
      headers: { "Content-Type":"application/json" }
    });
  }
}
