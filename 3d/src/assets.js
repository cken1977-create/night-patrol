// CONTENT PIPELINE — asset manifest. Every entity has a procedural fallback; set `src` to a .glb
// (Synty / Meshy / Kenney / Quaternius export) and the game will load it instead. See docs/CONTENT_PIPELINE.md.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export const ASSETS = {
  // Heroes: rigged humanoid + animation set (Quaternius Universal Animation Library, CC0). Hero looks come from
  // suit attachments in character.js. Swap any hero for a custom rigged GLB that uses the same rig/clip names.
  hero_weaver: { src: 'assets/ual_mannequin.glb', scale: 1, yOffset: 0, license: 'CC0 Quaternius UAL' },
  hero_blaster: { src: 'assets/ual_mannequin.glb', scale: 1, yOffset: 0, license: 'CC0 Quaternius UAL' },
  hero_shade: { src: 'assets/ual_mannequin.glb', scale: 1, yOffset: 0, license: 'CC0 Quaternius UAL' },
  enemy_wisp: { src: null, scale: 1, yOffset: 0, license: 'procedural (CC0)' },
  boss_hollow_king: { src: null, scale: 1, yOffset: 0, license: 'procedural (CC0)' },
  prop_beacon: { src: null, scale: 1, yOffset: 0, license: 'procedural (CC0)' }
};
const loader = new GLTFLoader(); const cache = new Map();
export async function loadModel(key, fallback) {
  const a = ASSETS[key]; if (!a || !a.src) return fallback();
  try { if (!cache.has(key)) cache.set(key, loader.loadAsync(a.src)); const g = await cache.get(key);
    const m = g.scene.clone(true); m.scale.setScalar(a.scale); m.position.y += a.yOffset; m.userData.animations = g.animations; return m;
  } catch (e) { console.warn('asset fallback', key, e); return fallback(); }
}
export async function loadGLTF(src) { if (!cache.has(src)) cache.set(src, loader.loadAsync(src)); return cache.get(src); }
export const PRECACHE = Object.values(ASSETS).filter(a => a.src).map(a => a.src);
