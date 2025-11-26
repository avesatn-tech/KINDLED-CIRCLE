// js/main.js
// Frontend chat UI + API stub for /api/chat
// Expects a backend route POST /api/chat that accepts:
// { character: "seer"|"knight"|"dragon", message: "..." }
// and returns JSON: { reply: "..." }

(() => {
  const modal = document.getElementById('chatModal');
  const chatTitle = document.getElementById('chatTitle');
  const chatSubtitle = document.getElementById('chatSubtitle');
  const modalAvatar = document.getElementById('modalAvatar');
  const closeModal = document.getElementById('closeModal');
  const messagesEl = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  // Character metadata (images and short descriptors)
  const CHARACTERS = {
    seer: { name: 'Seer', avatar: 'img/seer.png', desc: 'Lorekeeper & advice on magic builds' },
    knight: { name: 'Knight', avatar: 'img/knight.png', desc: 'Practical tactics and weapon guides' },
    dragon: { name: 'Dragon', avatar: 'img/dragon.png', desc: 'Boss strategies and lore whispers' },
  };

  // Local conversation store keyed by character
  const storeKey = (id) => `embers_conv_${id}`;
  function loadHistory(id){
    try {
      const raw = localStorage.getItem(storeKey(id));
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }
  function saveHistory(id, arr){
    try { localStorage.setItem(storeKey(id), JSON.stringify(arr)); } catch(e){}
  }

  // Render helpers
  function appendMessage(text, who='bot'){
    const div = document.createElement('div');
    div.className = 'message ' + (who === 'user' ? 'user' : 'bot');
    div.innerText = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight - messagesEl.clientHeight;
    return div;
  }

  // Character selection handling
  let currentCharacter = null;
  document.querySelectorAll('.select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const char = btn.dataset.character;
      openChat(char);
    });
  });

  closeModal.addEventListener('click', closeChat);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeChat();
  });

  function openChat(characterId){
    currentCharacter = characterId;
    const meta = CHARACTERS[characterId] || { name:'Unknown', avatar:'img/ember.png', desc:'' };
    chatTitle.textContent = meta.name;
    chatSubtitle.textContent = meta.desc + ' — Answers powered by ChatGPT';
    modalAvatar.src = meta.avatar;
    modalAvatar.alt = meta.name + ' avatar';

    // load and render history
    messagesEl.innerHTML = '';
    const history = loadHistory(characterId);
    if (history.length === 0) {
      appendMessage(`${meta.name}: Hello. Ask me about any game — builds, bosses, lore.`, 'bot');
    } else {
      history.forEach(item => {
        appendMessage(item.text, item.who);
      });
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    chatInput.focus();
  }

  function closeChat(){
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    currentCharacter = null;
  }

  // Typing indicator
  function typingIndicator(show=true){
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

  // Send a message to backend API
  async function sendToApi(character, message) {
    // Frontend sends request to your backend. Replace /api/chat with your real route if different.
    const payload = { character, message };
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Server responded ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    // Expecting { reply: "..." }
    if (typeof data.reply !== 'string') throw new Error('Invalid response from server');
    return data.reply;
  }

  // Main submit handler
  chatForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const message = chatInput.value.trim();
    if (!message || !currentCharacter) return;
    // append user message
    appendMessage(message, 'user');

    // save to history
    const hist = loadHistory(currentCharacter);
    hist.push({ who: 'user', text: message, ts: Date.now() });
    saveHistory(currentCharacter, hist);

    chatInput.value = '';
    chatInput.disabled = true;
    typingIndicator(true);

    try {
      // Call API
      const reply = await sendToApi(currentCharacter, message);

      // remove typing and show reply
      typingIndicator(false);
      appendMessage(reply, 'bot');

      hist.push({ who: 'bot', text: reply, ts: Date.now() });
      saveHistory(currentCharacter, hist);

    } catch(err) {
      typingIndicator(false);
      appendMessage('Error: ' + err.message, 'bot');
      console.error('Chat error', err);
    } finally {
      chatInput.disabled = false;
      chatInput.focus();
    }
  });

  // keyboard shortcut to close with ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeChat();
  });

  // Clear stale history helper (exposed for convenience; not used automatically)
  window.Embers = {
    clearHistoryFor(characterId){
      localStorage.removeItem(storeKey(characterId));
    }
  };

})();
