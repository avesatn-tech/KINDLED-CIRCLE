// Add this into js/ui.js
// Exported helper: call initPersonaUI() after initUI() in main.js
export function initPersonaUI() {
  // idempotent guard
  if (window.__initPersonaUI_done) return;
  window.__initPersonaUI_done = true;
  console.info('[ui] initPersonaUI starting');

  // hero CTA pulse
  const heroCTA = document.querySelector('.hero-cta .btn.ghost');
  if (heroCTA && !heroCTA.classList.contains('pulse')) {
    heroCTA.classList.add('pulse');
  }

  // fallback chat opener (tries common app hooks, otherwise writes to placeholder)
  function openChatForPersona(personaKey, personaTitle) {
    const tryNames = ['openConversation', 'openChat', 'selectPersona', 'startConversation', 'initChatForPersona'];
    for (const name of tryNames) {
      const fn = window[name];
      if (typeof fn === 'function') {
        try {
          fn(personaKey);
          console.info('[ui] used', name, 'for', personaKey);
          return;
        } catch (err) {
          console.warn('[ui] error calling', name, err);
        }
      }
    }
    // fallback: render minimal chat preview
    const chat = document.querySelector('#chat-placeholder');
    if (chat) {
      chat.innerHTML = `
        <div style="padding:1.25rem;color:var(--text);">
          <h3 style="margin:0 0 .5rem;">Conversation — ${personaTitle}</h3>
          <div style="color:var(--muted)">Lightweight fallback. Replace with your full chat initialization if needed.</div>
        </div>`;
      chat.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn('[ui] no #chat-placeholder found to render fallback chat');
    }
  }

  // attach handlers to Select buttons
  function attachSelectHandlers() {
    const buttons = Array.from(document.querySelectorAll('.btn.small.select-btn'));
    if (!buttons.length) {
      console.warn('[ui] no select buttons found');
      return;
    }
    buttons.forEach(btn => {
      if (btn.__ui_bound) return;
      btn.__ui_bound = true;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // find persona card
        const card = btn.closest('.persona.card') || btn.closest('.persona-card') || btn.closest('article[data-persona]');
        if (!card) { console.warn('[ui] select clicked but card not found'); return; }
        const key = card.getAttribute('data-persona') || card.dataset.persona || 'persona';
        const titleEl = card.querySelector('h3');
        const title = titleEl ? titleEl.textContent.trim() : key;
        console.info('[ui] select pressed for', key);

        // micro animation feedback
        try { btn.animate([{ transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' }); } catch(e){}

        // open chat (uses either existing app hook or fallback)
        openChatForPersona(key, title);

        // mark selection visually
        document.querySelectorAll('.persona.card.selected').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });
  }

  // make sure event handlers reattach on DOM changes (cards rerender)
  const container = document.querySelector('.persona-cards') || document.querySelector('main');
  if (container) {
    const mo = new MutationObserver(() => attachSelectHandlers());
    mo.observe(container, { childList: true, subtree: true });
    // keep ref to disconnect later if needed
    window.__initPersonaUI_mo = mo;
  }

  // initial attach
  attachSelectHandlers();

  // ensure hero CTA click micro-feedback (only once)
  if (heroCTA && !heroCTA.__ui_heroBound) {
    heroCTA.addEventListener('click', () => {
      try { heroCTA.animate([{ transform:'scale(1)' }, { transform:'scale(0.98)' }, { transform:'scale(1)' }], { duration: 220, easing:'ease' }); } catch(e){}
    });
    heroCTA.__ui_heroBound = true;
  }

  console.info('[ui] initPersonaUI ready');
}
