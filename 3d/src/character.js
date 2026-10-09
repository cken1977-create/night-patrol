// Rigged, animated hero: animation state machine with crossfades, speed-synced locomotion (no foot sliding),
// procedural lean, double-jump flip, wall-run, swing arm IK-lite, aim override, and spring-chain scarf/cape.
import * as THREE from 'three';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ASSETS, loadGLTF } from './assets.js';

const CLIPS = { idle: 'Idle_Loop', jog: 'Jog_Fwd_Loop', sprint: 'Sprint_Loop', jumpStart: 'Jump_Start', jumpLoop: 'Jump_Loop', land: 'Jump_Land',
  roll: 'Roll', hit: 'Hit_Chest', shoot: 'Spell_Simple_Shoot', pose: 'Punch_Cross', dance: 'Dance_Loop', walk: 'Walk_Loop' };
const ONCE = new Set(['jumpStart', 'land', 'roll', 'hit', 'shoot', 'pose']);
const E = (color, i = 3) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: i });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function outlineMat(color, w) { const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', `#include <skinning_vertex>\n transformed += normalize(objectNormal) * ${w.toFixed(3)};`); }; return m; }

export function emblemTex(kind, color) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = x.strokeStyle = '#' + new THREE.Color(color).getHexString(); x.lineWidth = 6; x.translate(32, 32); x.beginPath();
  if (kind === 'hex') { for (let i = 0; i < 6; i++) x.lineTo(Math.cos(i * Math.PI / 3) * 22, Math.sin(i * Math.PI / 3) * 22); x.closePath(); x.stroke(); x.beginPath(); x.arc(0, 0, 6, 0, 7); x.fill(); }
  else if (kind === 'star') { for (let i = 0; i < 10; i++) { const r = i % 2 ? 10 : 26, a = i * Math.PI / 5 - Math.PI / 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); }
  else if (kind === 'bolt') { [[4, -28], [-14, 4], [0, 4], [-6, 28], [16, -6], [2, -6]].forEach(([a, b]) => x.lineTo(a, b)); x.closePath(); x.fill(); }
  else if (kind === 'moon') { x.arc(0, 0, 24, 0, 7); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(10, -6, 20, 0, 7); x.fill(); }
  else if (kind === 'heart') { x.moveTo(0, 22); x.bezierCurveTo(-34, 0, -16, -26, 0, -10); x.bezierCurveTo(16, -26, 34, 0, 0, 22); x.fill(); }
  else { x.ellipse(0, 0, 26, 15, 0, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, 8, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

export class Character {
  constructor(gltf, cfg) {
    this.cfg = cfg; this.root = new THREE.Group(); this.lean = new THREE.Group(); this.flipG = new THREE.Group(); this.root.add(this.lean); this.lean.add(this.flipG);
    const model = skClone(gltf.scene); this.model = model; this.flipG.add(model); this.flipG.position.y = 0.95; model.position.y = -0.95; // pivot flips around the hips
    const C = new THREE.Color(cfg.color), A = new THREE.Color(cfg.accent), stealth = cfg.suit === 'stealth', neon = cfg.suit === 'neon';
    const body = new THREE.MeshStandardMaterial({ color: stealth ? 0x1c1c2c : C, roughness: 0.42, metalness: neon ? 0.3 : 0.08, emissive: stealth ? 0x000000 : C, emissiveIntensity: 0.1 });
    const joints = neon ? E(A, 2.5) : new THREE.MeshStandardMaterial({ color: stealth ? A.clone().multiplyScalar(0.8) : C.clone().multiplyScalar(0.35), roughness: 0.6 });
    model.traverse(o => { if (o.isSkinnedMesh || o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = /Joint/i.test(o.material.name) ? joints : body;
      if (o.isSkinnedMesh && !o.userData.hull) { const hull = new THREE.SkinnedMesh(o.geometry, outlineMat(0x14102a, 0.016)); hull.userData.hull = true; hull.bind(o.skeleton, o.bindMatrix); hull.frustumCulled = false; o.parent.add(hull); } } });
    this.bones = {}; model.traverse(o => { if (o.isBone) this.bones[o.name] = o; }); // GLTFLoader strips '.' from names
    this.bone = (n) => this.bones[n] || this.bones[n.replace(/\./g, '')];
    model.updateMatrixWorld(true);
    this.dress(cfg);
    this.mixer = new THREE.AnimationMixer(model); this.actions = {};
    for (const [k, n] of Object.entries(CLIPS)) { const clip = gltf.animations.find(a => a.name === n); if (!clip) continue;
      const a = this.mixer.clipAction(clip); if (ONCE.has(k)) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } this.actions[k] = a; }
    this.state = null; this.play('idle', 0);
    this.t = { hit: 0, roll: 0, land: 0, shoot: 0, flip: 0, jump: 0, pose: 0 }; this.prevYaw = 0; this.leanZ = 0; this.leanX = 0; this.aim = null;
    this.light = new THREE.PointLight(cfg.accent, 3, 9, 1.6); this.light.position.set(0, 1.4, 0.8); this.root.add(this.light);
  }
  attach(boneName, obj, offset) { const b = this.bone(boneName); if (!b) return obj; const w = b.getWorldPosition(new THREE.Vector3()).add(offset || V(0, 0, 0));
    obj.position.copy(w.applyMatrix4(b.matrixWorld.clone().invert())); obj.quaternion.copy(b.getWorldQuaternion(new THREE.Quaternion()).invert()); b.add(obj);
    obj.traverse(o => { if (o.isMesh) o.castShadow = true; }); return obj; }
  chain(boneName, offset, n, segLen, w, mat, along) { // spring chain (scarf / cape) that sways with motion
    const segs = []; let parent = new THREE.Group(); this.attach(boneName, parent, offset); const top = parent;
    for (let i = 0; i < n; i++) { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w * (1 - i * 0.08), 0.02, segLen), mat); m.position.z = -segLen / 2; m.castShadow = true; g.add(m);
      if (i) g.position.z = -segLen; parent.add(g); segs.push({ g, ang: 0, vel: 0 }); parent = g; }
    top.rotation.x = along || 0; return segs; }
  dress(cfg) {
    const A = cfg.accent, glow = E(A, cfg.suit === 'neon' ? 4 : 2.4), dark = new THREE.MeshStandardMaterial({ color: 0x11131f, roughness: 0.5 });
    const head = 'DEF-head', chest = 'DEF-spine.003';
    const em = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), new THREE.MeshStandardMaterial({ map: emblemTex(cfg.emblem, A), emissiveMap: emblemTex(cfg.emblem, A), emissive: 0xffffff, emissiveIntensity: 1.8, transparent: true, depthWrite: false }));
    this.attach(chest, em, V(0, 0.06, 0.135));
    for (const s of ['L', 'R']) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 6, 14), glow); r.rotation.x = Math.PI / 2; this.attach('DEF-forearm.' + s, r, V(0, 0, 0)); r.position.y += 0.2; }
    if (cfg.hero === 'weaver') {
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.07), dark); this.attach(head, mask, V(0, 0.12, 0.085));
      for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.03), E(A, 4)); this.attach(head, g, V(s * 0.045, 0.122, 0.12)); }
      this.segs = this.chain('DEF-neck', V(0, 0.02, -0.07), 6, 0.11, 0.09, new THREE.MeshStandardMaterial({ color: A, roughness: 0.6, side: THREE.DoubleSide }), 0.2);
    } else if (cfg.hero === 'blaster') {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshStandardMaterial({ color: cfg.suit === 'stealth' ? 0x22222e : 0xf2f4fa, metalness: 0.4, roughness: 0.25 })); this.attach(head, helm, V(0, 0.11, 0.01));
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.142, 16, 8, -0.9, 1.8, 1.1, 0.6), E(A, 3)); visor.rotation.y = 0; this.attach(head, visor, V(0, 0.11, 0.012));
      const pack = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.14), new THREE.MeshStandardMaterial({ color: 0xdfe3ee, metalness: 0.5, roughness: 0.35 })); pack.add(box);
      for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 8), E(0xff8a3c, 3)); n.position.set(s * 0.08, -0.22, 0); pack.add(n); }
      this.attach('DEF-spine.002', pack, V(0, 0.05, -0.17)); this.jets = pack;
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0xb8bfd6, metalness: 0.7, roughness: 0.3 }));
      const fa = this.bone('DEF-forearm.R'); if (fa) { can.position.set(0, 0.16, 0); fa.add(can); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), E(A, 4)); tip.position.set(0, 0.32, 0); fa.add(tip); }
    } else {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, 2.1), new THREE.MeshStandardMaterial({ color: 0x161028, roughness: 0.9, side: THREE.DoubleSide })); this.attach(head, hood, V(0, 0.12, -0.01));
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), new THREE.MeshBasicMaterial({ color: 0x000000 })); this.attach(head, face, V(0, 0.11, 0.128));
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.016, 0.01), E(A, 5)); this.attach(head, e, V(s * 0.03, 0.115, 0.135)); }
      this.segs = this.chain(chest, V(0, 0.12, -0.12), 7, 0.13, 0.42, new THREE.MeshStandardMaterial({ color: cfg.suit === 'neon' ? cfg.color : 0x241640, roughness: 0.85, side: THREE.DoubleSide, emissive: A, emissiveIntensity: 0.12 }), 1.35);
    }
  }
  play(k, fade = 0.18, timeScale = 1) { const a = this.actions[k]; if (!a) return; a.timeScale = timeScale; if (this.state === k) return;
    const prev = this.actions[this.state]; a.reset().setEffectiveWeight(1).fadeIn(fade).play(); if (prev) prev.fadeOut(fade); this.state = k; }
  trigger(k) { if (k === 'flip') { this.t.flip = 0.5; return; } this.t[k] = { hit: 0.45, roll: 0.62, land: 0.22, shoot: 0.28, jump: 0.3, pose: 1.6 }[k]; if (k === 'shoot' || k === 'jump') return; this.state = null; }
  setAim(dir) { this.aim = dir; }
  // ctx: {speed, onGround, vy, swinging, anchor(Vector3 world), wall, yaw, menu, jetting}
  update(dt, ctx) {
    for (const k in this.t) this.t[k] -= dt;
    let st = 'idle', ts = 1;
    if (ctx.menu) st = this.t.pose > 0 ? 'pose' : 'idle';
    else if (this.t.hit > 0) st = 'hit';
    else if (this.t.roll > 0) { st = 'roll'; ts = 1.25; }
    else if (this.t.land > 0 && ctx.speed < 4) st = 'land';
    else if (ctx.swinging) st = 'jumpLoop';
    else if (ctx.wall) { st = 'sprint'; ts = 1.4; }
    else if (!ctx.onGround) st = this.t.jump > 0 ? 'jumpStart' : 'jumpLoop';
    else if (ctx.speed > 7) { st = 'sprint'; ts = THREE.MathUtils.clamp(ctx.speed / 7.5, 0.8, 1.9); } // speed-synced: feet stay planted
    else if (ctx.speed > 0.6) { st = 'jog'; ts = THREE.MathUtils.clamp(ctx.speed / 3.6, 0.6, 1.9); }
    this.play(st, st === 'jumpLoop' || st === 'idle' ? 0.22 : 0.14, ts);
    this.mixer.update(dt);
    // procedural layers
    const yawRate = ctx.menu ? 0 : Math.atan2(Math.sin(ctx.yaw - this.prevYaw), Math.cos(ctx.yaw - this.prevYaw)) / Math.max(dt, 1e-3); this.prevYaw = ctx.yaw || 0;
    const tz = THREE.MathUtils.clamp(-yawRate * 0.045 * Math.min(1, ctx.speed / 8 || 0), -0.4, 0.4); this.leanZ += (tz - this.leanZ) * Math.min(1, dt * 8);
    const tx = ctx.wall ? -1.25 : (ctx.onGround && ctx.speed > 7 ? 0.12 : 0); this.leanX += (tx - this.leanX) * Math.min(1, dt * 10);
    this.lean.rotation.set(this.leanX, 0, this.leanZ);
    this.flipG.rotation.x = this.t.flip > 0 ? (1 - this.t.flip / 0.5) * Math.PI * 2 : 0;
    // arm overrides (after mixer): point right arm at anchor (swing) or aim direction (shoot)
    let target = null, w = 0;
    if (ctx.swinging && ctx.anchor) { target = ctx.anchor.clone().sub(this.bone('DEF-upper_arm.R').getWorldPosition(new THREE.Vector3())).normalize(); w = 1; }
    else if (this.t.shoot > 0 && this.aim) { target = this.aim.clone(); w = Math.min(1, this.t.shoot * 6); }
    if (target) for (const bn of ['DEF-upper_arm.R', 'DEF-forearm.R']) { const b = this.bone(bn); if (!b) continue; b.parent.updateWorldMatrix(true, false);
      const pq = b.parent.getWorldQuaternion(new THREE.Quaternion()); const want = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), target); const local = pq.invert().multiply(want); b.quaternion.slerp(local, w); b.updateMatrixWorld(true); }
    // spring chain cloth
    if (this.segs) { const drive = THREE.MathUtils.clamp((ctx.speed || 0) * 0.07 + Math.max(0, -(ctx.vy || 0)) * 0.03 + (ctx.swinging ? 0.5 : 0), 0, 1.3);
      this.segs.forEach((s, i) => { const tgt = -drive * (0.5 + i * 0.12) + Math.sin(performance.now() / 160 + i * 0.7) * (0.05 + drive * 0.08) - 0.05;
        s.vel += (tgt - s.ang) * 60 * dt; s.vel *= Math.exp(-7 * dt); s.ang += s.vel * dt; s.g.rotation.x = -s.ang * (i ? 0.35 : 1); }); }
    if (this.jets) this.jets.children.slice(1).forEach(n => n.material.emissiveIntensity = ctx.jetting ? 8 + Math.random() * 4 : 2);
  }
}
export async function createCharacter(cfg) { const a = ASSETS['hero_' + cfg.hero]; const gltf = await loadGLTF(a.src); return new Character(gltf, cfg); }
