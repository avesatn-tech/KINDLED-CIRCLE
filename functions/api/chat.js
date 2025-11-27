// functions/api/chat.js (debug version)
// Replaces production handler temporarily to return full OpenAI response for debugging.

export async function onRequest(context) {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  };

  // Preflight
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Simple GET info
  if (context.request.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      note: "This is debug endpoint. Use POST {character, message} to test.",
      required_env: ["OPENAI_API_KEY"]
    }), { status: 200, headers: { "Content-Type": "application/json", ...CORS }});
  }

  // Only POST expected for chat
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...CORS }
    });
  }

  // Check API key
  const OPENAI_KEY = context.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return new Response(JSON.stringify({
      error: "Missing OPENAI_API_KEY in environment variables",
      hint: "Set OPENAI_API_KEY in Cloudflare Pages project settings"
    }), { status: 500, headers: { "Content-Type": "application/json", ...CORS }});
  }

  // Parse body safely
  let payload;
  try {
    payload = await context.request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body", detail: String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS }
    });
  }

  const { character, message } = payload || {};
  if (!character || !message) {
    return new Response(JSON.stringify({ error: "Both 'character' and 'message' are required in the POST body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS }
    });
  }

  // System prompts
  const SYSTEM = {
    seer: "You are Seer — poetic, careful with spoilers, game-lore oriented.",
    knight: "You are Knight — blunt, tactical, concise.",
    dragon: "You are Dragon — majestic, high-level strategies."
  };
  const systemPrompt = SYSTEM[character] || "You are a helpful assistant.";

  // Build OpenAI request
  const reqBody = {
    model: context.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    temperature: 0.7,
    max_tokens: 800,
  };

  // Send to OpenAI and return the raw json back for debugging
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reqBody)
    });

    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = { raw_text: text };
    }

    // If OpenAI returned non-OK, propagate details
    if (!resp.ok) {
      return new Response(JSON.stringify({
        ok: false,
        status: resp.status,
        statusText: resp.statusText,
        error_detail: json
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS }
      });
    }

    // Return full OpenAI answer + convenience fields
    const reply = json?.choices?.[0]?.message?.content ?? null;

    return new Response(JSON.stringify({
      ok: true,
      used_model: reqBody.model,
      reply_exists: reply !== null,
      reply_preview: typeof reply === "string" ? (reply.length > 400 ? reply.slice(0,400) + "..." : reply) : reply,
      raw: json
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Network or server error when calling OpenAI",
      detail: String(err)
    }), { status: 500, headers: { "Content-Type": "application/json", ...CORS }});
  }
}
