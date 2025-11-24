// js/ui.js
import { qs, qsa, escapeHtml } from "./helpers.js";

/* ---------- Ember particles ---------- */
export function createEmbers(count = 12) {
  const container = document.createElement("div");
  container.className = "ember-layer";
  const main = document.querySelector("main");
  if (!main) return;
  main.appendChild(container);

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

  for (let i = 0; i < count; i++) spawnOne();

  const interval = setInterval(() => {
    spawnOne();
    if (container.children.length > count * 3) container.removeChild(container.children[0]);
  }, 800);

  return () => clearInterval(interval);
}

/* ---------- Typewriter / render ---------- */
function typewriterEffect(element, text, speed = 16) {
  return new Promise((resolve) => {
    element.classList.add("typewriter");
    element.textContent = "";
    let i = 0;
    function step() {
      const chunk = text.slice(i, i + 2);
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

/* ---------- Mock (frontend) ---------- */
function mockAnswer(persona, question) {
  const p = persona || "ancient_dragon";
  const base = {
    ancient_dragon: `I am the ancient ember and ash. Regarding your question: "${question}", search the narrow ridge to the right, avoid open light, and carry a shield with high stability.`,
    old_knight: `Straight steps:\n1) Approach the door.\n2) Defeat the guard on the right.\n3) Use rolls rather than blocking to preserve stamina.`,
    mystic_seer: `The shadows whisper: "${question}". Seek the mark on the stone, follow the crow. Beware false lights.`
  };
  return (base[p] || base.ancient_dragon) + "\n\n(This is a frontend mock response.)";
}

/* ---------- Chat UI builder ---------- */
function buildChatUI(personaId, personaLabel) {
  const chat = qs("#chat");
  chat.innerHTML = ""; // wipe placeholder

  // header
  const header = document.createElement("div");
  header.className = "card";
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "0.6rem";
  header.innerHTML = `<div style="display:flex;gap:.7rem;align-items:center">
      <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(224,122,46,0.02));border:1px solid rgba(255,255,255,0.02)">
        <img src="img/${personaId === 'ancient_dragon' ? 'dragon' : personaId === 'old_knight' ? 'knight' : 'seer'}.png" width="30" height="30" alt="">
      </div>
      <div>
        <div style="font-weight:700">${escapeHtml(personaLabel)}</div>
        <div style="font-size:.85rem;color:var(--muted)">Persona active — say something to begin</div>
      </div>
    </div>
    <div>
      <button class="btn ghost small" id="end-chat">Close</button>
    </div>`;

  // messages container
  const messages = document.createElement("div");
  messages.id = "messages";
  messages.style.minHeight = "160px";
  messages.style.padding = "0.6rem";
  messages.style.borderRadius = "8px";
  messages.style.background = "linear-gradient(180deg, rgba(255,255,255,0.01), transparent)";
  messages.style.border = "1px solid rgba(255,255,255,0.02)";
  messages.style.marginBottom = "0.7rem";
  messages.style.boxShadow = "inset 0 -1px 0 rgba(255,255,255,0.01)";

  // input area
  const inputBar = document.createElement("div");
  inputBar.style.display = "flex";
  inputBar.style.gap = ".5rem";
  inputBar.style.alignItems = "center";

  const textarea = document.createElement("textarea");
  textarea.id = "chat-input";
  textarea.rows = 3;
  textarea.placeholder = "Ask something — the persona will answer as themselves.";
  textarea.style.flex = "1";
  textarea.style.padding = ".6rem";
  textarea.style.borderRadius = "8px";
  textarea.style.background = "transparent";
  textarea.style.border = "1px solid rgba(255,255,255,0.04)";
  textarea.style.color = "var(--text)";

  const sendBtn = document.createElement("button");
  sendBtn.className = "btn primary";
  sendBtn.textContent = "Send";

  inputBar.appendChild(textarea);
  inputBar.appendChild(sendBtn);

  chat.appendChild(header);
  chat.appendChild(messages);
  chat.appendChild(inputBar);

  // wire interactions
  qs("#end-chat").addEventListener("click", () => {
    // restore placeholder
    const placeholder = document.createElement("div");
    placeholder.id = "chat-placeholder";
    placeholder.className = "center";
    placeholder.style.padding = "2rem";
    placeholder.style.color = "var(--muted)";
    placeholder.innerHTML = `<div><p style="margin:0 0 .6rem; font-weight:600;">Pick a persona to begin</p>
      <p style="margin:0">Click <strong>Select</strong> on any persona card and the conversation will open here.</p></div>`;
    chat.innerHTML = "";
    chat.appendChild(placeholder);
  });

  // send handler
  sendBtn.addEventListener("click", async () => {
    const q = textarea.value.trim();
    if (!q) return;
    appendMessage(messages, "user", q);
    textarea.value = "";
    await handleAskAndRender(messages, personaId, q);
  });

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // focus input
  setTimeout(() => textarea.focus(), 120);
}

/* ---------- Append message to messages container ---------- */
function appendMessage(container, who, text) {
  const wrap = document.createElement("div");
  wrap.style.marginBottom = ".6rem";
  if (who === "user") {
    wrap.innerHTML = `<div style="text-align:right"><div style="display:inline-block;background:rgba(255,255,255,0.03);padding:.55rem .7rem;border-radius:8px;color:var(--text);max-width:80%">${escapeHtml(text)}</div></div>`;
  } else {
    // assistant placeholder; content will be typed-in
    wrap.innerHTML = `<div style="text-align:left"><div class="answer-pre" style="display:inline-block;background:transparent;padding:.55rem .7rem;border-radius:8px;max-width:90%"><span class="assistant-text"></span></div></div>`;
  }
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

/* ---------- handle ask + render assistant response ---------- */
async function handleAskAndRender(messagesEl, persona, question) {
  // temporary loading indicator
  const loadingNode = document.createElement("div");
  loadingNode.style.margin = ".3rem 0";
  loadingNode.innerHTML = `<div class="center"><span class="spinner" aria-hidden="true"></span><span style="margin-left:.6rem;color:var(--muted)">Thinking...</span></div>`;
  messagesEl.appendChild(loadingNode);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const respText = await askServerOrMock(persona, question);
    // remove loading
    messagesEl.removeChild(loadingNode);

    // append assistant container
    const wrapper = appendMessage(messagesEl, "assistant", "");
    const span = wrapper.querySelector(".assistant-text");
    await typewriterEffect(span, respText, 16);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } catch (err) {
    messagesEl.removeChild(loadingNode);
    const wrapper = appendMessage(messagesEl, "assistant", "");
    const span = wrapper.querySelector(".assistant-text");
    span.textContent = `Error: ${err.message || String(err)}`;
  }
}

/* ---------- Persona wiring & extras ---------- */
function wirePersonaCards() {
  const cards = qsa(".persona.card");
  // select element no longer used as main input; keep for compatibility
  const selectInput = qs("#persona");

  cards.forEach((card) => {
    const selectBtn = card.querySelector(".select-btn");
    const personaId = card.dataset.persona;
    const personaLabel = card.querySelector("h3").textContent.trim();

    function openChat() {
      // visually mark selected card
      cards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");

      // build the chat UI
      buildChatUI(personaId, personaLabel);
      // smooth scroll to chat
      qs("#chat").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // click handlers for both card and button
    selectBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openChat();
    });
    card.addEventListener("click", (e) => {
      // click card opens chat too (but don't trigger when clicking a button)
      if (!e.target.classList.contains("select-btn") && !e.target.classList.contains("preview-btn")) {
        openChat();
      }
    });

    // keyboard accessibility
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openChat();
      }
    });
  });
}

function wireRandomTip() {
  const btn = qs("#random-tip");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const examples = [
      "How do I approach the massive knight near the gate?",
      "Where can I find a lightning infusion early game?",
      "Best way to deal with poison swamps?",
      "How to farm runes efficiently in mid-game?"
    ];
    const pick = examples[Math.floor(Math.random() * examples.length)];
    // If chat open, put into textarea, otherwise create chat with default persona
    const chatInput = qs("#chat-input");
    if (chatInput) {
      chatInput.value = pick;
      chatInput.focus();
    } else {
      // open Ancient Dragon chat with prefilled question
      const dragonCard = qs('.persona.card[data-persona="ancient_dragon"]');
      if (dragonCard) {
        dragonCard.querySelector(".select-btn").click();
        // delay then fill
        setTimeout(() => {
          const area = qs("#chat-input");
          if (area) {
            area.value = pick;
            area.focus();
          }
        }, 300);
      }
    }
  });
}

/* ---------- Init UI ---------- */
export function initUI() {
  wirePersonaCards();
  wireRandomTip();
}

/* ---------- Expose helper for external use ---------- */
export function wireExtras() {
  // old compatibility
  wirePersonaCards();
  wireRandomTip();
}
