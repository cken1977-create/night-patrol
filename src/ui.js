const LAYOUTS = {
  solo: { joy: [0, H * 0.3, W * 0.5, H * 0.7], home: [120, H - 110], btn: { jump: [W - 95, H - 95, 52], fire: [W - 222, H - 78, 44], special: [W - 118, H - 222, 44] } },
  p1: { joy: [0, H * 0.3, W * 0.24, H * 0.7], home: [95, H - 100], btn: { jump: [W * 0.42, H - 72, 40], fire: [W * 0.31, H - 58, 36], special: [W * 0.40, H - 168, 36] } },
  p2: { joy: [W * 0.76, H * 0.3, W * 0.24, H * 0.7], home: [W - 95, H - 100], btn: { jump: [W * 0.58, H - 72, 40], fire: [W * 0.69, H - 58, 36], special: [W * 0.60, H - 168, 36] } }
};
const BTN_COL = { jump: 0x39e27a, fire: 0xff5577, special: 0x4fc3ff };
class Pad {
  constructor(scene, layout, hero, keys, showTouch) {
    this.sc = scene; this.L = LAYOUTS[layout]; this.keys = keys; this.show = showTouch;
    this.state = { x: 0, y: 0, jump: false, fire: false, special: false, jumpP: false, specialP: false };
    this.joyId = null; this.o = { x: this.L.home[0], y: this.L.home[1] }; this.knob = { ...this.o };
    this.btns = Object.entries(this.L.btn).map(([k, [x, y, r]]) => ({ k, x, y, r, down: false }));
    this.g = scene.add.graphics().setDepth(100);
    this.labels = this.btns.map(b => scene.add.text(b.x, b.y, b.k === 'special' ? HEROES[hero].special : b.k === 'fire' ? 'BLAST' : 'JUMP', TXT(b.r > 40 ? 15 : 12)).setOrigin(0.5).setDepth(101));
  }
  update(pointers, claimed) {
    const st = this.state, prev = { j: st.jump, s: st.special };
    let jx = 0, jy = 0; this.btns.forEach(b => b.down = false); let joyAlive = false;
    for (const p of pointers) { if (!p.isDown) continue;
      if (p.id === this.joyId) { joyAlive = true; const dx = p.x - this.o.x, dy = p.y - this.o.y, d = Math.hypot(dx, dy), R = 58;
        if (d > 4) { const k = Math.min(1, d / R); jx = dx / d * k; jy = dy / d * k; } this.knob = { x: this.o.x + (d > R ? dx / d * R : dx), y: this.o.y + (d > R ? dy / d * R : dy) }; continue; }
      let hit = false; for (const b of this.btns) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.3) { b.down = true; hit = true; }
      const [rx, ry, rw, rh] = this.L.joy;
      if (!hit && this.joyId === null && !claimed.has(p.id) && p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh) { this.joyId = p.id; claimed.add(p.id); joyAlive = true; this.o = { x: p.x, y: p.y }; this.knob = { ...this.o }; }
    }
    if (!joyAlive && this.joyId !== null) { claimed.delete(this.joyId); this.joyId = null; this.o = { x: this.L.home[0], y: this.L.home[1] }; this.knob = { ...this.o }; }
    const K = this.keys, kd = (a) => a.some(k => k && k.isDown);
    if (K) { const kx = (kd(K.right) ? 1 : 0) - (kd(K.left) ? 1 : 0), ky = (kd(K.down) ? 1 : 0) - (kd(K.up) ? 1 : 0); if (kx) jx = kx; if (ky) jy = ky; }
    st.x = Math.abs(jx) < 0.18 ? 0 : jx; st.y = jy;
    const bd = (k) => this.btns.find(b => b.k === k).down || (K && kd(K[k]));
    st.jump = bd('jump'); st.fire = bd('fire'); st.special = bd('special');
    st.jumpP = st.jump && !prev.j; st.specialP = st.special && !prev.s;
    if (this.show) this.draw();
  }
  draw() { const g = this.g; g.clear();
    g.fillStyle(0xffffff, 0.08); g.fillCircle(this.o.x, this.o.y, 62); g.lineStyle(3, 0xffffff, 0.25); g.strokeCircle(this.o.x, this.o.y, 62);
    g.fillStyle(0xffffff, this.joyId !== null ? 0.5 : 0.28); g.fillCircle(this.knob.x, this.knob.y, 28);
    this.btns.forEach(b => { g.fillStyle(BTN_COL[b.k], b.down ? 0.6 : 0.16); g.fillCircle(b.x, b.y, b.r); g.lineStyle(3, BTN_COL[b.k], 0.55); g.strokeCircle(b.x, b.y, b.r); }); }
}

class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  init(d) { this.gm = d.game; }
  create() {
    const gm = this.gm, n = gm.players.length; this.input.addPointer(5);
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || /touch/.test(location.hash);
    const kb = this.input.keyboard, k = (c) => kb.addKey(c);
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const k1 = { left: [k(KC.A)], right: [k(KC.D)], up: [k(KC.W)], down: [k(KC.S)], jump: [k(KC.SPACE)], fire: [k(KC.F)], special: [k(KC.G)] };
    const k2 = { left: [k(KC.LEFT)], right: [k(KC.RIGHT)], up: [k(KC.UP)], down: [k(KC.DOWN)], jump: [k(KC.O)], fire: [k(KC.P)], special: [k(KC.L)] };
    if (n === 1) { k1.left.push(k2.left[0]); k1.right.push(k2.right[0]); k1.up.push(k2.up[0]); k1.down.push(k2.down[0]); k1.jump.push(k(KC.Z)); k1.fire.push(k(KC.X)); k1.special.push(k(KC.C)); }
    this.pads = gm.players.map((p, i) => new Pad(this, n === 1 ? 'solo' : (i ? 'p2' : 'p1'), p.hero, i ? k2 : k1, touch));
    this.claimed = new Set();
    // HUD
    this.hud = gm.players.map((p, i) => { const x = i ? W - 16 : 16, o = i ? 1 : 0;
      return { name: this.add.text(x, 10, p.cfg.name, TXT(15, '#' + p.cfg.color.toString(16).padStart(6, '0'))).setOrigin(o, 0),
        hearts: this.add.text(x, 30, '', TXT(20, '#ff5577')).setOrigin(o, 0), bar: this.add.graphics(), x, o }; });
    this.scoreT = this.add.text(W / 2, 8, '', TXT(18, '#ffe066')).setOrigin(0.5, 0);
    this.objT = this.add.text(W / 2, 32, '', TXT(15, '#d8d0ff')).setOrigin(0.5, 0);
    this.arrow = this.add.graphics().setDepth(90);
    this.bossBar = this.add.graphics();
    const pb = makeBtn(this, n === 2 ? W / 2 + 150 : W - 40, n === 2 ? 22 : 80, 48, 40, 'II', () => this.pause(), 0x2a2050, 18); this.pauseBtn = pb;
    this.toastT = this.add.text(W / 2, 110, '', TXT(22, '#ffffff')).setOrigin(0.5).setAlpha(0).setDepth(95);
    this.card(gm.mission.title, gm.mission.brief + '\n\n' + gm.players.map(p => p.cfg.name + ' (' + HEROES[p.hero].name + '): ' + HEROES[p.hero].tip).join('\n') +
      '\nEveryone: JUMP twice to double-jump. Down + JUMP drops off a roof. BLAST auto-aims at monsters.', 'GO!', () => gm.begin());
  }
  update() {
    const gm = this.gm; if (!gm || !gm.players) return;
    const ptrs = this.input.manager.pointers; this.pads.forEach(p => p.update(ptrs, this.claimed));
    gm.players.forEach((p, i) => { const h = this.hud[i]; h.hearts.setText('♥'.repeat(Math.max(0, p.hp)) + '♡'.repeat(Math.max(0, p.maxHp - Math.max(0, p.hp))));
      h.bar.clear(); if (p.hero !== 'weaver') { const bx = h.o ? h.x - 100 : h.x; h.bar.fillStyle(0x000000, 0.5); h.bar.fillRect(bx, 58, 100, 7); h.bar.fillStyle(p.hero === 'blaster' ? 0xffa630 : 0x9b5cff); h.bar.fillRect(bx, 58, p.fuel, 7); } });
    this.scoreT.setText('✦ ' + gm.score);
    this.objT.setText(gm.isBoss ? 'Defeat the Hollow King!' : (gm.done < gm.needed ? `${gm.objLabel}: ${gm.done}/${gm.needed}` : 'Go to the clock tower door ➜'));
    this.bossBar.clear(); if (gm.boss && gm.boss.active) { this.bossBar.fillStyle(0x000000, 0.6); this.bossBar.fillRoundedRect(W / 2 - 200, 56, 400, 14, 6); this.bossBar.fillStyle(0x9b5cff); this.bossBar.fillRoundedRect(W / 2 - 200, 56, 400 * Math.max(0, gm.boss.hp / gm.boss.maxHp), 14, 6); }
    // objective arrow
    this.arrow.clear(); if (!gm.isBoss && gm.started && !gm.ended) { let tgt = null; const pl = gm.players[0].s;
      if (gm.done < gm.needed) { let bd = 1e9; gm.objs.children.each(o => { if (o.kind !== 'exit' && !o.got) { const d = Math.abs(o.x - pl.x); if (d < bd) { bd = d; tgt = o; } } }); } else tgt = gm.exit;
      if (tgt) { const cam = gm.cameras.main, sx = tgt.x - cam.scrollX, sy = tgt.y - 30 - cam.scrollY;
        if (sx < 0 || sx > W || sy < 0 || sy > H) { const cx = Phaser.Math.Clamp(sx, 40, W - 40), cy = Phaser.Math.Clamp(sy, 90, H - 40), a = Math.atan2(sy - cy, sx - cx);
          this.arrow.fillStyle(0xffe066, 0.85); this.arrow.fillTriangle(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, cx + Math.cos(a + 2.4) * 14, cy + Math.sin(a + 2.4) * 14, cx + Math.cos(a - 2.4) * 14, cy + Math.sin(a - 2.4) * 14); } } }
  }
  toast(msg) { this.toastT.setText(msg).setAlpha(1); this.tweens.killTweensOf(this.toastT); this.tweens.add({ targets: this.toastT, alpha: 0, delay: 2200, duration: 600 }); }
  card(title, body, btn, cb, btn2, cb2) {
    const c = this.add.container(0, 0).setDepth(200);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0).setInteractive());
    const g = this.add.graphics(); g.fillStyle(0x140c2e, 0.95); g.fillRoundedRect(110, 50, W - 220, H - 100, 20); g.lineStyle(3, 0x9b5cff); g.strokeRoundedRect(110, 50, W - 220, H - 100, 20); c.add(g);
    c.add(this.add.text(W / 2, 92, title, TXT(30, '#e9e3ff')).setOrigin(0.5).setShadow(0, 0, '#9b5cff', 14, true, true));
    c.add(this.add.text(W / 2, 128, body, TXT(15, '#d8d0ff', { wordWrap: { width: W - 290 }, align: 'center', strokeThickness: 2, lineSpacing: 4 })).setOrigin(0.5, 0));
    const close = (f) => () => { c.destroy(); this.cardOpen = null; f && f(); };
    c.add(makeBtn(this, btn2 ? W / 2 - 130 : W / 2, H - 92, 220, 54, btn, close(cb), 0x1f9d55, 22));
    if (btn2) c.add(makeBtn(this, W / 2 + 130, H - 92, 220, 54, btn2, close(cb2), 0x3a2d6b, 20));
    this.cardOpen = c; return c;
  }
  next(mi, keepScore) { const gm = this.gm; this.scene.start('Game', { mission: mi, scary: gm.cfg.scary, players: gm.cfg.players, score: keepScore ? gm.score : 0 }); }
  quit() { SFX.stopAmbient(); SFX.music(false); this.scene.stop('Game'); this.scene.start('Title'); }
  pause() {
    if (this.cardOpen || !this.gm.started || this.gm.ended) return; this.scene.pause('Game');
    const c = this.card('Paused', 'Take a breath, heroes.', 'RESUME', () => this.scene.resume('Game'), 'QUIT', () => this.quit());
    c.add(makeBtn(this, W / 2 - 130, H - 160, 220, 46, 'RESTART MISSION', () => { c.destroy(); this.cardOpen = null; this.next(this.gm.mi, false); }, 0x2a2050, 17));
    const sb = makeBtn(this, W / 2 + 130, H - 160, 220, 46, SFX.on ? 'SOUND: ON' : 'SOUND: OFF', () => { SFX.setOn(!SFX.on); Save.load().sound = SFX.on; Save.save(); sb.setLabel(SFX.on ? 'SOUND: ON' : 'SOUND: OFF'); }, 0x2a2050, 17); c.add(sb);
  }
  showComplete() { const gm = this.gm; SFX.stopAmbient();
    this.card('Mission Complete!', `Great teamwork, ${gm.players.map(p => p.cfg.name).join(' & ')}!\n\nSparks collected: ✦ ${gm.score}\n\n${gm.mi === 0 ? 'Next: the pets are lost in the dark...' : 'Next: something huge is waking up on the clock tower...'}`,
      'NEXT MISSION ▶', () => this.next(gm.mi + 1, true), 'MENU', () => this.quit()); }
  showVictory() { const gm = this.gm; const stars = gm.score > 1400 ? 3 : gm.score > 900 ? 2 : 1;
    this.card('DAWN IS BACK!', `The Hollow King popped into a million sparks and the sun is rising over the city.\n\n${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}\n\nNight Patrol: ${gm.players.map(p => p.cfg.name).join(' & ')}\nTotal sparks: ✦ ${gm.score}`,
      'PLAY AGAIN', () => this.quit()); }
  scare() {
    const img = this.add.image(W / 2, H / 2 + 40, 'lurker').setDepth(150).setScale(0.3).setAlpha(0.2);
    const fl = this.add.rectangle(0, 0, W, H, 0xb6ff4a, 0.25).setOrigin(0).setDepth(149);
    this.tweens.add({ targets: img, scale: 2.0, alpha: 1, duration: 140, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: img, alpha: 0, scale: 2.6, delay: 550, duration: 350, onComplete: () => img.destroy() });
    this.tweens.add({ targets: fl, alpha: 0, duration: 400, onComplete: () => fl.destroy() });
  }
}
