// js/ui.js
// Exports: initUI(), createEmbers(count)
// initUI wires nothing destructive — it's a place to put future initialization.

export function initUI() {
  // idempotent
  if (window.__initUI_done) return;
  window.__initUI_done = true;
  console.info('[ui] initUI');

  // any general wiring you need can go here (keyboard shortcuts, accessibility)
  // For now: make persona cards focusable and keyboard-selectable
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

// Ember particles (simple canvas particle system)
export function createEmbers(num = 14) {
  const canvas = document.getElementById('embers-canvas');
  if (!canvas) {
    console.warn('[ui] no embers canvas found');
    return;
  }

  // size canvas to hero-right height region
  function resize() {
    const hero = document.querySelector('.hero-inner');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(Math.min(160, rect.height));
    canvas.style.top = rect.top + 'px';
    canvas.style.left = rect.left + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  const ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'lighter';

  // create particles
  const particles = [];
  const area = canvas.width * canvas.height;
  const targetCount = Math.max(6, Math.min(60, num));

  function rand(min, max) { return min + Math.random() * (max - min); }

  for (let i=0;i<targetCount;i++){
    particles.push({
      x: rand(canvas.width * 0.1, canvas.width * 0.9),
      y: rand(canvas.height * 0.1, canvas.height * 0.85),
      vx: rand(-0.08, 0.08),
      vy: rand(-0.12, -0.3),
      life: rand(1.6, 4.4),
      age: rand(0, 4.4),
      size: rand(2, 6),
      hue: rand(24, 42),
      glow: rand(6, 18)
    });
  }

  let last = performance.now();
  function step(ts) {
    const dt = (ts - last) / 1000;
    last = ts;
    ctx.clearRect(0,0, canvas.width, canvas.height);

    for (let p of particles) {
      p.age += dt;
      if (p.age > p.life) {
        // respawn near bottom area
        p.x = rand(canvas.width * 0.12, canvas.width * 0.9);
        p.y = canvas.height - rand(6, 18);
        p.vx = rand(-0.08, 0.08);
        p.vy = rand(-0.18, -0.35);
        p.age = 0;
        p.life = rand(1.6, 4.4);
        p.size = rand(2, 6);
        p.hue = rand(24, 42);
        p.glow = rand(6, 18);
      }

      // motion
      p.x += p.vx * (40 * dt);
      p.y += p.vy * (40 * dt);
      p.vx += (Math.random()-0.5) * 0.01;
      p.vy -= 0.006 * dt; // slight lift

      // fade factor (0..1)
      const t = Math.max(0, Math.min(1, p.age / p.life));
      const alpha = (1 - t) * 0.95;

      // draw glow
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glow);
      const color = `hsla(${p.hue}, 90%, 55%, ${Math.min(0.35, alpha*0.35)})`;
      grd.addColorStop(0, color);
      grd.addColorStop(0.6, `hsla(${p.hue}, 80%, 45%, ${Math.min(0.12, alpha*0.12)})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.glow, 0, Math.PI*2);
      ctx.fill();

      // small bright core
      ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${Math.min(1, alpha*1.0)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - t*0.5), 0, Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(step);
  }

  // start loop
  requestAnimationFrame(step);

  // expose for debug
  window.__embers_canvas = canvas;
}
