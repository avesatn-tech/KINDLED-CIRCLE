// helpers.js
// Небольшие утилитарные функции.

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function qs(sel, ctx = document) {
  return ctx.querySelector(sel);
}

export function qsa(sel, ctx = document) {
  return Array.from(ctx.querySelectorAll(sel));
}
