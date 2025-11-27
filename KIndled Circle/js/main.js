// js/main.js (replacement)
// Robust vanilla frontend for Embers. Uses absolute URL and lots of debug info in console.
// Works with Cloudflare Pages Functions at /api/chat and optional /api/config.

(() => {
  const DEBUG = true; // set false to quiet console logs

  const modal = document.getElementById('chatModal');
  const chatTitle = document.getElementById('chatTitle');
  const chatSubtitle = document.getElementById('chatSubtitle');
  const modalAvatar = document.getElementById('modalAvatar');
  const closeModal = document.getElementById('closeModal');
  const messagesEl = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const discordFloat = document.getElementById('discord-float');
  const discordTop = document.getElementById('discord-top');

  const CHARACTERS = {
    seer: { name: 'Seer', avatar: 'img/seer.png', desc: 'Lorekeeper & advice on magic builds' },
    knight: { name: 'Knight', avatar: 'img/knight.png', desc: 'Practical tactics and weapon guides' },
    dragon: { name: 'Dragon', avatar: 'img/dragon.png', desc: 'Boss strategies and lore whispers' },
  };

  const storeKey = id => `embers_conv_${id}`;

  function log(...args) { if (DEBUG) console.log(...args); }

  // Local history helpers
  function loadHistory(id){
    try { const raw = localStorage.getItem(storeKey(id)); return raw ? JSON.parse(raw) : []; }
    catch(e){ return []; }
  }
  function saveHistory(id, arr){ try { localStorage.setItem(storeKey(id), JSON.stringify(arr)); } catch(e){} }

  // UI helpers
  function appendMessage(text, who='bot') {
    const div = document.createElement('div');
    div.className = 'message ' + (who === 'user' ? 'user' : 'bot');
    // allow some basic newlines
    div.innerText = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showErrorInChat(text) {
    appendMessage('Error: ' + text, 'bot');
  }

  function typingIndicator(show=true) {
    if (show) {
      if (!document.getElementById('typing')) {
        const t = document.createElement('div');
        t.id = 'typing';
        t.className = 'message bot';
        t.innerText = '…';
        messagesEl.appendChild(t);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    } else {
      const t = document.getElementById('typing');
      if (t) t.remove();
    }
  }

  // Open chat modal
  let currentCharacter = null;
  document.querySelectorAll('.select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openChat(btn.dataset.character);
    });
  });

  function openChat(characterId) {
    currentCharacter = characterId;
    const meta = CHARACTERS[characterId] || { name: 'Unknown', avatar: 'img/ember.png', desc: '' };
    chatTitle.textContent = meta.name;
    chatSubtitle.textContent = meta.desc + ' — Answers powered by ChatGPT';
    modalAvatar.src = meta.avatar;
    modalAvatar.alt = meta.name + ' avatar';

    messagesEl.innerHTML = '';
    const history = loadHistory(characterId);
    if (history.length === 0) {
      appendMessage(`${meta.name}: Hello. Ask me about any game — builds, bosses, lore.`, 'bot');
    } else {
      history.forEach(item => appendMessage(item.text, item.who));
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    chatInput.focus();
  }

  function closeChat() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    currentCharacter = null;
  }

  closeModal.addEventListener('click', closeChat);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeChat(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeChat(); });

  // Fetch config (discord invite etc.)
  (async () => {
    try {
      const r = await fetch('/api/config');
      if (!r.ok) return;
      const cfg = await r.json();
      if (cfg?.discordInvite) {
        if (discordFloat) discordFloat.href = cfg.discordInvite;
        if (discordTop) discordTop.href = cfg.discordInvite;
      }
    } catch (e) {
      // ignore quietly
      log('config fetch failed', e);
    }
  })();

  // Robust sendToApi using absolute URL and logging
  async function sendToApi(character, message) {
    const payload = { character, message };
    const url = `${location.origin}/api/chat`;
    log('[sendToApi] url=', url, 'payload=', payload);

    // Optional: quick check for OPTIONS preflight response (helps debugging CORS)
    try {
      const opt = await fetch(url, { method: 'OPTIONS' });
      log('[sendToApi] OPTIONS', opt.status);
      // we don't require success here; just informative
    } catch (e) {
      log('[sendToApi] OPTIONS check failed (non-fatal)', e);
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });

    log('[sendToApi] response status', resp.status, resp.statusText);

    const text = await resp.text();
    log('[sendToApi] raw response text', text);

    let data = null;
    try { data = JSON.parse(text); } catch(e) { /* keep data null */ }

    if (!resp.ok) {
      // Provide helpful error details
      const detail = data || text || `status ${resp.status}`;
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }

    if (!data || typeof data.reply !== 'string') {
      throw new Error('Invalid server response (missing reply). Raw: ' + text);
    }

    return data.reply;
  }

  // Main submit handler
  chatForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    log('[chatForm] submit fired, currentCharacter=', currentCharacter);

    const message = chatInput.value.trim();
    if (!message) return;
    if (!currentCharacter) return showErrorInChat('No character selected.');

    // append user message
    appendMessage(message, 'user');

    // persist user message
    const hist = loadHistory(currentCharacter);
    hist.push({ who: 'user', text: message, ts: Date.now() });
    saveHistory(currentCharacter, hist);

    chatInput.value = '';
    chatInput.disabled = true;
    typingIndicator(true);

    try {
      const reply = await sendToApi(currentCharacter, message);
      typingIndicator(false);
      appendMessage(reply, 'bot');

      hist.push({ who: 'bot', text: reply, ts: Date.now() });
      saveHistory(currentCharacter, hist);
    } catch (err) {
      typingIndicator(false);
      const msg = err?.message || String(err);
      log('[chat submit] error', msg);
      showErrorInChat(msg);
    } finally {
      chatInput.disabled = false;
      chatInput.focus();
    }
  });

  // expose helper for debugging and clearing history
  window.Embers = {
    clearHistoryFor(characterId) { localStorage.removeItem(storeKey(characterId)); },
    debug: DEBUG
  };

})();
