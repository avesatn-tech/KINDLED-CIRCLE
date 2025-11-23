// ui.js
// Работа с DOM: рендер ответа, управление формой и т.д.

import { askServer } from "./api.js";
import { escapeHtml } from "./helpers.js";

export function initUI() {
  const form = document.querySelector("form");
  const answerSection = document.getElementById("answer");

  if (!form) return;

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const formData = new FormData(form);
    const persona = formData.get("persona");
    const question = formData.get("question");

    // Показать временный статус
    answerSection.innerHTML = "<p>Жду ответа...</p>";

    try {
      const resp = await askServer(persona, question);
      // resp — строка с ответом (пока заглушка)
      answerSection.innerHTML = `<pre>${escapeHtml(resp)}</pre>`;
    } catch (err) {
      answerSection.innerHTML = `<p>Ошибка: ${escapeHtml(err.message || String(err))}</p>`;
    }
  });
}
