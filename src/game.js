const GROUND = 860, WORLD_H = 900, RUN = 270, JUMP = 640;
function rng(seed) { let s = seed; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(data) { this.cfg = data; this.mission = MISSIONS[data.mission]; this.mi = data.mission; }
  create() {
    Art.base(this);
    const m = this.mission, scary = this.cfg.scary; this.scary = scary;
    this.started = false; this.ended = false; this.score = this.cfg.score || 0; this.t = 0;
    this.len = m.len; this.isBoss = m.type === 'boss';
    this.physics.world.setBounds(0, 0, this.len, WORLD_H); this.physics.world.gravity.y = 1400;
    this.physics.world.setFPS(60);
    const cam = this.cameras.main; cam.setBounds(0, 0, this.len, WORLD_H); cam.setRoundPixels(false);
    // background parallax
    this.sky = this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDisplaySize(W, H).setDepth(-10);
    this.dawn = this.add.image(0, 0, 'dawn').setOrigin(0).setScrollFactor(0).setDisplaySize(W, H).setDepth(-10).setAlpha(0);
    this.moon = this.add.image(780, 100, 'moon').setScrollFactor(0).setDepth(-9);
    this.far = this.add.tileSprite(0, 0, W, 360, 'far').setOrigin(0).setScrollFactor(0).setDepth(-8);
    this.mid = this.add.tileSprite(0, 0, W, 360, 'mid').setOrigin(0).setScrollFactor(0).setDepth(-7);
    this.platforms = this.physics.add.staticGroup(); this.anchors = []; this.lamps = []; this.lightsList = [];
    this.props = this.add.graphics().setDepth(-2);
    const gz = this.add.zone(this.len / 2, GROUND + 20, this.len, 40); this.physics.add.existing(gz, true); this.ground = gz;
    this.add.tileSprite(0, GROUND, this.len, 64, 'street').setOrigin(0).setDepth(-1);
    this.fog = this.add.tileSprite(0, 0, W, 128, 'fog').setOrigin(0).setScrollFactor(0).setDepth(30).setScale(1, 1.5).setAlpha(scary ? 1 : 0.6);
    // groups
    this.enemies = this.physics.add.group(); this.blasts = this.physics.add.group({ allowGravity: false, maxSize: 70 });
    this.orbs = this.physics.add.group({ allowGravity: false }); this.objs = this.physics.add.staticGroup();
    this.webG = this.add.graphics().setDepth(19);
    this.sparks = this.add.particles(0, 0, 'px', { speed: { min: 60, max: 320 }, lifespan: { min: 300, max: 700 }, scale: { start: 1.1, end: 0 }, blendMode: 'ADD',
      tint: [0xb6ff4a, 0x9ff7ff, 0xffe066, 0xd8b4ff, 0xffffff], gravityY: 300, emitting: false }).setDepth(47);
    this.trail = this.add.particles(0, 0, 'px', { speed: { min: 10, max: 60 }, lifespan: 350, scale: { start: 0.8, end: 0 }, blendMode: 'ADD', tint: [0xff8a3c, 0xffe066], emitting: false }).setDepth(18);
    if (this.isBoss) this.buildArena(); else this.buildCity(m);
    this.createPlayers();
    // darkness layer (half-res render texture for speed)
    this.dark = this.add.renderTexture(0, 0, W / 2, H / 2).setOrigin(0).setScrollFactor(0).setScale(2).setDepth(40);
    this.lightImg = this.make.image({ key: 'light', add: false }); this.darkAlpha = scary ? 0.9 : 0.5;
    // physics links
    const ps = this.players.map(p => p.s);
    this.physics.add.collider(ps, this.ground);
    this.physics.add.collider(ps, this.platforms, null, (s) => !(s.dropT > 0));
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.enemies, this.platforms, null, (e) => e.kind === 'crawler');
    this.physics.add.overlap(this.blasts, this.enemies, (b, e) => this.hitEnemy(e, b.dmg, b));
    this.physics.add.overlap(ps, this.enemies, (s, e) => this.touchEnemy(s.p, e));
    this.physics.add.overlap(ps, this.orbs, (s, o) => { if (this.hurt(s.p)) o.destroy(); });
    this.physics.add.overlap(ps, this.objs, (s, o) => this.touchObj(s.p, o));
    if (this.boss) { this.physics.add.overlap(this.blasts, this.boss, (a, b) => { const bl = a === this.boss ? b : a; this.hitBoss(bl.dmg, bl); }); this.physics.add.overlap(ps, this.boss, (a, b) => this.touchBoss((a.p || b.p))); }
    this.camTarget = this.add.zone(this.players[0].s.x, this.players[0].s.y, 2, 2);
    cam.startFollow(this.camTarget, false, 0.12, 0.12); cam.setDeadzone(60, 80);
    this.nextSpawn = 2; this.nextScare = 22 + Math.random() * 10; this.nextWhisper = 6; this.nextBeat = 0;
    this.physics.pause();
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    this.scene.launch('UI', { game: this });
    SFX.ambient(scary);
    this.events.on('shutdown', () => { SFX.music(false); });
    this.visHandler = () => { if (document.hidden) { SFX.suspend(); if (this.started && !this.ended) this.scene.get('UI').pause(); } else SFX.resume(); };
    document.addEventListener('visibilitychange', this.visHandler);
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', this.visHandler));
    window.__np = this;
  }
  begin() { this.started = true; this.physics.resume(); if (this.isBoss) SFX.music(true); }

  addPlatform(x, top, w) { const z = this.add.zone(x + w / 2, top + 6, w, 12); this.platforms.add(z);
    z.body.checkCollision.down = false; z.body.checkCollision.left = false; z.body.checkCollision.right = false; return z; }
  addAnchor(x, y, fromY) { this.props.lineStyle(2, 0x6c6890, 0.9); this.props.lineBetween(x, fromY, x, y);
    this.add.image(x, y, 'anchor').setDepth(-1); this.anchors.push({ x, y }); }
  building(x, top, w, v) {
    this.add.tileSprite(x, top, w, GROUND - top, 'wall' + v).setOrigin(0).setDepth(-3);
    this.add.tileSprite(x - 6, top - 2, w + 12, 14, 'ledge').setOrigin(0).setDepth(-2);
    this.addPlatform(x - 6, top - 2, w + 12);
  }
  buildCity(m) {
    const R = rng(m.seed); let x = 0, top = 640; const bl = [];
    // first wide low building
    bl.push({ x: 40, w: 600, top: 640 }); x = 640;
    while (x < this.len - 900) { x += 90 + R() * 140; const w = 260 + R() * 260; top = Phaser.Math.Clamp(top + (R() - 0.5) * 260, 380, 700);
      bl.push({ x, w, top }); x += w; }
    const tower = { x: this.len - 700, w: 380, top: 300 };
    bl.forEach((b, i) => { this.building(b.x, b.top, b.w, i % 3);
      // roof props: antenna anchor + water tower
      const ax = b.x + b.w * (0.3 + R() * 0.4), ay = b.top - 170 - R() * 70; this.addAnchor(ax, ay, b.top);
      this.props.fillStyle(0xff3355, 0.9); this.props.fillCircle(ax, ay - 8, 3);
      if (R() < 0.4) { const tx = b.x + 20 + R() * (b.w - 80); this.props.fillStyle(0x221c33); this.props.fillRect(tx, b.top - 58, 46, 40); this.props.fillRect(tx + 6, b.top - 18, 4, 18); this.props.fillRect(tx + 36, b.top - 18, 4, 18); this.props.fillStyle(0x2c2542); this.props.fillTriangle(tx - 3, b.top - 58, tx + 49, b.top - 58, tx + 23, b.top - 76); }
      const nb = bl[i + 1] || tower; const gap = nb.x - (b.x + b.w);
      if (gap > 60) this.addAnchor(b.x + b.w + gap / 2, Math.min(b.top, nb.top) - 190, 0);
    });
    // clock tower
    this.add.tileSprite(tower.x, tower.top, tower.w, GROUND - tower.top, 'wall1').setOrigin(0).setDepth(-3);
    this.props.fillStyle(0x1b1530); this.props.fillTriangle(tower.x - 20, tower.top, tower.x + tower.w + 20, tower.top, tower.x + tower.w / 2, tower.top - 160);
    this.props.fillStyle(0xfff3c0, 0.9); this.props.fillCircle(tower.x + tower.w / 2, tower.top + 90, 56); this.props.lineStyle(5, 0x1b1530); this.props.strokeCircle(tower.x + tower.w / 2, tower.top + 90, 56);
    this.props.lineBetween(tower.x + tower.w / 2, tower.top + 90, tower.x + tower.w / 2, tower.top + 50); this.props.lineBetween(tower.x + tower.w / 2, tower.top + 90, tower.x + tower.w / 2 + 28, tower.top + 100);
    this.lightsList.push({ x: tower.x + tower.w / 2, y: tower.top + 90, r: 260, a: 0.8 });
    this.addPlatform(tower.x - 6, tower.top - 2, tower.w + 12);
    this.exit = this.objs.create(tower.x - 90, GROUND - 55, 'doorOff'); this.exit.kind = 'exit'; this.exit.refreshBody();
    // street lamps (also swing anchors)
    for (let lx = 300; lx < this.len - 200; lx += 520 + R() * 200) { this.props.fillStyle(0x2c2840); this.props.fillRect(lx - 3, GROUND - 170, 6, 170); this.props.fillRect(lx - 3, GROUND - 172, 30, 5);
      const lamp = { x: lx + 26, y: GROUND - 160, r: 190, a: 0.75, lamp: true }; this.lamps.push(lamp); this.lightsList.push(lamp);
      this.add.image(lx + 26, GROUND - 160, 'glow').setScale(0.6).setTint(0xffd27a).setBlendMode('ADD').setAlpha(0.7).setDepth(-1);
      this.anchors.push({ x: lx + 26, y: GROUND - 172 }); }
    // objectives
    this.needed = m.count; this.done = 0; const cands = bl.slice(2);
    for (let k = 0; k < m.count; k++) { const b = cands[Math.floor((k + 0.5) * cands.length / m.count)];
      let ox = b.x + b.w / 2, oy = b.top - 2;
      if (m.type === 'pets' && k % 2 === 1) { oy = GROUND; ox = b.x + b.w * 0.25; }
      const key = m.type === 'beacons' ? 'beaconOff' : (k % 2 ? 'dog' : 'cat');
      const o = this.objs.create(ox, oy, key).setOrigin(0.5, 1).setDepth(10); o.kind = m.type; o.refreshBody();
      if (m.type === 'pets') this.tweens.add({ targets: o, y: oy - 6, yoyo: true, repeat: -1, duration: 500 + k * 70 }); }
    this.objLabel = m.type === 'beacons' ? 'Beacons lit' : 'Pets found';
    this.startPos = { x: 140, y: 560 };
  }
  buildArena() {
    this.building(0, 740, 420, 0); this.building(1500, 740, 420, 1); this.cameras.main.setBounds(0, 340, this.len, 560);
    [[540, 720, 260], [1120, 720, 260], [820, 610, 280]].forEach(([x, y, w]) => { this.add.tileSprite(x, y, w, 14, 'ledge').setOrigin(0).setDepth(-2); this.addPlatform(x, y, w); });
    for (let ax = 200; ax < this.len; ax += 260) this.addAnchor(ax, 420 + (ax / 260 % 2) * 40, 340);
    this.needed = 0; this.done = 0; this.objLabel = '';
    const n = this.cfg.players.length;
    this.boss = this.physics.add.sprite(960, 480, 'boss').setDepth(46); this.boss.body.setAllowGravity(false); this.boss.body.setImmovable(true); this.boss.body.setCircle(80, 40, 45);
    this.boss.hp = this.boss.maxHp = 90 * (n === 2 ? 1.5 : 1); this.boss.phase = 1; this.boss.atk = 3; this.boss.sum = 8; this.boss.dive = 0; this.boss.t = 0;
    this.bossGlow = this.add.image(960, 480, 'glow').setScale(3.5).setTint(0x7d2cff).setBlendMode('ADD').setDepth(45);
    this.startPos = { x: 150, y: 680 };
  }
  createPlayers() {
    this.players = this.cfg.players.map((pc, i) => {
      Art.hero(this, 'hero' + i + '_0', pc.hero, pc.color, 0); Art.hero(this, 'hero' + i + '_1', pc.hero, pc.color, 1);
      const s = this.physics.add.sprite(this.startPos.x + i * 60, this.startPos.y, 'hero' + i + '_0').setDepth(20);
      s.body.setSize(22, 50).setOffset(13, 12); s.setCollideWorldBounds(true); s.body.setMaxVelocity(1100, 1100);
      const label = this.add.text(0, 0, pc.name, TXT(12, '#' + pc.color.toString(16).padStart(6, '0'))).setOrigin(0.5, 1).setDepth(48);
      const p = { i, cfg: pc, hero: pc.hero, s, label, hp: 5, maxHp: 5, face: 1, jumps: 0, fireCd: 0, inv: 0, fuel: 100, dashT: 0, dashCd: 0, cloakT: 0,
        swing: null, down: false, safe: { x: s.x, y: s.y }, safeT: 0, walkT: 0, frame: 0 };
      s.p = p; return p; });
  }
  pads() { const ui = this.scene.get('UI'); return ui && ui.pads ? ui.pads : []; }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000; const cam = this.cameras.main;
    this.far.tilePositionX = cam.scrollX * 0.15; this.far.y = 210 - cam.scrollY * 0.12;
    this.mid.tilePositionX = cam.scrollX * 0.35; this.mid.y = 290 - cam.scrollY * 0.25;
    this.fog.tilePositionX = cam.scrollX * 0.6 + time * 0.015; this.fog.y = H - 190;
    this.drawDark(time);
    if (!this.started || this.ended) return;
    this.t += dt;
    const pads = this.pads();
    this.webG.clear();
    this.players.forEach((p, i) => this.updatePlayer(p, pads[i] ? pads[i].state : {}, dt));
    // camera target
    const alive = this.players.filter(p => !p.down); const L = alive.length ? alive : this.players;
    let tx = 0, ty = 0; L.forEach(p => { tx += p.s.x; ty += p.s.y; }); tx /= L.length; ty /= L.length;
    if (L.length === 1) tx += L[0].face * 90;
    this.camTarget.setPosition(tx, ty - 40);
    if (this.players.length === 2 && alive.length === 2) { const [a, b] = this.players; if (Math.abs(a.s.x - b.s.x) > W * 0.85 || Math.abs(a.s.y - b.s.y) > H * 0.9) {
      const lead = (a.s.x > b.s.x) === !this.isBoss ? a : b, lag = lead === a ? b : a; this.teleport(lag, lead.s.x - 50, lead.s.y - 30); } }
    this.updateEnemies(dt);
    if (this.isBoss) this.updateBoss(dt); else this.spawner(dt);
    this.blasts.children.each(b => { if (b.active && (b.life -= dt) <= 0) b.disableBody(true, true); });
    this.orbs.children.each(o => { if (o && o.active && (o.life -= dt) <= 0) o.destroy(); });
    if (this.scary) this.scares(dt);
    if (this.players.some(p => p.hp <= 2 && !p.down) && this.t > this.nextBeat) { SFX.heartbeat(); this.nextBeat = this.t + 0.9; }
  }
  drawDark(time) {
    const rt = this.dark, cam = this.cameras.main, Li = this.lightImg; let a = this.darkAlpha;
    if (this.scary && !this.ended && Math.random() < 0.01) a = Math.min(0.97, a + 0.06);
    rt.clear(); if (a <= 0.01) return; rt.fill(0x04020a, a);
    const put = (x, y, r, al = 1) => { const sx = (x - cam.scrollX) / 2, sy = (y - cam.scrollY) / 2, rr = r / 2;
      if (sx < -rr || sy < -rr || sx > W / 2 + rr || sy > H / 2 + rr) return; Li.setPosition(sx, sy).setScale(rr / 128).setAlpha(al); rt.erase(Li); };
    put(cam.scrollX + 780, cam.scrollY + 100, 140, 0.6); // moon
    this.players.forEach(p => put(p.s.x, p.s.y - 10, p.hero === 'shade' ? 190 : 230, p.down ? 0.4 : 1));
    this.lightsList.forEach(l => { let al = l.a; if (l.lamp && this.scary) { l.fl = (l.fl || 0) - 1; if (l.fl < 0 && Math.random() < 0.02) l.fl = 8; if (l.fl > 0) al *= 0.15; } put(l.x, l.y, l.r, al); });
    let n = 0; this.blasts.children.each(b => { if (b.active && n++ < 8) put(b.x, b.y, 70, 0.6); });
    if (this.boss && this.boss.active) put(this.boss.x, this.boss.y, 260, 0.5);
  }
  teleport(p, x, y) { p.s.body.reset(x, y); p.swing = null; this.sparks.explode(14, x, y); }

  updatePlayer(p, c, dt) {
    const s = p.s, b = s.body; s.dropT = (s.dropT || 0) - dt;
    p.label.setPosition(s.x, s.y - 34);
    if (p.down) return;
    const onGround = b.blocked.down || b.touching.down;
    p.inv -= dt; p.fireCd -= dt; p.dashCd -= dt; p.cloakT -= dt;
    s.setAlpha(p.cloakT > 0 ? 0.45 : (p.inv > 0 ? (Math.floor(this.t * 20) % 2 ? 0.35 : 1) : 1));
    if (onGround) { p.jumps = 0; p.fuel = Math.min(100, p.fuel + dt * 70); p.safeT += dt; if (p.safeT > 0.8 && p.inv <= 0) { p.safe = { x: s.x, y: s.y - 20 }; p.safeT = 0; } }
    const cx = c.x || 0, cy = c.y || 0;
    if (cx > 0.25) p.face = 1; else if (cx < -0.25) p.face = -1;
    s.setFlipX(p.face < 0);
    if (p.dashT > 0) { p.dashT -= dt; b.setVelocity(p.face * 950, -30); this.trail.setParticleTint && 0; this.trail.explode(2, s.x, s.y);
      if (p.dashT <= 0) { b.setVelocityX(p.face * 300); } }
    else if (!p.swing) { b.velocity.x = Phaser.Math.Linear(b.velocity.x, cx * RUN, onGround ? 0.3 : 0.1); }
    // jump / drop
    if (c.jumpP) {
      if (cy > 0.6 && onGround && s.y < GROUND - 30) { s.dropT = 0.3; }
      else if (p.swing) { this.releaseSwing(p, true); }
      else if (onGround) { b.setVelocityY(-JUMP); p.jumps = 1; SFX.jump(); }
      else if (p.jumps < 2) { b.setVelocityY(-JUMP * 0.88); p.jumps = 2; SFX.jump(); this.sparks.explode(5, s.x, s.y + 24); }
    }
    if (!c.jump && b.velocity.y < -300 && !p.swing && p.dashT <= 0) b.velocity.y *= 0.9;
    // fire
    if (c.fire && p.fireCd <= 0) this.shoot(p, cy);
    // specials
    if (p.hero === 'weaver') {
      if (c.specialP && !p.swing) this.startSwing(p);
      if (p.swing) { if (!c.special) this.releaseSwing(p, false); else this.doSwing(p, cx, cy, dt); }
    } else if (p.hero === 'blaster') {
      if (c.special && p.fuel > 0) { p.fuel -= dt * 50; b.velocity.y = Math.max(b.velocity.y - 2900 * dt, -400); this.trail.explode(2, s.x - p.face * 14, s.y + 18); if (Math.random() < 0.3) SFX.jet(); p.jumps = Math.max(p.jumps, 1); }
    } else {
      if (c.specialP && p.dashCd <= 0) { p.dashT = 0.26; p.dashCd = 0.85; p.cloakT = 2.2; p.inv = Math.max(p.inv, 0.35); SFX.dash(); p.dashHit = new Set(); }
      p.fuel = Math.min(100, Math.max(0, (1 - p.dashCd / 0.85) * 100));
    }
    // walk anim
    p.walkT += dt * (onGround ? Math.abs(b.velocity.x) / 60 : 0);
    const f = onGround ? (Math.floor(p.walkT) % 2) : 1; if (f !== p.frame) { p.frame = f; s.setTexture('hero' + p.i + '_' + f); }
    s.setAngle(p.swing ? Phaser.Math.Clamp(b.velocity.x / 30, -25, 25) : 0);
  }
  startSwing(p) {
    const s = p.s; let best = null, bd = 1e9;
    for (const a of this.anchors) { const dx = a.x - s.x, dy = a.y - s.y; if (dy > -40) continue; const d = Math.hypot(dx, dy); if (d > 430 || d < 50) continue;
      const score = d - dx * p.face * 0.6; if (score < bd) { bd = score; best = a; } }
    if (!best) { this.webMiss = 0.15; SFX.web(); return; }
    p.swing = { x: best.x, y: best.y, L: Math.max(90, Math.hypot(best.x - s.x, best.y - s.y)) }; SFX.web(); p.jumps = 1;
    s.body.velocity.x += p.face * 120;
  }
  doSwing(p, cx, cy, dt) {
    const s = p.s, b = s.body, sw = p.swing; const rx = s.x - sw.x, ry = s.y - sw.y, d = Math.hypot(rx, ry) || 1; const ux = rx / d, uy = ry / d;
    if (cy < -0.5) sw.L = Math.max(80, sw.L - 260 * dt); else if (cy > 0.5) sw.L = Math.min(480, sw.L + 200 * dt);
    if (d > sw.L) { const vr = b.velocity.x * ux + b.velocity.y * uy; if (vr > 0) { b.velocity.x -= ux * vr; b.velocity.y -= uy * vr; } b.velocity.x -= ux * (d - sw.L) * 12; b.velocity.y -= uy * (d - sw.L) * 12; }
    if (cx) { const tx = -uy, ty = ux; const sgn = Math.sign(tx) === Math.sign(cx) ? 1 : -1; b.velocity.x += tx * sgn * Math.abs(cx) * 900 * dt; b.velocity.y += ty * sgn * Math.abs(cx) * 900 * dt; }
    this.webG.lineStyle(2, 0xe8f6ff, 0.95); this.webG.lineBetween(s.x + p.face * 8, s.y - 6, sw.x, sw.y);
    this.webG.lineStyle(6, 0x9ff7ff, 0.2); this.webG.lineBetween(s.x + p.face * 8, s.y - 6, sw.x, sw.y);
  }
  releaseSwing(p, jumped) { const b = p.s.body; p.swing = null; b.velocity.x *= 1.15; b.velocity.y = Math.min(b.velocity.y, 0) - (jumped ? 380 : 160); p.jumps = 1; SFX.jump(); }
  shoot(p, cy) {
    const s = p.s; let ang = p.face > 0 ? 0 : Math.PI;
    // gentle auto-aim toward nearest monster in front
    let best = null, bd = 560; const cands = this.enemies.getChildren().filter(e => e.active); if (this.boss && this.boss.active) cands.push(this.boss);
    for (const e of cands) { const dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy); if (d < bd && dx * p.face > -10 && Math.abs(Math.atan2(dy, Math.abs(dx))) < 0.75) { bd = d; best = e; } }
    if (best) ang = Math.atan2(best.y - s.y, best.x - s.x); else if (cy < -0.5) ang = p.face > 0 ? -Math.PI / 4 : -3 * Math.PI / 4;
    const col = p.cfg.color, spread = p.hero === 'blaster' ? [-0.14, 0, 0.14] : [0];
    spread.forEach(o => { const bl = this.blasts.get(s.x + p.face * 18, s.y - 4, 'blast'); if (!bl) return;
      bl.enableBody(true, s.x + p.face * 18, s.y - 4, true, true); bl.setTint(col).setBlendMode('ADD').setDepth(46).setRotation(ang + o);
      bl.body.setAllowGravity(false); bl.body.setSize(20, 12); bl.setVelocity(Math.cos(ang + o) * 760, Math.sin(ang + o) * 760); bl.life = 0.75; bl.dmg = 1; });
    p.fireCd = p.hero === 'blaster' ? 0.32 : 0.2; SFX.zap();
  }
  spawnEnemy(kind, x, y) {
    const e = this.enemies.create(x, y, kind).setDepth(45); e.kind = kind;
    if (kind === 'wisp') { e.body.setAllowGravity(false); e.body.setCircle(15, 9, 7); e.hp = 2; e.spd = 80 + Math.random() * 40 + this.mi * 15 + (this.scary ? 15 : 0); e.ph = Math.random() * 6; }
    else { e.body.setSize(44, 22).setOffset(10, 14); e.hp = 3; e.spd = 110 + this.mi * 15; }
    e.setAlpha(0); this.tweens.add({ targets: e, alpha: 1, duration: 400 }); return e;
  }
  spawner(dt) {
    this.nextSpawn -= dt; if (this.nextSpawn > 0) return;
    this.nextSpawn = (this.scary ? 1.5 : 2.4) / (this.players.length === 2 ? 1.25 : 1);
    const cap = this.mission.cap + (this.scary ? 3 : 0) + (this.players.length - 1) * 2;
    if (this.enemies.countActive() >= cap) return;
    const cam = this.cameras.main, side = Math.random() < 0.65 ? 1 : -1, x = side > 0 ? cam.scrollX + W + 40 : cam.scrollX - 40;
    if (x < 50 || x > this.len - 50) return;
    if (Math.random() < 0.3 && cam.scrollY + H > GROUND - 50) this.spawnEnemy('crawler', x, GROUND - 30);
    else this.spawnEnemy('wisp', x, cam.scrollY + 60 + Math.random() * (H * 0.6));
  }
  target(e) { let best = null, bd = 1e9; this.players.forEach(p => { if (p.down || p.cloakT > 0) return; const d = Phaser.Math.Distance.Between(e.x, e.y, p.s.x, p.s.y); if (d < bd) { bd = d; best = p; } }); return [best, bd]; }
  updateEnemies(dt) {
    const cam = this.cameras.main;
    this.enemies.children.each(e => { if (!e.active) return; const [p, d] = this.target(e);
      if (e.kind === 'wisp') { e.ph += dt * 3;
        if (p && d < 700) { const dx = p.s.x - e.x, dy = p.s.y - 10 - e.y; e.body.velocity.x += (dx / d * e.spd - e.body.velocity.x) * 0.05; e.body.velocity.y += (dy / d * e.spd - e.body.velocity.y) * 0.05 + Math.sin(e.ph) * 4; }
        else { e.body.velocity.x *= 0.98; e.body.velocity.y = Math.sin(e.ph) * 40; }
        e.setFlipX(e.body.velocity.x < 0); e.setScale(1 + Math.sin(e.ph * 2) * 0.06);
      } else { if (p && d < 600) e.body.setVelocityX(Math.sign(p.s.x - e.x) * e.spd); e.setFlipX(e.body.velocity.x < 0); }
      if (Math.abs(e.x - (cam.scrollX + W / 2)) > 1500) e.destroy(); });
    this.players.forEach(p => { if (p.dashT > 0) this.enemies.children.each(e => { if (e.active && !p.dashHit.has(e) && Phaser.Math.Distance.Between(e.x, e.y, p.s.x, p.s.y) < 50) { p.dashHit.add(e); this.hitEnemy(e, 2); } }); });
  }
  hitEnemy(e, dmg, bl) {
    if (!e.active) return; if (bl) bl.disableBody(true, true);
    e.hp -= dmg; e.setTintFill(0xffffff); this.time.delayedCall(60, () => e.active && e.clearTint());
    if (e.hp <= 0) { this.sparks.explode(22, e.x, e.y); SFX.pop(); this.addScore(e.kind === 'crawler' ? 15 : 10, e.x, e.y); e.destroy(); }
  }
  addScore(n, x, y) { this.score += n; const t = this.add.text(x, y - 20, '+' + n, TXT(16, '#ffe066')).setOrigin(0.5).setDepth(49);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 800, onComplete: () => t.destroy() }); }
  touchEnemy(p, e) { if (p.dashT > 0) return; if (this.hurt(p)) { p.s.body.setVelocity(Math.sign(p.s.x - e.x || 1) * 300, -300); } }
  hurt(p) {
    if (p.down || p.inv > 0 || p.dashT > 0 || this.ended) return false;
    p.hp -= 1; p.inv = 1.3; SFX.hurt(); this.cameras.main.shake(150, 0.006); p.swing = null;
    if (p.hp <= 0) { p.down = true; p.s.body.setVelocity(0, 0); p.s.body.enable = false; p.s.setAlpha(0.3); this.sparks.explode(20, p.s.x, p.s.y);
      this.time.delayedCall(1600, () => { const other = this.players.find(o => o !== p && !o.down); const pos = other ? { x: other.s.x - 40, y: other.s.y - 30 } : p.safe;
        p.s.body.enable = true; p.down = false; p.hp = p.maxHp; p.inv = 2; this.teleport(p, pos.x, pos.y);
        this.score = Math.max(0, this.score - 20); }); }
    return true;
  }
  touchObj(p, o) {
    if (o.kind === 'exit') { if (this.done >= this.needed && !this.ended) this.complete(); return; }
    if (o.got) return; o.got = true; SFX.pickup(); this.done++; this.addScore(50, o.x, o.y - 40); this.sparks.explode(30, o.x, o.y - 20);
    if (o.kind === 'beacons') { o.setTexture('beaconOn'); this.lightsList.push({ x: o.x, y: o.y - 45, r: 340, a: 1 });
      this.add.image(o.x, o.y - 45, 'glow').setScale(1.6).setTint(0xffd36b).setBlendMode('ADD').setDepth(11); }
    else { this.tweens.killTweensOf(o); this.tweens.add({ targets: o, y: o.y - 300, alpha: 0, scale: 0.5, duration: 1400, onComplete: () => o.disableBody(true, true) }); }
    if (this.done >= this.needed) { this.exit.setTexture('doorOn'); this.lightsList.push({ x: this.exit.x, y: this.exit.y, r: 300, a: 1 }); this.scene.get('UI').toast('The clock tower door is open! Get there!'); }
  }
  complete() {
    this.ended = true; this.physics.pause(); SFX.win(); this.players.forEach(p => p.s.setAlpha(1));
    const s = Save.load(); s.unlocked = Math.max(s.unlocked, this.mi + 1); s.mission = Math.min(this.mi + 1, 2); Save.save();
    this.scene.get('UI').showComplete();
  }
  scares(dt) {
    this.nextWhisper -= dt; if (this.nextWhisper < 0) { SFX.whisper(); this.nextWhisper = 7 + Math.random() * 10; }
    if (this.isBoss) return;
    this.nextScare -= dt; const moving = this.players.some(p => Math.abs(p.s.body.velocity.x) > 50);
    if (this.nextScare < 0 && moving) { this.nextScare = 30 + Math.random() * 25; this.jumpScare(); }
  }
  jumpScare() {
    SFX.screech(); this.cameras.main.shake(450, 0.02); this.scene.get('UI').scare();
    const p = this.players[0].s; this.time.delayedCall(700, () => { for (let k = 0; k < 3; k++) this.spawnEnemy('wisp', p.x + (k - 1) * 120 + this.players[0].face * 200, p.y - 120); });
  }
  // ---------- boss ----------
  updateBoss(dt) {
    const B = this.boss; if (!B.active) return; B.t += dt; const fr = B.hp / B.maxHp;
    const ph = fr > 0.66 ? 1 : fr > 0.33 ? 2 : 3; if (ph !== B.phase) { B.phase = ph; SFX.screech(); this.cameras.main.shake(400, 0.015); this.scene.get('UI').toast(ph === 2 ? 'The Hollow King calls his shadows!' : 'He is furious! Watch for his dive!'); if (ph === 3) this.darkAlpha = Math.min(0.95, this.darkAlpha + 0.1); }
    if (B.dive > 0) { B.dive -= dt; if (B.dive <= 0) this.tweens.add({ targets: B, y: 470, duration: 700, ease: 'Sine.easeInOut' }); }
    else if (!B.diving) { const tx = 960 + Math.sin(B.t * 0.45) * 620, ty = 470 + Math.sin(B.t * 1.1) * 60; B.x += (tx - B.x) * 0.04; B.y += (ty - B.y) * 0.04; }
    this.bossGlow.setPosition(B.x, B.y).setAlpha(0.5 + Math.sin(B.t * 4) * 0.2);
    B.atk -= dt; if (B.atk <= 0) { B.atk = ph === 1 ? 2.4 : ph === 2 ? 1.9 : 1.5; const [p] = this.target(B); if (p) { const base = Math.atan2(p.s.y - B.y, p.s.x - B.x), n = ph === 1 ? 3 : 5;
      for (let k = 0; k < n; k++) { const a = base + (k - (n - 1) / 2) * 0.22; const o = this.orbs.create(B.x, B.y + 20, 'orb').setDepth(46).setBlendMode('ADD'); o.body.setAllowGravity(false); o.body.setCircle(9, 5, 5); o.setVelocity(Math.cos(a) * 250, Math.sin(a) * 250); o.life = 4; } SFX.whisper(); } }
    if (ph >= 2) { B.sum -= dt; if (B.sum <= 0) { B.sum = 8; for (let k = 0; k < 3; k++) this.spawnEnemy('wisp', B.x + (k - 1) * 90, B.y + 60); } }
    if (ph === 3 && !B.diving && B.dive <= 0 && Math.random() < dt / 4) { const [p] = this.target(B); if (p) { B.diving = true; SFX.screech();
      this.tweens.add({ targets: B, x: p.s.x, y: p.s.y - 40, duration: 650, ease: 'Quad.easeIn', delay: 400, onComplete: () => { B.diving = false; B.dive = 0.6; this.cameras.main.shake(250, 0.012); SFX.boom(); } }); } }
  }
  hitBoss(dmg, bl) { const B = this.boss; if (!B.active || this.ended) return; if (bl) bl.disableBody(true, true); B.hp -= dmg; B.setTintFill(0xffffff); this.time.delayedCall(50, () => B.clearTint()); this.sparks.explode(4, bl ? bl.x : B.x, bl ? bl.y : B.y);
    if (B.hp <= 0) this.bossDefeated(); }
  touchBoss(p) { if (p.dashT > 0) { if (!p.dashHit.has(this.boss)) { p.dashHit.add(this.boss); this.hitBoss(4); } return; } if (this.hurt(p)) p.s.body.setVelocity(Math.sign(p.s.x - this.boss.x || 1) * 400, -400); }
  bossDefeated() {
    this.ended = true; const B = this.boss; this.physics.pause(); SFX.music(false); this.enemies.clear(true, true); this.orbs.clear(true, true);
    for (let k = 0; k < 8; k++) this.time.delayedCall(k * 180, () => { this.sparks.explode(40, B.x + Phaser.Math.Between(-80, 80), B.y + Phaser.Math.Between(-80, 80)); SFX.pop(); SFX.boom(); this.cameras.main.shake(150, 0.01); });
    this.time.delayedCall(1500, () => { B.destroy(); this.bossGlow.destroy(); this.addScore(500, B.x, B.y); SFX.win();
      this.tweens.add({ targets: this, darkAlpha: 0, duration: 2500 }); this.tweens.add({ targets: this.dawn, alpha: 1, duration: 2500 }); this.tweens.add({ targets: this.fog, alpha: 0.2, duration: 2500 });
      SFX.stopAmbient(); const s = Save.load(); s.unlocked = 2; Save.save();
      this.time.delayedCall(2200, () => this.scene.get('UI').showVictory()); });
  }
}
