// js/ui.js
import { qs, escapeHtml } from "./helpers.js";

/* ---------- Ember particles ---------- */
export function createEmbers(count = 12) {
  const container = document.createElement("div");
  container.className = "ember-layer";
  document.querySelector("main").appendChild(container);

  function spawnOne() {
    const e = document.createElement("div");
    e.className = "ember";
    const left = Math.random() * 100;
    e.style.left = left + "%";
    const size = 4 + Math.random() * 8;
    e.style.width = size + "px";
    e.style.height = size + "px";
    const dur = 3500 + Math.random() * 4000;
    e.style.animationDuration = dur + "ms";
    e.style.animationDelay = "-" + Math.random() * dur + "ms";
    container.appendChild(e);
    setTimeout(() => {
      if (e && e.parentNode) e.parentNode.removeChild(e);
    }, dur + 8000);
  }

  for (let i=0;i<count;i++) spawnOne();

  const interval = setInterval(() => {
    spawnOne();
    if (container.children.length > count * 3) {
      container.removeChild(container.children[0]);
    }
  }, 800);
}

/* ---------- Typewriter ---------- */
function typewriterEffect(element, text, speed = 18) {
  return new Promise((resolve) => {
    element.classList.add("typewriter");
    element.textContent = "";
    let i = 0;
    function step() {
      const chunk = text.slice(i, i+2);
      element.textContent += chunk;
      i += chunk.length;
      if (i < text.length) {
        setTimeout(step, speed);
      } else {
        element.classList.add("done");
        resolve();
      }
    }
    step();
  });
}

/* ---------- UI wiring ---------- */
export function initUI() {
  const form = qs("form");
  const answerSection = qs("#answer");
  const personaSelect = qs("#persona");
  const askBtn = qs("button[type=submit]");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const persona = fd.get("persona");
    const question = (fd.get("question") || "").trim();
    if (!question) return;

    // show loading
    answerSection.innerHTML = `<div class="center"><span class="spinner" aria-hidden="true"></span><span style="margin-left:.6rem;color:var(--muted)">Thinking...</span></div>`;

    try {
      const respText = await askServerOrMock(persona, question);
      answerSection.innerHTML = `<div class="answer-pre fade-in" id="answer-pre"></div>`;
      const pre = qs("#answer-pre");
      await typewriterEffect(pre, respText, 16);
    } catch (err) {
      answerSection.innerHTML = `<p style="color:tomato">Error: ${escapeHtml(err.message || String(err))}</p>`;
    }
  });
}

/* ---------- Server call with graceful fallback ---------- */
async function askServerOrMock(persona, question) {
  try {
    const res = await fetch("/ask", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ persona, question })
    });
    if (!res.ok) throw new Error("No server response");
    const data = await res.json();
    if (data && data.answer) return data.answer;
    const txt = await res.text();
    if (txt) return txt;
    throw new Error("Empty response");
  } catch (err) {
    return mockAnswer(persona, question);
  }
}

/* ---------- Mock responses (English) ---------- */
function mockAnswer(persona, question) {
  const p = persona || "ancient_dragon";
  const base = {
    ancient_dragon: `I am the ancient ember and ash. Regarding your question: "${question}", the path is simple — search the narrow ridge to the right, avoid open light, and carry a shield with high stability. This is a brief tactical hint.`,
    old_knight: `Straightforward steps:\n1) Approach the door.\n2) Defeat the guard on the right.\n3) Use rolls rather than blocking to avoid stamina drain.\nPractical and concise.`,
    mystic_seer: `The shadows whisper about: "${question}". Look for the mark on the stone, follow the crow. Seek, do not ask why.`
  };
  return (base[p] || base.ancient_dragon) + "\n\n(This is a frontend mock response.)";
}

