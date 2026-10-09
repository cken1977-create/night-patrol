// VERSIONED SAVE — shared with the classic game (same localStorage key). Device-only, no network.
const KEY = 'nightpatrol_v1', VERSION = 3;
const DEFAULT_P = { hero: 'weaver', color: 0x2fb7ff, accent: 0x9ff7ff, suit: 'classic', emblem: 'hex', name: 'Walker' };
export function loadSave() {
  let s = {}; try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  // migrations
  if (!s.v || s.v < 2) { s.scary = false; } // v2: bright day default
  s.v = VERSION; s.p = s.p && s.p.length ? s.p : [{ ...DEFAULT_P }];
  s.p = s.p.map(p => ({ ...DEFAULT_P, ...p }));
  if (s.scary === undefined) s.scary = false;
  s.best3d = s.best3d || {};
  return s;
}
export function writeSave(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
