// HERO ROSTER CONFIG — add a hero by adding an entry here + (optionally) a model in assets.js.
// stats are multipliers on the base movement constants in main.js.
export const HEROES = {
  weaver: { name: 'WEAVER', special: 'SWING', role: 'Web-slinger', stats: { speed: 1.0, jump: 1.0 }, fireRate: 0.18, shots: 1,
    tip: 'Hold SWING to fire a web line at a glowing antenna and swing. Release to fling! Push into walls to climb.',
    suits: [{ id: 'classic', name: 'Classic' }, { id: 'neon', name: 'Neon Runner' }, { id: 'stealth', name: 'Stealth Weave' }] },
  blaster: { name: 'BLASTER', special: 'JET', role: 'Gadget blaster', stats: { speed: 0.95, jump: 1.0 }, fireRate: 0.3, shots: 3,
    tip: 'Hold JET to fly. BLAST fires a triple shot.',
    suits: [{ id: 'classic', name: 'Ace Pilot' }, { id: 'neon', name: 'Starfighter' }, { id: 'stealth', name: 'Night Ops' }] },
  shade: { name: 'SHADE', special: 'DASH', role: 'Stealth', stats: { speed: 1.08, jump: 1.05 }, fireRate: 0.2, shots: 1,
    tip: 'Tap DASH to zip through monsters (it hurts them!) and vanish from sight.',
    suits: [{ id: 'classic', name: 'Cloak' }, { id: 'neon', name: 'Phantom Neon' }, { id: 'stealth', name: 'Void' }] }
};
export const HERO_KEYS = Object.keys(HEROES);
export const COLORS = [0x2fb7ff, 0xff3b5c, 0x39e27a, 0xffa630, 0x9b5cff, 0xff4fd8, 0xffe14d, 0xf5f5f5];
export const ACCENTS = [0x9ff7ff, 0xff4fd8, 0xffe14d, 0x7dff8a, 0xffffff, 0xff7a1a];
export const EMBLEMS = ['hex', 'star', 'bolt', 'moon', 'heart', 'eye'];
