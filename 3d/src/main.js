// Night Patrol 3D — Mission 1 slice. All geometry/textures procedural (original, CC0 with this project).
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'nightpatrol_v1';
let save = {}; try { save = JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) {}
save.p = save.p || [{ hero: 'weaver', color: 0x2fb7ff, name: 'Walker' }];
if (save.scary === undefined) save.scary = true;
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
const HEROES = { weaver: { name: 'WEAVER', sp: 'SWING', tip: 'Hold SWING to fire a web line at a glowing antenna and swing. Release to fling! Push into walls to climb.' },
  blaster: { name: 'BLASTER', sp: 'JET', tip: 'Hold JET to fly. BLAST fires a triple shot.' },
  shade: { name: 'SHADE', sp: 'DASH', tip: 'Tap DASH to zip through monsters and vanish from their sight.' } };
const COLORS = [0x2fb7ff, 0xff3b5c, 0x39e27a, 0xffa630, 0x9b5cff, 0xf5f5f5];
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ---------- renderer / quality ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
$('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 400);
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.8, 0.5, 0.82); composer.addPass(bloom); composer.addPass(new OutputPass());
const TIERS = { low: { pr: 0.6, bloom: false, lights: 3 }, medium: { pr: 0.85, bloom: true, lights: 5 }, high: { pr: Math.min(devicePixelRatio, 1.6), bloom: true, lights: 8 } };
let tier = save.q3d || 'auto', Q = TIERS[tier === 'auto' ? 'medium' : tier];
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(Q.pr); renderer.setSize(w, h); composer.setPixelRatio(Q.pr); composer.setSize(w, h); bloom.resolution.set(w * Q.pr / 2, h * Q.pr / 2); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);
function setTier(t) { Q = TIERS[t]; resize(); lampLights.forEach((l, i) => l.visible = i < Q.lights); $('q').textContent = t.toUpperCase() + (tier === 'auto' ? ' (auto)' : ''); }

// ---------- textures ----------
function canvasTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function windowTex(seed, base) { const R = rng(seed); const mk = (emissive) => canvasTex(128, 128, (c) => {
  c.fillStyle = emissive ? '#000' : base; c.fillRect(0, 0, 128, 128);
  for (let y = 8; y < 128; y += 32) for (let x = 6; x < 128; x += 32) { const r = R();
    const lit = r < 0.2 ? '#ffcf6b' : r < 0.27 ? '#7cc8ff' : null; c.fillStyle = lit ? (emissive ? lit : lit) : (emissive ? '#000' : '#0d0b16'); c.fillRect(x, y, 18, 20); } });
  const s = R; const a = mk(false); const R2 = rng(seed); const b = (() => { const Rb = R2; return canvasTex(128, 128, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 128, 128);
    for (let y = 8; y < 128; y += 32) for (let x = 6; x < 128; x += 32) { const r = Rb(); if (r < 0.27) { c.fillStyle = r < 0.2 ? '#ffcf6b' : '#7cc8ff'; c.fillRect(x, y, 18, 20); } } }); })();
  [a, b].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; }); return [a, b]; }
// keep emissive and color maps in sync by regenerating with same seed
function buildingMat(seed, base) { const R = rng(seed); const pat = []; for (let i = 0; i < 16; i++) pat.push(R());
  const draw = (emissive) => canvasTex(128, 128, (c) => { c.fillStyle = emissive ? '#000' : base; c.fillRect(0, 0, 128, 128); let k = 0;
    for (let y = 8; y < 128; y += 32) for (let x = 6; x < 128; x += 32) { const r = pat[k++]; const lit = r < 0.2 ? '#ffcf6b' : r < 0.27 ? '#7cc8ff' : null;
      c.fillStyle = lit || (emissive ? '#000' : '#0d0b16'); c.fillRect(x, y, 18, 20); } });
  const map = draw(false), em = draw(true); [map, em].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; });
  return new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.9 }); }
const glowTex = canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
const fogTex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(170,150,220,0.35)'); g.addColorStop(1, 'rgba(170,150,220,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
const glowSprite = (color, size, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity })); s.scale.setScalar(size); return s; };
const E = (color, intensity = 3) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity });

// ---------- world ----------
const GRID = 7, CELL = 34, SIZE = GRID * CELL;
const buildings = [], anchors = [], lamps = [], lampLights = [], cellMap = new Map();
let world, tower, door, beacons = [];
function buildWorld(scary) {
  world = new THREE.Group(); scene.add(world);
  scene.background = new THREE.Color(scary ? 0x04030a : 0x0b0820);
  scene.fog = new THREE.FogExp2(scary ? 0x07051a : 0x120c2c, scary ? 0.03 : 0.016);
  scene.add(new THREE.HemisphereLight(0x5a4a9a, 0x0a0614, scary ? 0.25 : 0.55));
  const moonL = new THREE.DirectionalLight(0x9fb4ff, scary ? 0.35 : 0.7); moonL.position.set(-60, 120, -80); scene.add(moonL);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf4efd2, fog: false })); moon.position.set(-160, 140, -260); scene.add(moon);
  const mg = glowSprite(0xfff3c0, 70, 0.5); mg.material.fog = false; mg.position.copy(moon.position); scene.add(mg);
  // stars
  const sg = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 600; i++) { const a = Math.random() * 6.28, e = 0.15 + Math.random() * 1.2; sp.push(Math.cos(a) * 300 * Math.cos(e), 300 * Math.sin(e), Math.sin(a) * 300 * Math.cos(e)); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, fog: false, sizeAttenuation: false })));
  // ground + streets
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SIZE + 200, SIZE + 200), new THREE.MeshStandardMaterial({ color: 0x15121f, roughness: 0.6, metalness: 0.2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(SIZE / 2, 0, SIZE / 2); world.add(ground);
  const R = rng(1234); const mats = [buildingMat(11, '#1b1726'), buildingMat(22, '#221a2e'), buildingMat(33, '#161c2a'), buildingMat(44, '#241c22')];
  const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x3c3552, roughness: 0.8 });
  const antMat = new THREE.MeshStandardMaterial({ color: 0x8a86a8, metalness: 0.6, roughness: 0.4 }), tipMat = E(0xff3355, 4), hookMat = E(0x9ff7ff, 3);
  for (let gx = 0; gx < GRID; gx++) for (let gz = 0; gz < GRID; gz++) {
    const isStart = gx === 0 && gz === 0, isTower = gx === GRID - 1 && gz === GRID - 1;
    if (!isStart && !isTower && R() < 0.08) continue; // plaza
    const w = isTower ? 22 : 14 + R() * 10, d = isTower ? 22 : 14 + R() * 10, h = isStart ? 10 : isTower ? 46 : 8 + R() * 26;
    const cx = gx * CELL + CELL / 2 + (R() - 0.5) * 3, cz = gz * CELL + CELL / 2 + (R() - 0.5) * 3;
    const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv;
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; const u0 = uv.getX(i), v0 = uv.getY(i);
      if (f === 2 || f === 3) uv.setXY(i, 0.01, 0.01); else uv.setXY(i, u0 * (f < 2 ? d : w) / 8, v0 * h / 8); }
    const m = new THREE.Mesh(geo, mats[(gx + gz * 3) % 4]); m.position.set(cx, h / 2, cz); world.add(m);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), ledgeMat); ledge.position.set(cx, h + 0.25, cz); world.add(ledge);
    const b = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, top: h + 0.5, cx, cz, gx, gz, h }; buildings.push(b); cellMap.set(gx + ',' + gz, b);
    if (isTower) { tower = b; continue; }
    // antenna anchor (swing point)
    const ah = 9 + R() * 6, ax = cx + (R() - 0.5) * w * 0.5, az = cz + (R() - 0.5) * d * 0.5;
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, ah, 5), antMat); ant.position.set(ax, b.top + ah / 2, az); world.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), hookMat); tip.position.set(ax, b.top + ah, az); world.add(tip);
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), tipMat); blink.position.set(ax, b.top + ah - 1.2, az); world.add(blink);
    anchors.push(new THREE.Vector3(ax, b.top + ah, az));
    if (R() < 0.35) { const wt = new THREE.Group(); const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 10), new THREE.MeshStandardMaterial({ color: 0x2a2238 })); tank.position.y = 3.3;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0x352b48 })); roof.position.y = 5.2;
      for (let k = 0; k < 4; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2, 4), antMat); leg.position.set(Math.cos(k * 1.57) * 1.2, 1, Math.sin(k * 1.57) * 1.2); wt.add(leg); }
      wt.add(tank, roof); wt.position.set(cx - (ax - cx) * 0.8, b.top, cz - (az - cz) * 0.8); world.add(wt);
      buildings.push({ minX: wt.position.x - 1.6, maxX: wt.position.x + 1.6, minZ: wt.position.z - 1.6, maxZ: wt.position.z + 1.6, top: b.top + 4.6, small: true }); }
  }
  // clock tower details + door
  const tp = new THREE.Mesh(new THREE.ConeGeometry(17, 14, 4), new THREE.MeshStandardMaterial({ color: 0x1b1530 })); tp.rotation.y = Math.PI / 4; tp.position.set(tower.cx, tower.top + 7, tower.cz); world.add(tp);
  [[0, -1], [-1, 0]].forEach(([sx, sz]) => { const clock = new THREE.Mesh(new THREE.CircleGeometry(5, 24), E(0xfff3c0, 1.4)); clock.position.set(tower.cx + sx * 11.05, tower.top - 8, tower.cz + sz * 11.05); clock.lookAt(clock.position.x + sx, clock.position.y, clock.position.z + sz); world.add(clock); });
  door = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.4), E(0x1a1626, 1)); door.position.set(tower.cx, 3, tower.minZ - 0.25); world.add(door);
  door.light = new THREE.PointLight(0x6ff0ff, 0, 25, 1.6); door.light.position.set(tower.cx, 4, tower.minZ - 3); scene.add(door.light);
  // street lamps (also swing anchors) along streets
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c2840, metalness: 0.5, roughness: 0.5 }), bulbMat = E(0xffd27a, 5);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i <= GRID; i++) for (let j = 0; j < GRID; j++) { if ((i + j) % 2) continue;
    [[i * CELL, j * CELL + CELL / 2], [j * CELL + CELL / 2, i * CELL]].forEach(([x, z]) => { if (x < 2 || z < 2 || x > SIZE - 2 || z > SIZE - 2) return;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7, 6), poleMat); pole.position.set(x, 3.5, z); world.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bulbMat); bulb.position.set(x, 7, z); world.add(bulb);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 7, 16, 1, true), coneMat); cone.position.set(x, 3.5, z); world.add(cone);
      const L = { pos: new THREE.Vector3(x, 6.8, z), bulb, cone, fl: 0 }; lamps.push(L); anchors.push(new THREE.Vector3(x, 7.2, z)); }); }
  for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffc870, 0, 22, 1.5); scene.add(l); lampLights.push(l); }
  // low drifting fog banks (volumetric-style)
  world.fogs = []; for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: scary ? 0.55 : 0.35 }));
    s.scale.set(30 + Math.random() * 30, 8 + Math.random() * 6, 1); s.position.set(Math.random() * SIZE, 2 + Math.random() * 5, Math.random() * SIZE); s.v = (Math.random() - 0.5) * 1.5; world.add(s); world.fogs.push(s); }
  // beacons on 4 far-apart rooftops
  const pick = [[1, GRID - 2], [GRID - 2, 1], [Math.floor(GRID / 2), Math.floor(GRID / 2)], [GRID - 3, GRID - 2]];
  pick.forEach(([gx, gz]) => { let b = cellMap.get(gx + ',' + gz) || buildings.find(bb => !bb.small && bb !== tower && !beacons.some(x => x.b === bb) && bb.gx >= gx);
    const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 6), poleMat); pole.position.y = 1.5;
    const lan = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0x4a4560, emissive: 0x000000 })); lan.position.y = 3.4; g.add(pole, lan);
    const halo = glowSprite(0xffd36b, 3, 0.5); halo.position.y = 3.4; g.add(halo);
    g.position.set(b.cx, b.top, b.cz); world.add(g); beacons.push({ g, lan, halo, b, lit: false, pos: new THREE.Vector3(b.cx, b.top + 1, b.cz) }); });
}

// ---------- hero ----------
function makeHero(type, color) {
  const g = new THREE.Group(), C = new THREE.Color(color), dark = C.clone().multiplyScalar(0.35);
  const mat = new THREE.MeshStandardMaterial({ color: C, roughness: 0.5, emissive: C, emissiveIntensity: 0.15 }), dm = new THREE.MeshStandardMaterial({ color: dark, roughness: 0.7 });
  const legs = []; for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.25), type === 'blaster' ? new THREE.MeshStandardMaterial({ color: 0x3a3f55 }) : dm); l.geometry.translate(0, -0.37, 0); l.position.set(s * 0.15, 0.78, 0); g.add(l); legs.push(l); }
  if (type === 'shade') { const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 7), new THREE.MeshStandardMaterial({ color: 0x1a1028, roughness: 0.9 })); cloak.position.y = 1.05; g.add(cloak);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 4, 14), E(color, 2)); trim.rotation.x = Math.PI / 2; trim.position.y = 0.4; g.add(trim);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0x0d0716 })); hood.position.y = 1.75; g.add(hood);
    for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), E(color, 5)); eye.position.set(s * 0.09, 1.76, 0.27); g.add(eye); }
  } else {
    const body = new THREE.Mesh(type === 'blaster' ? new THREE.BoxGeometry(0.62, 0.75, 0.4) : new THREE.CapsuleGeometry(0.28, 0.45, 4, 8), mat); body.position.y = 1.15; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), mat); head.position.y = 1.75; g.add(head);
    for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.45, 3, 6), mat); arm.position.set(s * 0.38, 1.15, 0); g.add(arm); }
    if (type === 'weaver') {
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.12), new THREE.MeshStandardMaterial({ color: 0x11131f })); mask.position.set(0, 1.79, 0.2); g.add(mask);
      for (const s of [-1, 1]) { const gog = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.05), E(0x9ff7ff, 4)); gog.position.set(s * 0.1, 1.79, 0.27); g.add(gog);
        const wrist = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 4, 10), E(0x9ff7ff, 3)); wrist.rotation.x = Math.PI / 2; wrist.position.set(s * 0.38, 0.92, 0); g.add(wrist); }
      const hex = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), E(0xffffff, 2)); hex.position.set(0, 1.22, 0.29); g.add(hex);
      const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.7), dm); scarf.geometry.translate(0, 0, -0.35); scarf.position.set(0.1, 1.5, -0.15); g.add(scarf); g.scarf = scarf;
    } else {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), E(0xffe066, 3)); visor.position.set(0, 1.78, 0.23); g.add(visor);
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.25), new THREE.MeshStandardMaterial({ color: 0x4a5068, metalness: 0.5 })); pack.position.set(0, 1.15, -0.32); g.add(pack);
      for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.15, 6), E(0xff8a3c, 3)); n.position.set(s * 0.13, 0.8, -0.32); g.add(n); }
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x8a90a6, metalness: 0.7, roughness: 0.3 })); can.rotation.x = Math.PI / 2; can.position.set(0.4, 1.1, 0.25); g.add(can);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), E(color, 4)); tip.position.set(0.4, 1.1, 0.56); g.add(tip);
    }
  }
  const glow = new THREE.PointLight(color, 6, 12, 1.6); glow.position.y = 1.4; g.add(glow);
  g.legs = legs; return g;
}

// ---------- state ----------
const P = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, onGround: false, jumps: 0, hp: 5, inv: 0, fire: 0, fuel: 100, dashT: 0, dashCd: 0, cloak: 0, swing: null, safe: new THREE.Vector3(), down: 0, walk: 0 };
let hero, heroType, heroColor, scary, cam = { yaw: Math.PI * 0.75, pitch: 0.32, dist: 9 }, score = 0, lit = 0, running = false, ended = false, tScare = 25, tWhisper = 8, tSpawn = 2;
const enemies = [], blasts = [], input = { x: 0, y: 0, jump: false, fire: false, sp: false, jumpP: false, spP: false, camDX: 0, camDY: 0 };
let rope;
// sparks particle pool
const NS = 600, sparkGeo = new THREE.BufferGeometry(), sPos = new Float32Array(NS * 3), sCol = new Float32Array(NS * 3), sVel = new Float32Array(NS * 3), sLife = new Float32Array(NS); let sIdx = 0;
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sparkGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.35, map: glowTex, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sparks.frustumCulled = false;
const SPARK_COLS = [0xb6ff4a, 0x9ff7ff, 0xffe066, 0xd8b4ff, 0xffffff].map(c => new THREE.Color(c));
function burst(p, n = 30, sp = 9) { for (let i = 0; i < n; i++) { const k = sIdx++ % NS; sPos.set([p.x, p.y, p.z], k * 3); const v = new THREE.Vector3().randomDirection().multiplyScalar(sp * (0.3 + Math.random())); sVel.set([v.x, v.y + 3, v.z], k * 3); const c = SPARK_COLS[i % 5]; sCol.set([c.r * 2, c.g * 2, c.b * 2], k * 3); sLife[k] = 0.5 + Math.random() * 0.6; } }
function updSparks(dt) { for (let k = 0; k < NS; k++) { if (sLife[k] <= 0) continue; sLife[k] -= dt; const f = Math.max(0, sLife[k]); sVel[k * 3 + 1] -= 14 * dt;
  for (let a = 0; a < 3; a++) sPos[k * 3 + a] += sVel[k * 3 + a] * dt; if (f <= 0) sPos[k * 3 + 1] = -999; sCol[k * 3] *= 0.985; sCol[k * 3 + 1] *= 0.985; sCol[k * 3 + 2] *= 0.985; }
  sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true; }

const wispGeo = new THREE.SphereGeometry(0.7, 12, 10), wispMat = new THREE.MeshStandardMaterial({ color: 0x07040d, roughness: 1 }), eyeMat = E(0xb6ff4a, 6), tailGeo = new THREE.ConeGeometry(0.5, 1.4, 8);
function spawnWisp(pos) { const g = new THREE.Group(); const body = new THREE.Mesh(wispGeo, wispMat); const tail = new THREE.Mesh(tailGeo, wispMat); tail.rotation.x = Math.PI; tail.position.y = -0.9; g.add(body, tail);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 4), eyeMat); e.position.set(s * 0.25, 0.12, 0.6); g.add(e); }
  const aura = glowSprite(0x6a2cff, 4, 0.55); g.add(aura); g.position.copy(pos); scene.add(g);
  enemies.push({ g, hp: 2, ph: Math.random() * 6, spd: 5 + Math.random() * 2 + (scary ? 1 : 0), vel: new THREE.Vector3() }); }
const blastGeo = new THREE.SphereGeometry(0.22, 8, 6);
function shoot() {
  const origin = P.pos.clone().add(new THREE.Vector3(0, 1.2, 0)); const fwd = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
  let best = null, bd = 42; for (const e of enemies) { const to = e.g.position.clone().sub(origin); const d = to.length(); if (d < bd && to.normalize().dot(fwd) > 0.55) { bd = d; best = e; } }
  const dir = best ? best.g.position.clone().sub(origin).normalize() : new THREE.Vector3(Math.sin(cam.yaw + Math.PI), 0.08, Math.cos(cam.yaw + Math.PI)).normalize();
  if (!best && Math.abs(input.x) + Math.abs(input.y) > 0.2) dir.copy(fwd).setY(0.05).normalize();
  const spread = heroType === 'blaster' ? [-0.12, 0, 0.12] : [0];
  for (const s of spread) { const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), s); const m = new THREE.Mesh(blastGeo, E(heroColor, 6)); m.position.copy(origin).addScaledVector(d, 0.6); scene.add(m); blasts.push({ m, v: d.multiplyScalar(48), life: 1.1 }); }
  P.fire = heroType === 'blaster' ? 0.32 : 0.2; SFX.zap();
}
function hurt(from) { if (P.inv > 0 || P.dashT > 0 || P.down > 0 || ended) return; P.hp--; P.inv = 1.3; SFX.hurt(); shake = 0.4; releaseSwing(false);
  const k = P.pos.clone().sub(from).setY(0).normalize().multiplyScalar(10); P.vel.set(k.x, 7, k.z);
  if (P.hp <= 0) { P.down = 1.6; burst(P.pos.clone().setY(P.pos.y + 1), 40); hero.visible = false; } }
let shake = 0;

// ---------- physics ----------
const R_ = 0.45, H_ = 1.8;
function collide(prevY) {
  P.onGround = false; let wall = null;
  if (P.pos.y <= 0) { P.pos.y = 0; if (P.vel.y < 0) P.vel.y = 0; P.onGround = true; }
  for (const b of buildings) {
    if (P.pos.x < b.minX - R_ || P.pos.x > b.maxX + R_ || P.pos.z < b.minZ - R_ || P.pos.z > b.maxZ + R_ || P.pos.y > b.top + 0.01) continue;
    if (prevY >= b.top - 0.35 && P.vel.y <= 0) { P.pos.y = b.top; P.vel.y = 0; P.onGround = true; continue; }
    if (P.pos.y + H_ < b.top - (b.h || 4) - 1) continue;
    const pens = [[P.pos.x - (b.minX - R_), -1, 'x'], [(b.maxX + R_) - P.pos.x, 1, 'x'], [P.pos.z - (b.minZ - R_), -1, 'z'], [(b.maxZ + R_) - P.pos.z, 1, 'z']].sort((a, c) => a[0] - c[0]);
    const [pen, sgn, ax] = pens[0]; P.pos[ax] += sgn * pen; if (P.vel[ax] * sgn < 0) P.vel[ax] = 0; wall = { ax, sgn, b };
  }
  return wall;
}
function pickAnchor() { const fwd = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)); let best = null, bs = 1e9;
  for (const a of anchors) { if (a.y < P.pos.y + 3) continue; const to = a.clone().sub(P.pos); const d = to.length(); if (d > 48 || d < 4) continue; const dot = to.setY(0).normalize().dot(fwd); if (dot < -0.1) continue; const s = d - dot * 14; if (s < bs) { bs = s; best = a; } }
  return best; }
function releaseSwing(boost) { if (!P.swing) return; P.swing = null; rope.visible = false; if (boost) { P.vel.multiplyScalar(1.12); P.vel.y += 7; SFX.jump(); } P.jumps = 1; }
function step(dt) {
  if (P.down > 0) { P.down -= dt; if (P.down <= 0) { P.pos.copy(P.safe); P.vel.set(0, 0, 0); P.hp = 5; P.inv = 2; hero.visible = true; score = Math.max(0, score - 20); } return; }
  P.inv -= dt; P.fire -= dt; P.dashCd -= dt; P.cloak -= dt;
  // camera-relative input
  const f = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), r = new THREE.Vector3(-f.z, 0, f.x);
  const want = f.multiplyScalar(-input.y).add(r.multiplyScalar(input.x)); const mag = Math.min(1, want.length());
  if (mag > 0.15) { const ty = Math.atan2(want.x, want.z); let dy = ty - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); P.yaw += dy * Math.min(1, dt * 12); }
  const SPEED = 10;
  if (P.dashT > 0) { P.dashT -= dt; P.vel.x = Math.sin(P.yaw) * 34; P.vel.z = Math.cos(P.yaw) * 34; P.vel.y = 0; burst(P.pos.clone().setY(P.pos.y + 1), 2, 2); for (const e of enemies) if (!e.dashHit && e.g.position.distanceTo(P.pos) < 2.2) { e.dashHit = true; hitEnemy(e, 2); } }
  else if (!P.swing) { const k = P.onGround ? 14 : 4; const wn = want.lengthSq() > 1e-6 ? want.clone().normalize() : want; const tx = wn.x * mag * SPEED, tz = wn.z * mag * SPEED;
    P.vel.x += (tx - P.vel.x) * Math.min(1, k * dt); P.vel.z += (tz - P.vel.z) * Math.min(1, k * dt); }
  // jump
  if (input.jumpP) { if (P.swing) releaseSwing(true); else if (P.onGround) { P.vel.y = 12; P.jumps = 1; SFX.jump(); } else if (P.jumps < 2) { P.vel.y = 11; P.jumps = 2; SFX.jump(); burst(P.pos, 8, 3); } }
  if (input.fire && P.fire <= 0) shoot();
  // specials
  if (heroType === 'weaver') {
    if (input.spP && !P.swing) { const a = pickAnchor(); SFX.web(); if (a) { P.swing = { a, L: a.distanceTo(P.pos.clone().setY(P.pos.y + 1.3)) }; rope.visible = true; P.vel.addScaledVector(new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)), 4); } }
    if (P.swing && !input.sp) releaseSwing(true);
  } else if (heroType === 'blaster') { if (input.sp && P.fuel > 0) { P.fuel -= 45 * dt; P.vel.y = Math.min(P.vel.y + 42 * dt, 8); burst(P.pos.clone().setY(P.pos.y + 0.8), 1, 2); if (Math.random() < 0.2) SFX.jet(); } }
  else { if (input.spP && P.dashCd <= 0) { P.dashT = 0.25; P.dashCd = 0.85; P.cloak = 2.2; P.inv = Math.max(P.inv, 0.35); SFX.dash(); enemies.forEach(e => e.dashHit = false); } P.fuel = Math.min(100, Math.max(0, (1 - P.dashCd / 0.85) * 100)); }
  // gravity + integrate (pendulum constraint for swing)
  P.vel.y -= 28 * dt; if (P.vel.y < -40) P.vel.y = -40;
  if (P.swing) { const pump = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)).multiplyScalar(mag * 14 * dt); P.vel.add(pump); if (input.y < -0.5) P.swing.L = Math.max(5, P.swing.L - 6 * dt); }
  const prevY = P.pos.y; P.pos.addScaledVector(P.vel, dt);
  if (P.swing) { const hand = P.pos.clone().setY(P.pos.y + 1.3); const d = hand.clone().sub(P.swing.a); const len = d.length();
    if (len > P.swing.L) { d.multiplyScalar(1 / len); P.pos.addScaledVector(d, -(len - P.swing.L)); const vr = P.vel.dot(d); if (vr > 0) P.vel.addScaledVector(d, -vr); } }
  const wall = collide(prevY);
  if (P.swing && P.onGround && P.vel.length() < 2) releaseSwing(false);
  if (wall && heroType === 'weaver' && mag > 0.3 && !P.onGround) { P.vel.y = Math.max(P.vel.y, 6); P.jumps = 0; } // wall-climb
  if (P.onGround) { P.jumps = 0; if (heroType === 'blaster') P.fuel = Math.min(100, P.fuel + 60 * dt); if (P.pos.y > 1 && P.inv <= 0) P.safe.copy(P.pos).setY(P.pos.y + 0.5); }
  P.pos.x = THREE.MathUtils.clamp(P.pos.x, -40, SIZE + 40); P.pos.z = THREE.MathUtils.clamp(P.pos.z, -40, SIZE + 40);
  // hero visual
  hero.position.copy(P.pos); hero.rotation.y = P.yaw; P.walk += dt * Math.hypot(P.vel.x, P.vel.z) * (P.onGround ? 1.2 : 0);
  hero.legs.forEach((l, i) => l.rotation.x = P.onGround ? Math.sin(P.walk + i * Math.PI) * 0.7 : (P.swing ? 0.5 : -0.3 + i * 0.6));
  if (hero.scarf) hero.scarf.rotation.x = 0.3 + Math.min(1, P.vel.length() / 20) * -0.9 + Math.sin(performance.now() / 120) * 0.1;
  hero.rotation.z = P.swing ? THREE.MathUtils.clamp(-P.vel.dot(new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw))) * 0.03, -0.5, 0.5) : 0;
  hero.traverse(o => { if (o.material && o.material.opacity !== undefined && !o.isLight) { o.material.transparent = P.cloak > 0; o.material.opacity = P.cloak > 0 ? 0.35 : 1; } });
  hero.visible = P.inv > 0 ? (Math.floor(performance.now() / 70) % 2 === 0) : true;
  if (P.swing) { const hand = P.pos.clone().setY(P.pos.y + 1.6); const mid = hand.clone().add(P.swing.a).multiplyScalar(0.5); const len = hand.distanceTo(P.swing.a);
    rope.position.copy(mid); rope.scale.set(1, len, 1); rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), P.swing.a.clone().sub(hand).normalize()); }
  // objectives
  for (const bc of beacons) if (!bc.lit && bc.pos.distanceTo(P.pos) < 3) { bc.lit = true; lit++; score += 50; SFX.pickup(); burst(bc.pos.clone().setY(bc.pos.y + 2.5), 60, 10);
    bc.lan.material.emissive.set(0xffe9a0); bc.lan.material.emissiveIntensity = 4; bc.halo.scale.setScalar(6); bc.halo.material.opacity = 0.6;
    const L = new THREE.PointLight(0xffd36b, 14, 30, 1.6); L.position.copy(bc.pos).setY(bc.pos.y + 3.5); scene.add(L);
    if (lit === beacons.length) { door.material.emissive.set(0x6ff0ff); door.material.emissiveIntensity = 3; door.light.intensity = 40; toast('All beacons lit! The clock tower door is open!'); } else toast(`Beacon lit! ${lit}/${beacons.length}`); }
  if (lit === beacons.length && P.pos.distanceTo(door.position) < 4.5 && !ended) complete();
}
function hitEnemy(e, dmg) { e.hp -= dmg; e.flash = 0.08; if (e.hp <= 0) { burst(e.g.position, 40, 10); SFX.pop(); score += 10; scene.remove(e.g); enemies.splice(enemies.indexOf(e), 1); } }
function updEnemies(dt) {
  tSpawn -= dt; const cap = scary ? 11 : 8;
  if (tSpawn <= 0) { tSpawn = scary ? 1.6 : 2.4; if (enemies.length < cap) { const a = cam.yaw + (Math.random() - 0.5) * 2.5; const d = 28 + Math.random() * 12;
    spawnWisp(new THREE.Vector3(P.pos.x + Math.sin(a) * d, Math.max(3, P.pos.y + 2 + Math.random() * 6), P.pos.z + Math.cos(a) * d)); } }
  for (const e of enemies.slice()) { e.ph += dt * 3; const to = P.pos.clone().setY(P.pos.y + 1.1).sub(e.g.position); const d = to.length();
    if (d < 50 && P.cloak <= 0 && P.down <= 0) e.vel.lerp(to.normalize().multiplyScalar(e.spd), 0.04); else e.vel.multiplyScalar(0.97);
    e.vel.y += Math.sin(e.ph) * 0.1; e.g.position.addScaledVector(e.vel, dt); e.g.lookAt(P.pos.x, e.g.position.y, P.pos.z); e.g.scale.setScalar(1 + Math.sin(e.ph * 2) * 0.06);
    if (e.flash > 0) { e.flash -= dt; e.g.children[0].material = e.flash > 0 ? E(0xffffff, 3) : wispMat; }
    if (d < 1.3) hurt(e.g.position); if (d > 90) { scene.remove(e.g); enemies.splice(enemies.indexOf(e), 1); } }
  for (const b of blasts.slice()) { b.life -= dt; b.m.position.addScaledVector(b.v, dt); let hit = b.life <= 0;
    if (!hit) for (const e of enemies) if (e.g.position.distanceTo(b.m.position) < 1.1) { hitEnemy(e, 1); hit = true; break; }
    if (hit) { scene.remove(b.m); blasts.splice(blasts.indexOf(b), 1); } }
}
function updLights(t) { // assign real point lights to the nearest lamps (cheap "many lights")
  lamps.sort((a, b) => a.pos.distanceToSquared(P.pos) - b.pos.distanceToSquared(P.pos));
  lampLights.forEach((l, i) => { const L = lamps[i]; if (!L || i >= Q.lights) { l.visible = false; return; } l.visible = true; l.position.copy(L.pos);
    let k = 1; if (scary) { if (L.fl > 0) { L.fl--; k = 0.1; } else if (Math.random() < 0.004) L.fl = 10 + Math.random() * 20; } l.intensity = 22 * k; L.bulb.material = k < 1 ? wispMat : L.bulb.userData.m || (L.bulb.userData.m = L.bulb.material); L.cone.visible = k === 1; });
}

// ---------- UI / input ----------
function toast(m) { const t = $('toast'); t.textContent = m; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => t.style.opacity = 0, 2400); }
function hud() { $('hp').textContent = '♥'.repeat(Math.max(0, P.hp)) + '♡'.repeat(5 - Math.max(0, P.hp)); $('score').textContent = '✦ ' + score;
  $('obj').textContent = lit < beacons.length ? `Beacons lit: ${lit}/${beacons.length}` : 'Go to the glowing clock tower door!';
  $('fuel').style.width = (heroType === 'weaver' ? 0 : P.fuel) + 'px';
  const tgt = lit < beacons.length ? beacons.filter(b => !b.lit).sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos))[0].pos : door.position;
  const ang = Math.atan2(tgt.x - P.pos.x, tgt.z - P.pos.z) - (cam.yaw + Math.PI); $('arrow').style.transform = `rotate(${-ang}rad)`;
  $('dist').textContent = Math.round(tgt.distanceTo(P.pos)) + 'm'; }
const touch = { joy: null, cam: null };
function bindControls() {
  const joyEl = $('joy'), knob = $('knob');
  const btn = (id, key) => { const el = $(id); el.addEventListener('pointerdown', e => { e.preventDefault(); input[key] = true; el.classList.add('on'); SFX.init(); el.setPointerCapture(e.pointerId); });
    const up = () => { input[key] = false; el.classList.remove('on'); }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); };
  btn('bJump', 'jump'); btn('bFire', 'fire'); btn('bSp', 'sp');
  const zone = $('touch');
  zone.addEventListener('pointerdown', e => { if (e.target.closest('.btn')) return; e.preventDefault(); SFX.init();
    if (e.clientX < innerWidth * 0.45 && !touch.joy) { touch.joy = { id: e.pointerId, x: e.clientX, y: e.clientY }; joyEl.style.left = e.clientX - 60 + 'px'; joyEl.style.top = e.clientY - 60 + 'px'; joyEl.style.opacity = 1; }
    else if (!touch.cam) touch.cam = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  zone.addEventListener('pointermove', e => { if (touch.joy && e.pointerId === touch.joy.id) { let dx = e.clientX - touch.joy.x, dy = e.clientY - touch.joy.y; const d = Math.hypot(dx, dy), R = 55; if (d > R) { dx *= R / d; dy *= R / d; }
      input.x = dx / R; input.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; }
    if (touch.cam && e.pointerId === touch.cam.id) { input.camDX += e.clientX - touch.cam.x; input.camDY += e.clientY - touch.cam.y; touch.cam.x = e.clientX; touch.cam.y = e.clientY; } });
  const end = e => { if (touch.joy && e.pointerId === touch.joy.id) { touch.joy = null; input.x = input.y = 0; knob.style.transform = ''; joyEl.style.opacity = 0.5; joyEl.style.left = '50px'; joyEl.style.top = ''; }
    if (touch.cam && e.pointerId === touch.cam.id) touch.cam = null; };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  const keys = {}; addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Escape') togglePause(); }); addEventListener('keyup', e => keys[e.code] = false);
  bindControls.kb = () => { if (touch.joy) return; const kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), ky = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (kx || ky || bindControls.kbWas) { input.x = kx; input.y = ky; bindControls.kbWas = !!(kx || ky); }
    ['jump', 'fire', 'sp'].forEach((k, i) => { const c = [['Space'], ['KeyF', 'KeyJ'], ['KeyG', 'KeyK']][i]; const kd = c.some(x => keys[x]); if (kd) input[k] = true; else if (bindControls['k' + k]) input[k] = false; bindControls['k' + k] = kd; });
    if (keys.KeyQ) input.camDX -= 6; if (keys.KeyE) input.camDX += 6; };
  $('pause').onclick = togglePause;
}
let paused = false; function togglePause() { if (!running || ended) return; paused = !paused; $('pauseMenu').style.display = paused ? 'flex' : 'none'; }
document.addEventListener('visibilitychange', () => { if (document.hidden) { SFX.suspend(); if (running && !ended && !paused) togglePause(); } else SFX.resume(); });

function complete() { ended = true; SFX.win(); SFX.stopAmbient(); $('endMsg').innerHTML = `Mission complete!<br><small>Sparks: ✦ ${score}</small><br><small>Mission 2 and the Hollow King boss come next in 3D. For now, play them in the classic game.</small>`; $('end').style.display = 'flex'; }
function jumpScare() { SFX.screech(); shake = 0.6; const s = $('scare'); s.style.display = 'block'; s.style.animation = 'none'; void s.offsetWidth; s.style.animation = 'scare 0.9s ease-out forwards';
  setTimeout(() => { s.style.display = 'none'; for (let k = 0; k < 3; k++) spawnWisp(P.pos.clone().add(new THREE.Vector3(Math.sin(P.yaw) * 6 + (k - 1) * 3, 2.5, Math.cos(P.yaw) * 6))); }, 900); }

// ---------- loop ----------
const clock = new THREE.Clock(); let acc = 0, fpsT = 0, fpsN = 0, lowFor = 0, lightT = 0;
function frame() {
  requestAnimationFrame(frame);
  let dt = Math.min(clock.getDelta(), 0.05);
  if (save.saver3d !== false) { acc += dt; if (acc < 1 / 31) return; dt = Math.min(acc, 0.05); acc = 0; }
  fpsN++; fpsT += dt; if (fpsT > 1) { const fps = fpsN / fpsT; $('fps').textContent = Math.round(fps) + ' fps'; fpsN = fpsT = 0;
    const target = save.saver3d !== false ? 26 : 45; if (tier === 'auto' && running) { lowFor = fps < target ? lowFor + 1 : 0; if (lowFor >= 3 && Q !== TIERS.low) { setTier(Q === TIERS.high ? 'medium' : 'low'); lowFor = 0; } } }
  if (running && !paused && !ended) {
    bindControls.kb();
    // sub-step physics for stable pendulum
    const n = Math.ceil(dt / (1 / 120)); for (let i = 0; i < n; i++) { step(dt / n); input.jumpP = false; input.spP = false; }
    updEnemies(dt); if ((lightT -= dt) < 0) { updLights(); lightT = 0.3; }
    if (scary) { tWhisper -= dt; if (tWhisper < 0) { SFX.whisper(); tWhisper = 7 + Math.random() * 9; } tScare -= dt; if (tScare < 0 && P.vel.length() > 3) { tScare = 30 + Math.random() * 25; jumpScare(); } }
    if (P.hp <= 2 && P.down <= 0) { P.beat = (P.beat || 0) - dt; if (P.beat < 0) { SFX.heartbeat(); P.beat = 0.9; } }
    hud();
  }
  updSparks(dt);
  if (world) world.fogs.forEach(s => { s.position.x += s.v * dt; if (s.position.x > SIZE + 20) s.position.x = -20; if (s.position.x < -20) s.position.x = SIZE + 20; });
  // camera
  cam.yaw -= input.camDX * 0.006; cam.pitch = THREE.MathUtils.clamp(cam.pitch + input.camDY * 0.004, 0.05, 1.1); input.camDX = input.camDY = 0;
  if (running && Math.abs(input.x) > 0.3 && !touch.cam) { const behind = P.yaw + Math.PI; let d = behind - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * dt * 0.8 * Math.abs(input.x); }
  const tgt = P.pos.clone().setY(P.pos.y + 1.8), dist = cam.dist + (P.swing ? 3 : 0);
  const want = new THREE.Vector3(tgt.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * dist, tgt.y + Math.sin(cam.pitch) * dist + 1, tgt.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * dist);
  want.y = Math.max(want.y, 0.8); camera.position.lerp(want, Math.min(1, dt * 8)); if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; }
  camera.lookAt(tgt);
  if (Q.bloom) composer.render(); else renderer.render(scene, camera);
}

// ---------- menu ----------
function menu() {
  const p = save.p[0]; const m = $('menu');
  const render = () => { m.querySelector('#heroes').innerHTML = Object.keys(HEROES).map(k => `<button class="hb ${p.hero === k ? 'sel' : ''}" data-h="${k}">${HEROES[k].name}<small>${HEROES[k].sp}</small></button>`).join('');
    m.querySelector('#cols').innerHTML = COLORS.map(c => `<button class="sw ${p.color === c ? 'sel' : ''}" data-c="${c}" style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('');
    $('who').textContent = p.name; $('tip').textContent = HEROES[p.hero].tip;
    $('scaryB').textContent = save.scary ? 'SCARY MODE: ON 👻' : 'SCARY MODE: OFF'; $('scaryB').classList.toggle('red', !!save.scary);
    $('saverB').textContent = save.saver3d !== false ? '🔋 SAVER (30fps): ON' : '🔋 SAVER: OFF (60fps)';
    $('qB').textContent = 'QUALITY: ' + (save.q3d || 'auto').toUpperCase();
    $('offB').textContent = location.protocol === 'file:' ? 'Offline file ✓' : (window.__off ? 'Ready to play offline ✓' : 'Saving for offline…'); };
  m.onclick = (e) => { const t = e.target.closest('button'); if (!t) return; SFX.init();
    if (t.dataset.h) p.hero = t.dataset.h; if (t.dataset.c) p.color = +t.dataset.c;
    if (t.id === 'scaryB') save.scary = !save.scary; if (t.id === 'saverB') save.saver3d = save.saver3d === false;
    if (t.id === 'qB') { const o = ['auto', 'low', 'medium', 'high']; save.q3d = o[(o.indexOf(save.q3d || 'auto') + 1) % 4]; }
    persist(); render(); if (t.id === 'go') start(); };
  render(); setInterval(() => { if (m.style.display !== 'none') render(); }, 1500);
}
function start() {
  const p = save.p[0]; heroType = p.hero; heroColor = p.color; scary = !!save.scary; tier = save.q3d || 'auto';
  $('menu').style.display = 'none'; $('hud').style.display = 'block'; $('touch').style.display = 'block'; $('bSp').textContent = HEROES[heroType].sp; $('name').textContent = p.name; $('name').style.color = '#' + p.color.toString(16).padStart(6, '0');
  buildWorld(scary); setTier(tier === 'auto' ? 'medium' : tier);
  hero = makeHero(heroType, heroColor); scene.add(hero); scene.add(sparks);
  rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 5), E(0xe8f6ff, 3)); rope.visible = false; scene.add(rope);
  const s = buildings[0]; P.pos.set(s.cx, s.top, s.cz); P.safe.copy(P.pos); P.yaw = Math.PI / 4; cam.yaw = P.yaw + Math.PI;
  SFX.init(); SFX.ambient(scary); running = true; toast(HEROES[heroType].tip);
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().then(() => screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) {}
  window.__np3 = { P, beacons, enemies, door, step, get lit() { return lit; }, complete, jumpScare, pickAnchor, input, Q: () => Q, anchors };
}
resize(); bindControls(); menu(); frame();
if ('serviceWorker' in navigator && location.protocol !== 'file:') { navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'np-cached') window.__off = true; });
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(async () => { const k = await (await caches.open('np3d-v1')).keys(); if (k.length >= 4) window.__off = true; }).catch(() => {}); }
window.addEventListener('DOMContentLoaded', () => {});
