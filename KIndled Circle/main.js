// main.js — Sigward speech bubble + persona selection helpers
// Replace the project's main.js with this file.
// Assumes .sigward-floating-img exists in the DOM and images live in img/ (production).

/* 
 NOTE: if you previewed the Sigward from a session path during testing,
 the path was: /mnt/data/sigward.png
 In production images should live at: img/sigward.png
 This script relies on the DOM element for the image, not on an explicit path.
*/

(function () {
  'use strict';

  const BUBBLE_ID = 'sigward-speech-bubble';
  const DEFAULT_TEXT = 'Hmm… hmm…';
  const AUTO_HIDE_MS = 4600; // how long bubble remains (ms)

  // Helper: create element with classes + attrs
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.keys(props).forEach((k) => {
      if (k === 'style') Object.assign(node.style, props[k]);
      else if (k === 'dataset') Object.assign(node.dataset, props[k]);
      else node.setAttribute(k, props[k]);
    });
    children.forEach((c) => node.appendChild(c));
    return node;
  }

  // Build the bubble DOM (comic style)
  function buildBubble() {
    // container
    const bubble = el('div', {
      id: BUBBLE_ID,
    });

    // main bubble box
    const box = el('div', { class: 'sig-bubble-box', role: 'dialog', 'aria-live': 'polite' });
    const textWrap = el('div', { class: 'sig-bubble-text' });
    box.appendChild(textWrap);

    // tail (CSS will rotate/position it)
    const tail = el('div', { class: 'sig-bubble-tail' });

    // assemble
    bubble.appendChild(box);
    bubble.appendChild(tail);

    // inject light styles so we don't require extra CSS edits
    injectBubbleStyles();

    return { bubble, textWrap, box, tail };
  }

  // Inline CSS for the speech bubble (keeps everything self-contained)
  function injectBubbleStyles() {
    if (document.getElementById('sigward-bubble-styles')) return;

    const css = `
/* Sigward speech bubble (inserted by main.js) */
#${BUBBLE_ID} {
  position: absolute;
  z-index: 1200;
  pointer-events: auto;
  display: block;
  transform-origin: right bottom;
}
#${BUBBLE_ID} .sig-bubble-box {
  max-width: 260px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.96));
  color: #111;
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  font-size: 14px;
  line-height: 1.25;
  border: 1px solid rgba(0,0,0,0.06);
  letter-spacing: 0.2px;
  -webkit-font-smoothing:antialiased;
}
#${BUBBLE_ID} .sig-bubble-text {
  min-height: 20px;
  white-space: pre-wrap;
  word-break: break-word;
  color: #0b0b0b;
}
#${BUBBLE_ID} .sig-bubble-tail {
  position: absolute;
  width: 18px;
  height: 18px;
  right: -8px;
  bottom: -8px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.96));
  transform: rotate(45deg);
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 6px 14px rgba(0,0,0,0.18);
  border-radius: 2px;
  z-index: -1;
}

/* little "comic" outline to the left of the text — optional accent */
#${BUBBLE_ID} .sig-bubble-box::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, rgba(224,122,46,0.95), rgba(224,122,46,0.7));
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  opacity: 0.08;
}

/* quick fade / scale in */
#${BUBBLE_ID}.show {
  animation: sig-bubble-in .18s ease forwards;
}
@keyframes sig-bubble-in {
  from { opacity: 0; transform: scale(.98) translateY(4px); }
  to { opacity: 1; transform: none; }
}
`;

    const s = document.createElement('style');
    s.id = 'sigward-bubble-styles';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  // Position bubble to left of the target element (sigward) with nice offset.
  function positionBubble(bubbleEl, targetEl) {
    const padding = 8;
    const rect = targetEl.getBoundingClientRect();
    const contRect = getContainerRect(); // .container as reference

    // Calculate bubble position so it visually sits left of the image, slightly up
    // Bubble right edge aligns approx with target left edge minus a small gap.
    // Convert to page coords (account for scroll)
    const pageX = rect.left + window.pageXOffset;
    const pageY = rect.top + window.pageYOffset;

    // If container exists we want bubble positioned relative to viewport but absolutely
    // placed into document.body. We'll set left/top in page coordinates.
    // Prefer to attach bubble as child of body; we'll set style.left/top absolute.

    // measure bubble size if it's in DOM
    const box = bubbleEl.querySelector('.sig-bubble-box');
    // temporarily make visible offscreen to measure
    bubbleEl.style.left = '-9999px';
    bubbleEl.style.top = '-9999px';
    if (!document.body.contains(bubbleEl)) document.body.appendChild(bubbleEl);
    const bRect = box.getBoundingClientRect();

    // target left minus bubble width and a small gap
    const left = pageX - bRect.width - padding - 10; // 10px gap from sigward
    // vertically center bubble to appear near the top third of the sigward image
    const top = pageY + (rect.height * 0.08) - (bRect.height * 0.2);

    // ensure bubble doesn't go off-screen on the left — if it would, clamp it to 12px
    const safeLeft = Math.max(left, pageX - bRect.width - 12, window.pageXOffset + 8);

    bubbleEl.style.position = 'absolute';
    bubbleEl.style.left = `${safeLeft}px`;
    bubbleEl.style.top = `${Math.max(top, window.pageYOffset + 8)}px`;
  }

  function getContainerRect() {
    const container = document.querySelector('.container');
    return container ? container.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  }

  // Typewriter effect: fills textNode with characters with a small delay.
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
        // a little longer pause for punctuation
        const isPunct = /[.,!?…]/.test(ch);
        setTimeout(step, isPunct ? punctuationDelay : delay);
      }
      step();
    });
  }

  // Public: toggle bubble for target element
  function attachSigwardBubble(targetSelector = '.sigward-floating-img') {
    const target = document.querySelector(targetSelector);
    if (!target) {
      // nothing to attach to
      console.warn('[main.js] Sigward element not found:', targetSelector);
      return;
    }

    let bubbleState = {
      el: null,
      textNode: null,
      timer: null,
      visible: false,
    };

    function showBubble() {
      // Remove existing if present
      hideBubble(true);

      const { bubble, textWrap } = buildBubble();
      bubble.classList.add('show');

      // attach to body
      document.body.appendChild(bubble);
      bubbleState.el = bubble;
      bubbleState.textNode = textWrap;

      // place it now
      positionBubble(bubble, target);

      // typewriter the phrase
      typeText(textWrap, DEFAULT_TEXT, { delay: 36, punctuationDelay: 240 }).then(() => {
        // after typing, keep visible for a while then remove
      });

      bubbleState.visible = true;

      // auto-hide
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
      bubbleState.textNode = null;
      bubbleState.visible = false;

      if (immediate) {
        if (el.parentNode) el.parentNode.removeChild(el);
      } else {
        // fade-out quickly
        el.style.transition = 'opacity .14s ease, transform .14s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(6px) scale(.99)';
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 160);
      }
    }

    // Toggle handler
    function toggleHandler(e) {
      e.stopPropagation();
      if (bubbleState.visible) {
        hideBubble();
      } else {
        showBubble();
      }
    }

    target.addEventListener('click', toggleHandler);

    // Close bubble on outside click
    document.addEventListener('click', (ev) => {
      // if bubble visible and click outside of it and not on target, close
      if (!bubbleState.visible) return;
      const bubbleEl = bubbleState.el;
      if (!bubbleEl) return;
      if (ev.target === target || target.contains(ev.target)) return;
      if (bubbleEl.contains(ev.target)) return;
      hideBubble();
    });

    // Reposition on resize/scroll to keep bubble aligned
    window.addEventListener('resize', () => {
      if (bubbleState.visible && bubbleState.el) {
        positionBubble(bubbleState.el, target);
      }
    });
    window.addEventListener('scroll', () => {
      if (bubbleState.visible && bubbleState.el) {
        positionBubble(bubbleState.el, target);
      }
    }, { passive: true });
  }

  // Kick things off once DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => attachSigwardBubble());
  } else {
    attachSigwardBubble();
  }

  // Export for debugging (optional)
  window.__embersSigward = {
    attach: attachSigwardBubble,
    hide: () => {
      const el = document.getElementById(BUBBLE_ID);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  };
})();
