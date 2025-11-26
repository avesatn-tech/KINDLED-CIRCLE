// js/main.js (type="module")
import { initUI, createEmbers, initPersonaUI } from './js/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  try { initUI(); } catch (e) { console.error('[main] initUI failed', e); }
  try { createEmbers(28); } catch (e) { console.error('[main] createEmbers failed', e); }
  try { initPersonaUI(); } catch (e) { console.error('[main] initPersonaUI failed', e); }
});
