// All art is generated procedurally at runtime (no external image assets).
const Art = {
  mix(a, b, t) { const A = Phaser.Display.Color.IntegerToColor(a), B = Phaser.Display.Color.IntegerToColor(b);
    return Phaser.Display.Color.GetColor(A.red + (B.red - A.red) * t | 0, A.green + (B.green - A.green) * t | 0, A.blue + (B.blue - A.blue) * t | 0); },
  gfx(scene) { return scene.make.graphics({ x: 0, y: 0, add: false }); },
  bake(scene, g, key, w, h) { if (scene.textures.exists(key)) scene.textures.remove(key); g.generateTexture(key, w, h); g.destroy(); },

  hero(scene, key, type, color, frame) {
    const g = this.gfx(scene), d = this.mix(color, 0x000000, 0.55), l = this.mix(color, 0xffffff, 0.35);
    const legs = frame ? [[13, 44, 8, 15], [27, 42, 8, 14]] : [[16, 44, 8, 17], [24, 44, 8, 17]];
    if (type === 'weaver') {
      g.fillStyle(d); g.fillTriangle(16, 20, 2, frame ? 30 : 24, 8, frame ? 34 : 30); // scarf tail
      legs.forEach(r => { g.fillStyle(d); g.fillRect(...r); g.fillStyle(0x151726); g.fillRect(r[0], r[1] + r[3] - 4, r[2] + 2, 4); });
      g.fillStyle(color); g.fillRoundedRect(13, 22, 22, 24, 6);
      g.fillStyle(d); g.fillRect(13, 38, 22, 3); g.fillRect(15, 22, 18, 3);
      g.lineStyle(2, 0xffffff, 0.9); const hx = 24, hy = 31, hr = 5; const pts = [];
      for (let i = 0; i < 6; i++) pts.push(new Phaser.Math.Vector2(hx + hr * Math.cos(i * Math.PI / 3), hy + hr * Math.sin(i * Math.PI / 3)));
      g.strokePoints(pts, true); g.fillStyle(0x9ff7ff); g.fillCircle(hx, hy, 1.6);
      g.fillStyle(color); g.fillRoundedRect(7, 24, 7, 16, 3); g.fillRoundedRect(34, 24, 7, 16, 3);
      g.fillStyle(0x9ff7ff); g.fillRect(7, 36, 7, 3); g.fillRect(34, 36, 7, 3);
      g.fillStyle(color); g.fillCircle(24, 13, 11);
      g.fillStyle(d); g.fillRect(13, 17, 22, 6);
      g.fillStyle(0x11131f); g.fillRoundedRect(14, 8, 21, 8, 3);
      g.fillStyle(0x9ff7ff); g.fillRoundedRect(17, 10, 7, 4, 2); g.fillRoundedRect(26, 10, 7, 4, 2);
    } else if (type === 'blaster') {
      g.fillStyle(0x4a5068); g.fillRoundedRect(4, 22, 10, 20, 3); g.fillStyle(0xff8a3c); g.fillRect(6, 42, 6, 3);
      legs.forEach(r => { g.fillStyle(0x3a3f55); g.fillRect(...r); g.fillStyle(color); g.fillRect(r[0] - 1, r[1] + r[3] - 5, r[2] + 2, 5); });
      g.fillStyle(color); g.fillRoundedRect(13, 22, 22, 24, 6);
      g.fillStyle(l); g.fillRoundedRect(17, 26, 13, 9, 2); g.fillStyle(d); g.fillRect(13, 39, 22, 3);
      g.fillStyle(color); g.fillCircle(24, 13, 12);
      g.fillStyle(0x1b1d2b); g.fillRoundedRect(21, 8, 15, 8, 3); g.fillStyle(0xffe066); g.fillRoundedRect(23, 9, 12, 5, 2);
      g.fillStyle(0x8a90a6); g.fillRoundedRect(27, 28, 19, 9, 3); g.fillStyle(0xffffff); g.fillRect(43, 29, 4, 7);
    } else { // shade
      legs.forEach(r => { g.fillStyle(0x0d0716); g.fillRect(r[0], r[1] + 4, r[2], r[3] - 4); });
      g.fillStyle(0x1a1028); g.fillTriangle(24, 6, 6, 54, 42, 54);
      g.lineStyle(2, color, 0.9); g.strokeTriangle(24, 6, 6, 54, 42, 54);
      g.fillStyle(color, 0.8); g.fillRect(12, 36, 24, 3);
      g.fillStyle(0x0d0716); g.fillCircle(24, 15, 11);
      g.lineStyle(2, color, 0.7); g.strokeCircle(24, 15, 11);
      g.fillStyle(0x000000); g.fillCircle(26, 16, 7);
      g.fillStyle(color); g.fillRect(23, 14, 3, 2); g.fillRect(28, 14, 3, 2);
      g.fillStyle(0xffffff, 0.8); g.fillRect(24, 14, 1, 1); g.fillRect(29, 14, 1, 1);
    }
    this.bake(scene, g, key, 48, 64);
  },

  canvas(scene, key, w, h, fn) { if (scene.textures.exists(key)) return; const t = scene.textures.createCanvas(key, w, h); fn(t.getContext(), w, h); t.refresh(); },

  base(scene) {
    if (scene.textures.exists('px')) return;
    let g;
    g = this.gfx(scene); g.fillStyle(0xffffff); g.fillCircle(4, 4, 4); this.bake(scene, g, 'px', 8, 8);
    this.canvas(scene, 'light', 256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); });
    this.canvas(scene, 'glow', 128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
    this.canvas(scene, 'sky', 64, 540, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#05040f'); gr.addColorStop(0.55, '#140c2e'); gr.addColorStop(1, '#2b1640'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    this.canvas(scene, 'dawn', 64, 540, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#3a5ba8'); gr.addColorStop(0.6, '#f49b6a'); gr.addColorStop(1, '#ffd38a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    this.canvas(scene, 'moon', 160, 160, (c) => { const gr = c.createRadialGradient(80, 80, 30, 80, 80, 80);
      gr.addColorStop(0, 'rgba(255,250,220,0.5)'); gr.addColorStop(1, 'rgba(255,250,220,0)'); c.fillStyle = gr; c.fillRect(0, 0, 160, 160);
      c.fillStyle = '#f4efd2'; c.beginPath(); c.arc(80, 80, 34, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(180,170,140,0.5)'; [[70, 70, 7], [92, 88, 5], [78, 96, 4]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }); });
    const skyline = (key, col, win, seed, hmin, hmax) => this.canvas(scene, key, 1024, 360, (c, w, h) => {
      let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; let x = 0;
      while (x < w) { const bw = 40 + R() * 90, bh = hmin + R() * (hmax - hmin); c.fillStyle = col; c.fillRect(x, h - bh, bw, bh);
        if (R() < 0.3) { c.fillRect(x + bw / 2 - 2, h - bh - 30, 4, 30); }
        for (let yy = h - bh + 10; yy < h - 8; yy += 16) for (let xx = x + 6; xx < x + bw - 8; xx += 12) if (R() < 0.12) { c.fillStyle = win; c.fillRect(xx, yy, 5, 7); c.fillStyle = col; }
        x += bw + R() * 6; } });
    skyline('far', '#120c24', 'rgba(255,214,120,0.35)', 11, 80, 300);
    skyline('mid', '#0b0718', 'rgba(255,200,110,0.55)', 77, 60, 220);
    this.canvas(scene, 'fog', 512, 128, (c) => { for (let i = 0; i < 40; i++) { const x = Math.random() * 512, y = 40 + Math.random() * 60, r = 30 + Math.random() * 50;
      const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(160,140,200,0.10)'); gr.addColorStop(1, 'rgba(160,140,200,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); } });
    ['#1b1726', '#211a2e', '#161c2a'].forEach((base, v) => this.canvas(scene, 'wall' + v, 128, 128, (c) => {
      c.fillStyle = base; c.fillRect(0, 0, 128, 128); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 0, 3, 128);
      for (let yy = 12; yy < 128; yy += 32) for (let xx = 10; xx < 128; xx += 30) { const r = Math.random();
        c.fillStyle = r < 0.18 ? 'rgba(255,205,110,0.85)' : r < 0.25 ? 'rgba(120,200,255,0.5)' : '#0e0c18'; c.fillRect(xx, yy, 14, 18);
        c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(xx, yy + 18, 14, 2); } }));
    this.canvas(scene, 'ledge', 32, 14, (c) => { c.fillStyle = '#3c3552'; c.fillRect(0, 0, 32, 14); c.fillStyle = '#5a5078'; c.fillRect(0, 0, 32, 4); c.fillStyle = '#231e33'; c.fillRect(30, 0, 2, 14); });
    this.canvas(scene, 'street', 64, 64, (c) => { c.fillStyle = '#16131f'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#2a2538'; c.fillRect(0, 0, 64, 10); c.fillStyle = '#3a3450'; c.fillRect(0, 0, 64, 3);
      c.fillStyle = 'rgba(255,220,120,0.25)'; c.fillRect(8, 36, 28, 4); });
    // enemies
    g = this.gfx(scene); g.fillStyle(0x6a2cff, 0.10); g.fillCircle(24, 22, 23); g.fillStyle(0x6a2cff, 0.18); g.fillCircle(24, 22, 18);
    g.fillStyle(0x0a0612); g.fillTriangle(12, 26, 36, 26, 22, 47); g.fillCircle(24, 21, 14);
    g.fillStyle(0xb6ff4a); g.fillCircle(19, 19, 3.5); g.fillCircle(30, 19, 3.5); g.fillStyle(0xffffff); g.fillCircle(20, 18, 1); g.fillCircle(31, 18, 1);
    this.bake(scene, g, 'wisp', 48, 48);
    g = this.gfx(scene); g.fillStyle(0xff6a1a, 0.12); g.fillEllipse(32, 20, 64, 36); g.lineStyle(3, 0x0a0612);
    [[14, 30, 4, 36], [20, 30, 12, 36], [44, 30, 52, 36], [50, 30, 60, 36], [26, 28, 22, 36], [38, 28, 42, 36]].forEach(([a, b, c2, d2]) => g.lineBetween(a, b - 10, c2, d2));
    g.fillStyle(0x0a0612); g.fillEllipse(32, 19, 42, 20); g.fillStyle(0xff7a1a); g.fillCircle(42, 16, 3); g.fillCircle(49, 17, 3); g.fillCircle(46, 11, 2);
    this.bake(scene, g, 'crawler', 64, 38);
    g = this.gfx(scene); g.fillStyle(0x7d2cff, 0.15); g.fillCircle(160, 160, 158); g.fillStyle(0x07040d); g.fillCircle(160, 165, 125);
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; g.fillTriangle(160 + Math.cos(a - 0.2) * 110, 165 + Math.sin(a - 0.2) * 110, 160 + Math.cos(a + 0.2) * 110, 165 + Math.sin(a + 0.2) * 110, 160 + Math.cos(a) * 160, 165 + Math.sin(a) * 160); }
    g.fillStyle(0xeafff0); g.fillEllipse(108, 135, 62, 78); g.fillEllipse(212, 135, 62, 78); g.fillStyle(0x000000); g.fillCircle(112, 142, 7); g.fillCircle(208, 142, 7);
    g.fillStyle(0x1a0a2a); g.fillEllipse(160, 232, 190, 70); g.fillStyle(0xe8f5d0);
    for (let i = 0; i < 9; i++) { const x = 78 + i * 20; g.fillTriangle(x, 205, x + 18, 205, x + 9, 230); g.fillTriangle(x, 260, x + 18, 260, x + 9, 238); }
    g.lineStyle(6, 0x9b5cff, 0.6); g.strokeCircle(160, 165, 128);
    this.bake(scene, g, 'lurker', 320, 320);
    g = this.gfx(scene); g.fillStyle(0x7d2cff, 0.10); g.fillCircle(120, 125, 118); g.fillStyle(0x7d2cff, 0.16); g.fillCircle(120, 125, 100);
    g.fillStyle(0x07040d); g.fillCircle(120, 130, 86);
    for (let i = 0; i < 7; i++) { const x = 40 + i * 27; g.fillTriangle(x, 210, x + 26, 210, x + 13, 238); }
    g.fillStyle(0x3b1a6b); [[60, 70], [90, 52], [120, 44], [150, 52], [180, 70]].forEach(([x, y]) => g.fillTriangle(x - 14, y + 30, x + 14, y + 30, x, y - 22));
    g.fillStyle(0xd8b4ff); [[90, 50], [120, 40], [150, 50]].forEach(([x, y]) => g.fillCircle(x, y + 12, 4));
    g.fillStyle(0xffb020); g.fillEllipse(120, 125, 78, 50); g.fillStyle(0xfff0a0); g.fillEllipse(120, 120, 40, 22);
    g.fillStyle(0x200a00); g.fillEllipse(120, 125, 14, 44);
    this.bake(scene, g, 'boss', 240, 240);
    g = this.gfx(scene); g.fillStyle(0x9b5cff, 0.25); g.fillCircle(14, 14, 14); g.fillStyle(0x9b5cff, 0.6); g.fillCircle(14, 14, 9); g.fillStyle(0xf0e0ff); g.fillCircle(14, 14, 5);
    this.bake(scene, g, 'orb', 28, 28);
    g = this.gfx(scene); g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(0, 0, 28, 12, 6); g.fillStyle(0xffffff); g.fillRoundedRect(5, 3, 18, 6, 3);
    this.bake(scene, g, 'blast', 28, 12);
    // props
    [0, 1].forEach(on => { g = this.gfx(scene); g.fillStyle(0x2c2840); g.fillRect(12, 20, 5, 40); g.fillRect(4, 56, 21, 4);
      if (on) { g.fillStyle(0xffd36b, 0.3); g.fillCircle(14, 14, 14); } g.fillStyle(on ? 0xffe9a0 : 0x4a4560); g.fillRoundedRect(6, 4, 17, 18, 4);
      g.lineStyle(2, 0x2c2840); g.strokeRoundedRect(6, 4, 17, 18, 4); this.bake(scene, g, on ? 'beaconOn' : 'beaconOff', 30, 60); });
    g = this.gfx(scene); g.fillStyle(0xffd6a0, 0.25); g.fillCircle(18, 16, 16); g.fillStyle(0xf2b880); g.fillEllipse(17, 20, 24, 14); g.fillCircle(27, 12, 7);
    g.fillTriangle(22, 8, 25, 0, 28, 7); g.fillTriangle(27, 7, 31, 0, 33, 8); g.fillRect(4, 14, 3, 8); g.fillStyle(0x2a1a10); g.fillCircle(28, 11, 1.5); g.fillCircle(31, 11, 1.5);
    this.bake(scene, g, 'cat', 36, 30);
    g = this.gfx(scene); g.fillStyle(0xa0e0ff, 0.25); g.fillCircle(18, 16, 16); g.fillStyle(0xc9905a); g.fillEllipse(16, 20, 26, 14); g.fillCircle(28, 13, 8);
    g.fillStyle(0x8a5a30); g.fillEllipse(23, 12, 6, 12); g.fillRect(2, 13, 4, 7); g.fillStyle(0x1a0f08); g.fillCircle(30, 11, 1.6); g.fillCircle(35, 14, 2);
    this.bake(scene, g, 'dog', 38, 30);
    [0, 1].forEach(on => { g = this.gfx(scene); g.fillStyle(0x3c3552); g.fillRect(0, 0, 70, 110); g.fillStyle(on ? 0x6ff0ff : 0x1a1626); g.fillRoundedRect(10, 12, 50, 98, { tl: 25, tr: 25, bl: 0, br: 0 });
      if (on) { g.fillStyle(0xffffff, 0.6); g.fillRoundedRect(20, 24, 30, 86, { tl: 15, tr: 15, bl: 0, br: 0 }); } this.bake(scene, g, on ? 'doorOn' : 'doorOff', 70, 110); });
    g = this.gfx(scene); g.fillStyle(0x9ff7ff, 0.3); g.fillCircle(9, 9, 9); g.lineStyle(3, 0xcfd6ea); g.strokeCircle(9, 9, 6); g.fillStyle(0x9ff7ff); g.fillCircle(9, 9, 2.5);
    this.bake(scene, g, 'anchor', 18, 18);
  }
};
