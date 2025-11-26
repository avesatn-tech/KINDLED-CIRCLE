// js/ui.js
// Exports: initUI(), createEmbers(count), initPersonaUI()
// Single file for UI wiring, ember particles, select handlers and fallback chat.

export function initUI() {
  if (window.__initUI_done) return;
  window.__initUI_done = true;
  console.info('[ui] initUI');

  // keyboard accessibility for persona cards
  const cards = Array.from(document.querySelectorAll('.persona.card'));
  cards.forEach(card => {
    card.setAttribute('role','button');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const btn = card.querySelector('.select-btn');
        if (btn) btn.click();
      }
    });
  });
}


// Ember particles (canvas)
export function createEmbers(num = 14) {
  const canvas = document.getElementById('embers-canvas');
  if (!canvas) {
    console.warn('[ui] no embers canvas found');
    return;
  }

  function resize() {
    const hero = document.querySelector('.hero-inner');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    canvas.width = Math.max(320, Math.round(rect.width));
    canvas.height = Math.round(Math.min(180, rect.height));
    const top = window.scrollY + rect.top;
    const left = window.scrollX + rect.left;
    canvas.style.top = top + 'px';
    canvas.style.left = left + 'px';
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', resize, { passive: true });

  const ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'lighter';

  const particles = [];
  const count = Math.max(6, Math.min(60, num));

  function rand(min, max) { return min + Math.random() * (max - min); }

  for (let i = 0; i < count; i++) {
    particles.push({
      x: rand(canvas.width * 0.05, canvas.width * 0.95),
      y: rand(canvas.height * 0.35, canvas.height * 0.9),
      vx: rand(-0.06, 0.06),
      vy: rand(-0.08, -0.28),
      life: rand(1.6, 4.4),
      age: rand(0, 4.4),
      size: rand(1.6, 5.2),
      hue: rand(24, 38),
      glow: rand(6, 16)
    });
  }

  let last = performance.now();
  function step(ts) {
    const dt = (ts - last) / 1000;
    last = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let p of particles) {
      p.age += dt;
      if (p.age > p.life) {
        p.x = rand(canvas.width * 0.1, canvas.width * 0.9);
        p.y = canvas.height - rand(6, 18);
        p.vx = rand(-0.06, 0.06);
        p.vy = rand(-0.18, -0.35);
        p.age = 0;
        p.life = rand(1.6, 4.4);
        p.size = rand(1.6, 5.2);
        p.hue = rand(24, 38);
        p.glow = rand(6, 16);
      }

      p.x += p.vx * (50 * dt);
      p.y += p.vy * (50 * dt);
      p.vx += (Math.random() - 0.5) * 0.01;
      p.vy -= 0.005 * dt;

      const t = Math.max(0, Math.min(1, p.age / p.life));
      const alpha = (1 - t) * 0.95;

      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glow);
      const color = `hsla(${p.hue},90%,55%,${Math.min(0.36, alpha*0.36)})`;
      grd.addColorStop(0, color);
      grd.addColorStop(0.6, `hsla(${p.hue},80%,45%,${Math.min(0.12, alpha*0.12)})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.glow, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = `hsla(${p.hue},95%,65%,${Math.min(1, alpha*1.0)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - t*0.5), 0, Math.PI*2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
  window.__embers_canvas = canvas;
}


/* ===============================
   Select handlers + fallback chat
   (initPersonaUI)
   =============================== */
export function initPersonaUI() {
  if (window.__initPersonaUI_done) return;
  window.__initPersonaUI_done = true;
  console.info('[ui] initPersonaUI');

  function tryAppHooks(personaKey) {
    const names = ['openConversation','openChat','selectPersona','startConversation','initChatForPersona','openPersonaChat'];
    for (const name of names) {
      const fn = window[name];
      if (typeof fn === 'function') {
        try { fn(personaKey); console.info('[ui] used hook', name); return true; } catch(e){ console.warn('[ui] hook error', name, e); }
      }
    }
    return false;
  }

  function fallbackOpenChat(personaKey, personaTitle) {
    const target = document.querySelector('#chat') || document.querySelector('#chat-placeholder') || document.querySelector('main');
    if (!target) { console.warn('[ui] no chat target for fallback'); return; }
    const wrap = document.createElement('div');
    wrap.className = 'restore-chat-fallback';
    wrap.style.padding = '1rem';
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <strong style="font-size:16px">${personaTitle || personaKey}</strong>
        <span style="color:var(--muted,#9aa0a6);font-size:13px">— conversation</span>
      </div>
      <div style="color:var(--muted,#9aa0a6);margin-bottom:12px">This is a lightweight fallback chat. Replace with your chat init.</div>
      <div style="display:flex;gap:8px">
        <input placeholder="Ask the persona..." style="flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,0.02);color:var(--text);">
        <button class="btn small select-btn" style="padding:10px 14px;border-radius:8px">Send</button>
      </div>
    `;
    if (target.id === 'chat' || target.id === 'chat-placeholder') target.innerHTML = '';
    target.appendChild(wrap);
    wrap.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function openChatForPersona(personaKey, personaTitle) {
    if (tryAppHooks(personaKey)) return;
    fallbackOpenChat(personaKey, personaTitle);
  }

  function microTap(el) {
    try { el.animate([{ transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' }); } catch(e) {}
  }

  function attachSelectHandlers(root = document) {
    const buttons = Array.from((root || document).querySelectorAll('.btn.small.select-btn'));
    if (!buttons.length) console.info('[ui] attachSelectHandlers: none found (yet)');
    buttons.forEach(btn => {
      if (btn.__initPersonaUI_bound) return;
      btn.__initPersonaUI_bound = true;
      btn.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        microTap(btn);
        const card = btn.closest('.persona.card') || btn.closest('.persona-card') || btn.closest('article[data-persona]');
        if (!card) { console.warn('[ui] select clicked but card not found'); return; }
        const key = card.getAttribute('data-persona') || card.dataset.persona || card.id || 'persona';
        const titleEl = card.querySelector('h3');
        const title = titleEl ? titleEl.textContent.trim() : key;
        document.querySelectorAll('.persona.card.selected').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        openChatForPersona(key, title);
      });
    });
  }

  (function ensureHeroCTA() {
    const heroCTA = document.querySelector('.hero-cta .btn.ghost');
    if (!heroCTA) return;
    if (!heroCTA.classList.contains('pulse')) heroCTA.classList.add('pulse');
    if (!heroCTA.__initPersonaUI_heroBound) {
      heroCTA.addEventListener('click', () => { try { heroCTA.animate([{ transform:'scale(1)'},{ transform:'scale(0.98)'},{ transform:'scale(1)' }], { duration: 220 }); } catch(e){} });
      heroCTA.__initPersonaUI_heroBound = true;
    }
  })();

  attachSelectHandlers(document);
  const container = document.querySelector('.persona-cards') || document.querySelector('main') || document.body;
  const mo = new MutationObserver(() => attachSelectHandlers(document));
  mo.observe(container, { childList: true, subtree: true });
  window.__initPersonaUI_mo = mo;
  window.__openChatForPersona = openChatForPersona;
  console.info('[ui] initPersonaUI ready');
}
