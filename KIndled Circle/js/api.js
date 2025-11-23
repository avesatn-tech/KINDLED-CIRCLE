// api.js
// Функции для общения с бэкендом или внешним API.
// Пример: export async function askServer(persona, question) { ... }

export async function askServer(persona, question) {
  // TODO: реализовать вызов к серверу или к локальному endpoint
  // Пример fetch:
  // const resp = await fetch('/ask', { method: 'POST', body: new FormData(form) });
  // return resp.text();
  return Promise.resolve("Ответ-пустышка: ещё не подключено.");
}
