class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    Art.base(this); this.s = Save.load(); SFX.setOn(this.s.sound);
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, H);
    this.add.image(800, 110, 'moon');
    this.far = this.add.tileSprite(0, H - 360, W, 360, 'far').setOrigin(0);
    this.mid = this.add.tileSprite(0, H - 300, W, 360, 'mid').setOrigin(0);
    this.fog = this.add.tileSprite(0, H - 200, W, 128, 'fog').setOrigin(0).setScale(1, 1.6);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0);
    this.add.text(W / 2, 34, 'NIGHT PATROL', TXT(46, '#e9e3ff', { strokeThickness: 8 })).setOrigin(0.5).setShadow(0, 0, '#9b5cff', 18, true, true);
    this.add.text(W / 2, 70, 'A family game  •  No ads  •  No chat  •  No data collected', TXT(13, '#b9a6ff')).setOrigin(0.5);
    this.dyn = [];
    this.render();
    this.input.once('pointerdown', () => SFX.init());
  }
  update(t) {
    if (this.offT && this.offT.active) this.offT.setText(location.protocol === 'file:' ? 'Offline file ✓' : (window.__offlineReady ? 'Ready to play offline ✓' : (window.__offlineReady === false ? 'Saving for offline…' : ''))); this.far.tilePositionX = t * 0.004; this.mid.tilePositionX = t * 0.012; this.fog.tilePositionX = t * 0.02;
    (this.previews || []).forEach((p, i) => { p.y = 225 + Math.sin(t / 300 + i) * 5; if ((t / 180 | 0) % 2 !== p.f) { p.f = (t / 180 | 0) % 2; p.setTexture('prev' + i + '_' + p.f); } }); }
  render() {
    this.dyn.forEach(o => o.destroy()); this.dyn = []; this.previews = [];
    const s = this.s, D = (o) => (this.dyn.push(o), o);
    D(makeBtn(this, 250, 110, 150, 40, '1 PLAYER', () => { s.players = 1; this.commit(); }, s.players === 1 ? 0x6a4cff : 0x2a2050, 17));
    D(makeBtn(this, 415, 110, 160, 40, '2 PLAYERS', () => { s.players = 2; this.commit(); }, s.players === 2 ? 0x6a4cff : 0x2a2050, 17));
    D(makeBtn(this, 640, 110, 220, 40, s.scary ? 'SCARY MODE: ON 👻' : 'SCARY MODE: OFF', () => { s.scary = !s.scary; this.commit(); }, s.scary ? 0x8a1a4a : 0x2a2050, 17));
    const xs = s.players === 1 ? [W / 2] : [250, 710];
    xs.forEach((px, i) => this.panel(px, i, D));
    MISSIONS.forEach((m, i) => { const locked = i > s.unlocked;
      D(makeBtn(this, 270 + i * 210, 452, 195, 36, (locked ? '🔒 ' : '') + m.short, () => { if (!locked) { s.mission = i; this.commit(); } },
        locked ? 0x1a1630 : (s.mission === i ? 0x2f8a5a : 0x2a2050), 15)); });
    D(makeBtn(this, W / 2, 506, 260, 52, '▶  START PATROL', () => this.start(), 0x1f9d55, 24));
    D(makeBtn(this, 110, 506, 190, 40, s.saver !== false ? '🔋 SAVER: ON' : '🔋 SAVER: OFF', () => { s.saver = s.saver === false; applySaver(); this.commit(); }, s.saver !== false ? 0x2f6a5a : 0x2a2050, 15));
    this.offT = D(this.add.text(W - 16, 506, '', TXT(14, '#7dffa8')).setOrigin(1, 0.5));
  }
  panel(px, i, D) {
    const p = this.s.p[i], h = HEROES[p.hero];
    const bg = D(this.add.graphics()); bg.fillStyle(0x0b0718, 0.7); bg.fillRoundedRect(px - 200, 135, 400, 290, 16); bg.lineStyle(2, p.color, 0.8); bg.strokeRoundedRect(px - 200, 135, 400, 290, 16);
    D(this.add.text(px, 150, 'PLAYER ' + (i + 1), TXT(14, '#b9a6ff')).setOrigin(0.5));
    Art.hero(this, 'prev' + i + '_0', p.hero, p.color, 0); Art.hero(this, 'prev' + i + '_1', p.hero, p.color, 1);
    const glow = D(this.add.image(px, 228, 'glow').setTint(p.color).setScale(1.1).setAlpha(0.6).setBlendMode('ADD'));
    const spr = D(this.add.image(px, 225, 'prev' + i + '_0').setScale(1.7)); spr.f = 0; this.previews.push(spr);
    const cyc = (d) => { const k = HERO_KEYS.indexOf(p.hero); p.hero = HERO_KEYS[(k + d + 3) % 3]; this.commit(); };
    D(makeBtn(this, px - 130, 225, 54, 54, '◀', () => cyc(-1), 0x2a2050, 24));
    D(makeBtn(this, px + 130, 225, 54, 54, '▶', () => cyc(1), 0x2a2050, 24));
    D(this.add.text(px, 290, h.name + '  ·  ' + h.special, TXT(20, '#' + p.color.toString(16).padStart(6, '0'))).setOrigin(0.5));
    D(this.add.text(px, 318, h.desc, TXT(12, '#d8d0ff', { wordWrap: { width: 360 }, align: 'center', strokeThickness: 2 })).setOrigin(0.5));
    COLORS.forEach((c, k) => { const x = px - 100 + k * 40, y = 358;
      const sw = D(this.add.circle(x, y, 14, c).setStrokeStyle(p.color === c ? 4 : 2, p.color === c ? 0xffffff : 0x000000).setInteractive({ useHandCursor: true }));
      sw.on('pointerup', () => { p.color = c; this.commit(); }); });
    D(makeBtn(this, px, 400, 220, 34, '✎ ' + p.name, () => {
      this.keyboard(p.name, (n) => { p.name = n; this.commit(); }); }, 0x2a2050, 16));
  }
  keyboard(cur, done) {
    let val = cur; const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0).setInteractive());
    c.add(this.add.text(W / 2, 40, 'Type your hero name', TXT(22, '#b9a6ff')).setOrigin(0.5));
    const shown = this.add.text(W / 2, 95, '', TXT(36, '#ffffff')).setOrigin(0.5); c.add(shown);
    const upd = () => shown.setText((val || ' ') + '_'); upd();
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    rows.forEach((r, ri) => [...r].forEach((ch, i) => { const x = W / 2 - (r.length - 1) * 33 + i * 66, y = 170 + ri * 70;
      c.add(makeBtn(this, x, y, 58, 58, ch, () => { if (val.length < 12) { val += val.length === 0 || val.endsWith(' ') ? ch : ch.toLowerCase(); upd(); } }, 0x2a2050, 22)); }));
    c.add(makeBtn(this, W / 2 - 230, 390, 150, 56, 'SPACE', () => { if (val.length < 12 && val && !val.endsWith(' ')) { val += ' '; upd(); } }, 0x2a2050, 18));
    c.add(makeBtn(this, W / 2 - 60, 390, 150, 56, '⌫ BACK', () => { val = val.slice(0, -1); upd(); }, 0x6a2a3a, 18));
    c.add(makeBtn(this, W / 2 + 110, 390, 150, 56, 'CLEAR', () => { val = ''; upd(); }, 0x2a2050, 18));
    c.add(makeBtn(this, W / 2 + 280, 390, 150, 56, 'CANCEL', () => c.destroy(), 0x2a2050, 18));
    c.add(makeBtn(this, W / 2, 470, 260, 60, '✓ DONE', () => { const n = val.trim(); c.destroy(); if (n) done(n); }, 0x1f9d55, 24));
    this.kb = c;
  }
  commit() { Save.save(); this.render(); }
  start() {
    SFX.init(); const s = this.s;
    try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) {}
    this.scene.start('Game', { mission: s.mission, scary: s.scary, players: s.p.slice(0, s.players).map(p => ({ ...p })) });
  }
}
