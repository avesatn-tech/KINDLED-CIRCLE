// main.js (type="module")
import { initUI, createEmbers } from "./js/ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initUI();         // wire form and UI
  createEmbers(14); // spawn ember particles
});
