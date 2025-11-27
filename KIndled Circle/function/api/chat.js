// functions/api/chat.js
export async function onRequestPost(context) {
  try {
    const OPENAI_KEY = context.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: missing OPENAI_API_KEY' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const req = context.request;
    const payload = await req.json().catch(()=>null);
    if (!payload || !payload.character || !payload.message) {
      return new Response(JSON.stringify({ error: 'character and message required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { character, message } = payload;

    const CHARACTER_PROMPTS = {
      seer: `You are "Seer" — poetic, helpful, and careful with spoilers. Answer about game lore and magic builds in a lyrical tone. When relevant, give step-by-step instructions or examples.`,
      knight: `You are "Knight" — blunt, tactical, and practical. Give concise, actionable weapon/armor/build advice and clear combat tips.`,
      dragon: `You are "Dragon" — majestic and concise. Offer high-level boss strategies, phase breakdowns, and positional advice. Avoid verbosity unless user asks for details.`,
    };

    const systemPrompt = CHARACTER_PROMPTS[character] || 'You are a helpful game character.';

    const body = {
      model: (context.env.OPENAI_MODEL || 'gpt-4o-mini'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: character === 'seer' ? 0.8 : character === 'knight' ? 0.25 : 0.5,
      max_tokens: 700,
      top_p: 0.95
    };

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!openaiResp.ok) {
      const t = await openaiResp.text();
      return new Response(JSON.stringify({ error: 'OpenAI error', detail: t }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await openaiResp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "I couldn't produce an answer.";

    return new Response(JSON.stringify({ reply }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'server error', detail: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
