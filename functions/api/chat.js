export async function onRequest(context) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // Preflight
  if (context.request.method === "OPTIONS") {
    return new Response("", { status: 204, headers: cors });
  }

  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const OPENAI_KEY = context.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return new Response(JSON.stringify({ error: "No OPENAI_KEY" }), {
      status: 500,
      headers: cors
    });
  }

  const body = await context.request.json();
  const { character, message } = body;

  const SYSTEM = {
    seer: "You are Seer, mystical and poetic.",
    knight: "You are Knight, direct and tactical.",
    dragon: "You are Dragon, ancient and wise."
  };

  const prompt = SYSTEM[character] || "You are a helpful assistant.";

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: message }
      ]
    })
  });

  const json = await r.json();
  const reply = json.choices?.[0]?.message?.content || "No reply.";

  return new Response(JSON.stringify({ reply }), {
    headers: { "Content-Type": "application/json", ...cors }
  });
}
