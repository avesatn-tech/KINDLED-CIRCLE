// persona.js
// Хранение и управление персонажами / промптами.
// Экспортируем список и helper'ы.

export const PERSONAS = [
  { id: "ancient_dragon", title: "Ancient Dragon", desc: "Мудрый дракон" },
  { id: "old_knight", title: "Old Knight", desc: "Практичный рыцарь" },
  { id: "mystic_seer", title: "Mystic Seer", desc: "Пророк секретов" }
];

export function getPersonaById(id) {
  return PERSONAS.find(p => p.id === id) || PERSONAS[0];
}
