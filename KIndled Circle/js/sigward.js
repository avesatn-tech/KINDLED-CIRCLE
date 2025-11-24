// js/sigward.js
// Export: attachSigwardBubble(selector = '.sigward-floating-img')
// Purpose: non-invasive Sigward click => comic-style speech bubble to the left.
// Designed to be independent of other modules and to not touch ui.js.

export function attachSigwardBubble(selector = '.sigward-floating-img') {
  if (typeof document === 'undefined') return;
  const target = document.querySelector(selector) || document.querySelector('.sigward-corner') || document.querySelector('.decor-sigward');
  if (!target) {
    // nothing to attach to
    // console.warn('attachSigwardBubble: target not found', selector);
    return;
  }

  const BUBBLE_ID = 'sigward-speech-bubble';
  const DEFAULT_TEXT = 'Hmm… hmm…';
  const AUTO_HIDE_MS = 4600;

  // inject styles once
  injectBubbleStyles();

  let bubbleState = { el: null, timer: null, visible: false };

  // main toggle
  target.style.cursor = 'pointer';
  target.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bubbleState.visible) {
      hideBubble(true);
    } else {
      showBubble();
    }
  });

  // close on outside click
  document.addEventListener('click', (ev) => {
    if (!bubbleState.visible) return;
    if (bubbleState.el && (bubbleState.el.contains(ev.target) || target.contains(ev.target))) return;
    hideBubble();
  });

  // reposition on scroll/resize
  window.addEventListener('resize', () => {
    if (bubbleState.visible && bubbleState.el) positionBubble(bubbleState.el, target);
  }, { passive: true });
  window.addEventListener('scroll', () => {
    if (bubbleState.visible && bubbleState.el) positionBubble(bubbleState.el, target);
  }, { passive: true });

  // BUILD / SHOW / HIDE

  function buildBubble() {
    const bubble = document.createElement('div');
    bubble.id = BUBBLE_ID;
    bubble.className = 'sigward-bubble';

    const box = document.createElement('div');
    box.className = 'sig-bubble-box';
    box.setAttribute('role','dialog');
    box.setAttribute('aria-live','polite');

    const textWrap = document.createElement('div');
    textWrap.className = 'sig-bubble-text';
    box.appendChild(textWrap);

    const tail = document.createElement('div');
    tail.className = 'sig-bubble-tail';

    bubble.appendChild(box);
    bubble.appendChild(tail);

    return { bubble, textWrap, box, tail };
  }

  function showBubble() {
    hideBubble(true); // remove any existing (defensive)
    const { bubble, textWrap } = buildBubble();
    bubble.classList.add('show');
    document.body.appendChild(bubble);
    bubbleState.el = bubble;
    bubbleState.visible = true;

    positionBubble(bubble, target);

    // typewriter
    typeText(textWrap, DEFAULT_TEXT, { delay: 36, punctuationDelay: 240 }).catch(()=>{});
    bubbleState.timer = setTimeout(() => hideBubble(), AUTO_HIDE_MS);
  }

  function hideBubble(immediate = false) {
    if (bubbleState.timer) {
      clearTimeout(bubbleState.timer);
      bubbleState.timer = null;
    }
    if (!bubbleState.el) return;
    const el = bubbleState.el;
    bubbleState.el = null;
    bubbleState.visible = false;

    if (immediate) {
      if (el.parentNode) el.parentNode.removeChild(el);
    } else {
      el.style.transition = 'opacity .14s ease, transform .14s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px) scale(.99)';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 160);
    }
  }

  // typewriter helper
  function typeText(targetNode, text, opts = {}) {
    const delay = opts.delay || 30;
    const punctuationDelay = opts.punctuationDelay || 200;
    let i = 0;
    targetNode.textContent = '';
    return new Promise((resolve) => {
      function step() {
        if (i >= text.length) {
          resolve();
          return;
        }
        const ch = text[i++];
        targetNode.textContent += ch;
        const isPunct = /[.,!?…]/.test(ch);
        setTimeout(step, isPunct ? punctuationDelay : delay);
      }
      step();
    });
  }

  // Position to the LEFT of the target element, with safe clamping
  function positionBubble(bubbleEl, targetEl) {
    const padding = 8;
    const rect = targetEl.getBoundingClientRect();
    const pageX = rect.left + window.pageXOffset;
    const pageY = rect.top + window.pageYOffset;

    // ensure in DOM to measure
    const box = bubbleEl.querySelector('.sig-bubble-box');
    bubbleEl.style.left = '-9999px';
    bubbleEl.style.top = '-9999px';
    if (!document.body.contains(bubbleEl)) document.body.appendChild(bubbleEl);
    const bRect = box.getBoundingClientRect();

    const left = pageX - bRect.width - padding - 10; // 10px gap
    const top = pageY + (rect.height * 0.08) - (bRect.height * 0.2);
    const safeLeft = Math.max(left, window.pageXOffset + 8);

    bubbleEl.style.position = 'absolute';
    bubbleEl.style.left = `${safeLeft}px`;
    bubbleEl.style.top = `${Math.max(top, window.pageYOffset + 8)}px`;
  }

  // style injection (idempotent)
  function injectBubbleStyles() {
    if (document.getElementById('sigward-bubble-styles')) return;
    const css = `
/* Sigward bubble styles (js module) */
#${BUBBLE_ID} { position:absolute; z-index:1200; pointer-events:auto; display:block; transform-origin:right bottom; }
#${BUBBLE_ID} .sig-bubble-box {
  max-width: 260px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.96));
  color: #111;
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
  font-size: 14px;
  line-height: 1.25;
  border: 1px solid rgba(0,0,0,0.06);
}
#${BUBBLE_ID} .sig-bubble-text { min-height:20px; white-space:pre-wrap; word-break:break-word; color:#0b0b0b; }
#${BUBBLE_ID} .sig-bubble-tail {
  position: absolute; width:18px; height:18px; right:-8px; bottom:-8px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.96));
  transform: rotate(45deg); border:1px solid rgba(0,0,0,0.06); box-shadow:0 6px 14px rgba(0,0,0,0.18); border-radius:2px; z-index:-1;
}
#${BUBBLE_ID}.show { animation: sig-bubble-in .18s ease forwards; }
@keyframes sig-bubble-in { from { opacity:0; transform:scale(.98) translateY(4px) } to { opacity:1; transform:none } }
`;
    const s = document.createElement('style');
    s.id = 'sigward-bubble-styles';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }
}
