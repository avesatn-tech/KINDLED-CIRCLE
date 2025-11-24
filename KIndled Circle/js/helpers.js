// js/helpers.js
export function qs(sel, ctx=document){ return ctx.querySelector(sel) }
export function qsa(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)) }
export function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[s]));
}
