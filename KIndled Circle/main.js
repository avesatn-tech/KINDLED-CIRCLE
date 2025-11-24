// main.js (type="module")
import { initUI, createEmbers } from "./js/ui.js";
import { attachSigwardBubble } from "./js/sigward.js";

document.addEventListener("DOMContentLoaded", () => {
  initUI();         // wire form and UI (unchanged)
  createEmbers(14); // spawn ember particles (unchanged)
  attachSigwardBubble(); // attach Sigward speech bubble behavior (new, non-invasive)
});
