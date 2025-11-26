// js/sigward.js (replace with this)
// Adds a Sigward speech bubble on click, without touching other modules.

export function attachSigwardBubble(selector = ".sigward-floating-img") {
  try {
    console.info('[sigward] attachSigwardBubble called, selector=', selector);
    const target =
      document.querySelector(selector) ||
      document.querySelector(".sigward-corner") ||
      document.querySelector(".decor-sigward");

    if (!target) {
      console.warn('[sigward] target not found; aborting.');
      return;
    }

    const BUBBLE_ID = "sigward-speech-bubble";
    const DEFAULT_TEXT = "Hmm… hmm…";
    const AUTO_HIDE_MS = 4600;

    injectBubbleStyles();

    let bubbleState = { el: null, timer: null, visible: false };

    target.style.cursor = "pointer";
    target.addEventListener("click", (e) => {
      e.stopPropagation();
      if (bubbleState.visible) hideBubble(true);
      else showBubble();
    });

    document.addEventListener("click", function docClickHandler(e) {
      if (!bubbleState.visible) return;
      // safe contains check (no optional chaining)
      if (bubbleState.el && bubbleState.el.contains(e.target)) return;
      if (e.target === target || target.contains(e.target)) return;
      hideBubble();
    });

    window.addEventListener(
      "resize",
      () => {
        if (bubbleState.visible && bubbleState.el) positionBubble(bubbleState.el, target);
      },
      { passive: true }
    );

    window.addEventListener(
      "scroll",
      () => {
        if (bubbleState.visible && bubbleState.el) positionBubble(bubbleState.el, target);
      },
      { passive: true }
    );

    function showBubble() {
      hideBubble(true);

      const { bubble, textWrap } = buildBubble();
      document.body.appendChild(bubble);

      bubbleState.el = bubble;
      bubbleState.visible = true;

      positionBubble(bubble, target);

      typeText(textWrap, DEFAULT_TEXT, {
        delay: 35,
        punctuationDelay: 240,
      }).catch(()=>{ /* ignore */ });

      bubbleState.timer = setTimeout(() => hideBubble(), AUTO_HIDE_MS);
    }

    function hideBubble(immediate = false) {
      if (bubbleState.timer) { clearTimeout(bubbleState.timer); bubbleState.timer = null; }

      if (!bubbleState.el) return;

      const el = bubbleState.el;
      bubbleState.el = null;
      bubbleState.visible = false;

      if (immediate) {
        if (el.parentNode) el.parentNode.removeChild(el);
        return;
      }

      el.style.transition = "opacity .15s ease, transform .15s ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(6px) scale(0.96)";
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 160);
    }

    function buildBubble() {
      const wrap = document.createElement("div");
      wrap.id = BUBBLE_ID;

      const box = document.createElement("div");
      box.className = "sig-bubble-box";

      const textWrap = document.createElement("div");
      textWrap.className = "sig-bubble-text";

      const tail = document.createElement("div");
      tail.className = "sig-bubble-tail";

      box.appendChild(textWrap);
      wrap.appendChild(box);
      wrap.appendChild(tail);

      return { bubble: wrap, textWrap };
    }

    function positionBubble(bubble, target) {
      const rect = target.getBoundingClientRect();
      // ensure box is attached to document to measure
      const box = bubble.querySelector('.sig-bubble-box');
      bubble.style.left = '-9999px';
      bubble.style.top = '-9999px';
      if (!document.body.contains(bubble)) document.body.appendChild(bubble);
      const bRect = box.getBoundingClientRect();

      const left = rect.left + window.pageXOffset - bRect.width - 14;
      const top = rect.top + window.pageYOffset - bRect.height * 0.25;

      bubble.style.position = 'absolute';
      bubble.style.left = Math.max(left, window.pageXOffset + 8) + 'px';
      bubble.style.top = Math.max(top, window.pageYOffset + 8) + 'px';
    }

    function typeText(node, text, opts = {}) {
      return new Promise((resolve) => {
        let i = 0;
        const delay = opts.delay || 30;
        const punct = opts.punctuationDelay || 200;

        node.textContent = '';
        function tick() {
          if (i >= text.length) { resolve(); return; }
          const ch = text[i++];
          node.textContent += ch;
          const d = /[.,!?…]/.test(ch) ? punct : delay;
          setTimeout(tick, d);
        }
        tick();
      });
    }

    function injectBubbleStyles() {
      if (document.getElementById("sigward-bubble-styles")) return;

      const css = `
#${BUBBLE_ID} {
  position: absolute;
  z-index: 9999;
  pointer-events: auto;
}
#${BUBBLE_ID} .sig-bubble-box {
  max-width: 240px;
  background: #fafafa;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
  color: #0d0d0d;
  font-family: Inter, sans-serif;
  font-size: 14px;
}
#${BUBBLE_ID} .sig-bubble-tail {
  position: absolute;
  width: 16px;
  height: 16px;
  right: -6px;
  bottom: -6px;
  transform: rotate(45deg);
  background: #fafafa;
  box-shadow: 0 6px 14px rgba(0,0,0,0.28);
}
`;
      const style = document.createElement("style");
      style.id = "sigward-bubble-styles";
      style.textContent = css;
      document.head.appendChild(style);
    }
  } catch (err) {
    console.error('[sigward] attachSigwardBubble error:', err);
  }
}
