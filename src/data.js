const W = 960, H = 540;
const HEROES = {
  weaver: { name: 'WEAVER', special: 'SWING', color: 0x2fb7ff, desc: 'Web-slinger. Hold SWING near glowing hooks to swing over rooftops!',
    tip: 'Hold SWING to shoot a web line to the nearest glowing hook. Push the stick to pump the swing, let go to fling!' },
  blaster: { name: 'BLASTER', special: 'JET', color: 0xffa630, desc: 'Gadget hero. Triple-shot arm cannon and a rocket jetpack.',
    tip: 'BLAST fires a triple shot. Hold JET to fly (watch your fuel bar).' },
  shade: { name: 'SHADE', special: 'DASH', color: 0x9b5cff, desc: 'Stealth hero. Shadow-dash through monsters and vanish from sight.',
    tip: 'Tap DASH to zip through monsters (it hurts them!). After a dash, monsters lose track of you.' }
};
const HERO_KEYS = Object.keys(HEROES);
const COLORS = [0x2fb7ff, 0xff3b5c, 0x39e27a, 0xffa630, 0x9b5cff, 0xf5f5f5];
const MISSIONS = [
  { title: 'Mission 1: Lights Out', short: 'M1 Lights Out', type: 'beacons', count: 4, len: 5600, seed: 7, cap: 7,
    brief: 'Shadow creatures swallowed the city lights! Light 4 rooftop beacons, then reach the glowing door at the clock tower.' },
  { title: 'Mission 2: Lost & Found', short: 'M2 Lost & Found', type: 'pets', count: 4, len: 6600, seed: 21, cap: 10,
    brief: 'Four pets are lost in the haunted streets. Find them all, then get to the clock tower door.' },
  { title: 'Final: The Hollow King', short: 'BOSS', type: 'boss', len: 1920, cap: 0,
    brief: 'The Hollow King rises over the clock tower. Pop him into sparks to bring back the dawn!' }
];
const Save = {
  key: 'nightpatrol_v1',
  data: null,
  load() {
    try { this.data = JSON.parse(localStorage.getItem(this.key)); } catch (e) {}
    if (this.data && this.data.v !== 2) { this.data.scary = false; this.data.v = 2; } // v2: bright daytime is the default
    if (!this.data) this.data = { v: 2, players: 1, scary: false, unlocked: 0, mission: 0, sound: true,
      p: [{ hero: 'weaver', color: 0x2fb7ff, name: 'Walker' }, { hero: 'blaster', color: 0xffa630, name: 'Player 2' }] };
    return this.data;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} }
};
const TXT = (size, color = '#ffffff', extra = {}) => Object.assign({ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontSize: size + 'px', color, fontStyle: 'bold', stroke: '#05030c', strokeThickness: Math.max(2, size / 6) }, extra);

function makeBtn(scene, x, y, w, h, label, cb, color = 0x3a2d6b, size = 20) {
  const c = scene.add.container(x, y); const g = scene.add.graphics(); const t = scene.add.text(0, 0, label, TXT(size)).setOrigin(0.5);
  c.add([g, t]); c.setSize(w, h); c.setInteractive({ useHandCursor: true });
  const draw = (col, a = 0.9) => { g.clear(); g.fillStyle(col, a); g.fillRoundedRect(-w / 2, -h / 2, w, h, 12); g.lineStyle(2, 0xb9a6ff, 0.8); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12); };
  c.color = color; draw(color);
  c.on('pointerdown', () => { draw(0x7a5cff); }); c.on('pointerout', () => draw(c.color));
  c.on('pointerup', () => { draw(c.color); SFX.init(); cb && cb(); });
  c.setColor = (col) => { c.color = col; draw(col); }; c.setLabel = (s) => t.setText(s); c.txt = t;
  return c;
}
