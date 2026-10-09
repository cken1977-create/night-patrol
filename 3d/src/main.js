// Night Patrol 3D — arcade action slice. Bright daytime by default; Scary Mode optional. Rigged animated heroes.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { HEROES, HERO_KEYS, COLORS, ACCENTS, EMBLEMS } from './content/heroes.js';
import { MISSIONS } from './content/missions.js';
import { loadSave, writeSave } from './save.js';
import { createCharacter } from './character.js';

const $ = (id) => document.getElementById(id);
const save = loadSave(); const persist = () => writeSave(save);
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const MISSION = MISSIONS[0];
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ---------- renderer / quality ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 700);
const composer = new EffectComposer(renderer); const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.4, 0.92); composer.addPass(bloom); composer.addPass(new OutputPass());
const TIERS = { low: { pr: 0.6, bloom: false, lights: 2, shadow: 0 }, medium: { pr: 0.85, bloom: true, lights: 4, shadow: 1024 }, high: { pr: Math.min(devicePixelRatio, 1.6), bloom: true, lights: 8, shadow: 2048 } };
let tier = save.q3d || 'auto', Q = TIERS.medium, sun;
const menuScene = new THREE.Scene(), menuCam = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 100); menuCam.position.set(0, 1.35, 6.4); menuCam.lookAt(0, 0.95, 0);
const speedC = $('speed'), sctx = speedC.getContext('2d');
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(Q.pr); renderer.setSize(w, h); composer.setPixelRatio(Q.pr); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); menuCam.aspect = w / h; menuCam.updateProjectionMatrix(); speedC.width = w; speedC.height = h; }
function setTier(t) { Q = TIERS[t]; if (sun) { sun.castShadow = Q.shadow > 0; if (Q.shadow) { sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } } renderer.shadowMap.enabled = Q.shadow > 0; resize(); $('q').textContent = t.toUpperCase() + (tier === 'auto' ? ' (auto)' : ''); }

// ---------- textures / helpers ----------
function canvasTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const glowTex = canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
const fogTex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(170,150,220,0.35)'); g.addColorStop(1, 'rgba(170,150,220,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
const glowSprite = (color, size, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity })); s.scale.setScalar(size); return s; };
const E = (color, intensity = 3) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity });
const outlineMats = new Map();
function addOutline(root, color = 0x14102a, k = 1.07) { if (!outlineMats.has(color)) outlineMats.set(color, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  const meshes = []; root.traverse(o => { if (o.isMesh && !o.userData.noOutline) meshes.push(o); });
  meshes.forEach(m => { const h = new THREE.Mesh(m.geometry, outlineMats.get(color)); h.scale.setScalar(k); h.userData.noOutline = true; m.add(h); }); return root; }
function windowTex(day) { const t = canvasTex(128, 128, (c) => {
  c.fillStyle = day ? '#ffffff' : '#1b1726'; c.fillRect(0, 0, 128, 128); c.fillStyle = day ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.3)'; c.fillRect(0, 0, 4, 128);
  for (let y = 8; y < 128; y += 32) for (let x = 6; x < 128; x += 32) {
    if (day) { c.fillStyle = '#26324f'; c.fillRect(x - 2, y - 2, 22, 24); c.fillStyle = '#cfefff'; c.fillRect(x, y, 18, 20); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(x + 2, y + 2, 4, 10); }
    else { const r = Math.random(); c.fillStyle = r < 0.2 ? '#ffcf6b' : r < 0.27 ? '#7cc8ff' : '#0d0b16'; c.fillRect(x, y, 18, 20); } } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t; }

// ---------- avatar select turntable ----------
(() => { const sky = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 p; void main(){ float h = normalize(p).y; vec3 a = vec3(0.10,0.04,0.30), b = vec3(0.95,0.25,0.75), c = vec3(0.15,0.65,1.0); vec3 col = mix(mix(b,a,smoothstep(-0.1,0.5,h)), c, smoothstep(0.35,1.0,h)*0.4); gl_FragColor = vec4(col,1.); }' }));
  menuScene.add(sky); menuScene.add(new THREE.HemisphereLight(0xcfe8ff, 0x402060, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(3, 5, 4); key.castShadow = true; menuScene.add(key);
  const rim1 = new THREE.DirectionalLight(0x4fd8ff, 3.5), rim2 = new THREE.DirectionalLight(0xff4fd8, 3.5); rim1.position.set(-4, 3, -4); rim2.position.set(4, 2, -4); menuScene.add(rim1, rim2);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.35, 48), new THREE.MeshStandardMaterial({ color: 0x1d1838, metalness: 0.6, roughness: 0.3 })); ped.position.y = -0.18; ped.receiveShadow = true; menuScene.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.035, 8, 64), E(0x4fd8ff, 4)); ring.rotation.x = Math.PI / 2; menuScene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.03, 8, 64), E(0xff4fd8, 4)); ring2.rotation.x = Math.PI / 2; ring2.position.y = -0.34; menuScene.add(ring2);
  menuScene.userData.rings = [ring, ring2];
  for (let i = 0; i < 40; i++) { const s = glowSprite(i % 2 ? 0x4fd8ff : 0xff4fd8, 0.12 + Math.random() * 0.2, 0.9); s.position.set((Math.random() - 0.5) * 8, Math.random() * 4, -2 - Math.random() * 4); s.userData.v = 0.2 + Math.random() * 0.5; menuScene.add(s); }
})();
let menuHero = null, spin = 0, menuToken = 0;
async function refreshMenuHero(pose = true) { const tok = ++menuToken; const c = await createCharacter({ ...save.p[0] }); if (tok !== menuToken) return;
  if (menuHero) menuScene.remove(menuHero.root); menuHero = c; menuScene.add(c.root); if (pose) { c.trigger('pose'); SFX.pose(); } }

// ---------- world ----------
let world, tower, door, beacons = [], buildings = [], anchors = [], lamps = [], lampLights = [], cellMap = new Map(), SIZE = 0;
function skyDome(day) { return new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { day: { value: day ? 1 : 0 } },
  vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform float day; varying vec3 p; void main(){ float h = normalize(p).y;
    vec3 dTop = vec3(0.16,0.52,1.0), dHor = vec3(1.0,0.82,0.58), nTop = vec3(0.01,0.01,0.04), nHor = vec3(0.12,0.06,0.2);
    vec3 col = mix(mix(nHor,nTop,smoothstep(0.,0.6,h)), mix(dHor,dTop,smoothstep(-0.02,0.45,h)), day); gl_FragColor = vec4(col,1.); }` })); }
function buildWorld(day) {
  const cfg = MISSION.city, GRID = cfg.grid, CELL = cfg.cell; SIZE = GRID * CELL;
  world = new THREE.Group(); scene.add(world); const dome = skyDome(day); scene.add(dome); world.dome = dome;
  scene.fog = day ? new THREE.Fog(0xcfe6ff, 90, 360) : new THREE.FogExp2(0x07051a, 0.03);
  scene.add(new THREE.HemisphereLight(day ? 0xbfe4ff : 0x5a4a9a, day ? 0x8a6a4a : 0x0a0614, day ? 1.4 : 0.25));
  sun = new THREE.DirectionalLight(day ? 0xfff0d0 : 0x9fb4ff, day ? 2.6 : 0.35); sun.position.set(60, 110, 40); scene.add(sun, sun.target);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.near = 1; sc.far = 300; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04;
  const rim = new THREE.DirectionalLight(day ? 0xffb0f0 : 0x6040ff, day ? 1.1 : 0.4); rim.position.set(-80, 40, -60); scene.add(rim);
  if (day) { const sunDisc = glowSprite(0xfff3c0, 120, 1); sunDisc.material.fog = false; sunDisc.position.set(220, 170, 140); scene.add(sunDisc);
    for (let i = 0; i < 14; i++) { const cl = glowSprite(0xffffff, 60 + Math.random() * 60, 0.55); cl.material.blending = THREE.NormalBlending; cl.material.fog = false; cl.scale.y *= 0.35; cl.position.set((Math.random() - 0.3) * 600, 120 + Math.random() * 60, (Math.random() - 0.3) * 600); scene.add(cl); } }
  else { const moon = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf4efd2, fog: false })); moon.position.set(-160, 140, -260); scene.add(moon); }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SIZE + 400, SIZE + 400), new THREE.MeshStandardMaterial({ color: day ? 0x5a6078 : 0x15121f, roughness: 0.8 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(SIZE / 2, 0, SIZE / 2); ground.receiveShadow = true; world.add(ground);
  const walkMat = new THREE.MeshStandardMaterial({ color: day ? 0xbdb6a8 : 0x2a2538 });
  const R = rng(cfg.seed); const wt = windowTex(day);
  const PALETTE = day ? [0xff6b5a, 0xffc23d, 0x38a8f0, 0x7bd389, 0xb48cff, 0xff8fc8, 0x4fd8c8] : [0x2a2340, 0x231c33, 0x1c2235];
  const ledgeMat = new THREE.MeshStandardMaterial({ color: day ? 0xb9a78c : 0x3c3552, roughness: 0.9 });
  const antMat = new THREE.MeshStandardMaterial({ color: 0xc8cce0, metalness: 0.6, roughness: 0.3 }), tipMat = E(0xff3355, 4), hookMat = E(0x4fd8ff, 4);
  const NEON = [0xff4fd8, 0x4fd8ff, 0xffe14d, 0x7dff8a];
  for (let gx = 0; gx < GRID; gx++) for (let gz = 0; gz < GRID; gz++) {
    const isStart = gx === 0 && gz === 0, isTower = gx === GRID - 1 && gz === GRID - 1;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(CELL - 9, 0.25, CELL - 9), walkMat); pad.position.set(gx * CELL + CELL / 2, 0.12, gz * CELL + CELL / 2); pad.receiveShadow = true; world.add(pad);
    if (!isStart && !isTower && R() < cfg.plazaChance) continue;
    const w = isTower ? 22 : 14 + R() * 10, d = isTower ? 22 : 14 + R() * 10, h = isStart ? 10 : isTower ? 46 : 8 + R() * 26;
    const cx = gx * CELL + CELL / 2 + (R() - 0.5) * 3, cz = gz * CELL + CELL / 2 + (R() - 0.5) * 3;
    const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv;
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; const u0 = uv.getX(i), v0 = uv.getY(i);
      if (f === 2 || f === 3) uv.setXY(i, 0.5, 0.01); else uv.setXY(i, u0 * (f < 2 ? d : w) / 8, v0 * h / 8); }
    const col = isTower ? (day ? 0xf2e6d0 : 0x221a2e) : PALETTE[(R() * PALETTE.length) | 0];
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, map: wt, roughness: 0.75, emissive: day ? 0x000000 : 0xffffff, emissiveMap: day ? null : wt, emissiveIntensity: day ? 0 : 0.35 }));
    m.position.set(cx, h / 2, cz); m.castShadow = true; m.receiveShadow = true; world.add(m);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), ledgeMat); ledge.position.set(cx, h + 0.25, cz); ledge.receiveShadow = true; world.add(ledge);
    const b = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, top: h + 0.5, cx, cz, gx, gz, h }; buildings.push(b); cellMap.set(gx + ',' + gz, b);
    if (isTower) { tower = b; continue; }
    if (R() < 0.6) { const nc = NEON[(R() * 4) | 0], side = R() < 0.5 ? 1 : -1; const sign = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2 + R() * 3, 5 + R() * 4), E(nc, day ? 2.2 : 3.5));
      sign.position.set(side > 0 ? b.maxX + 0.2 : b.minX - 0.2, Math.min(h - 3, 6 + R() * h * 0.5), cz + (R() - 0.5) * d * 0.4); world.add(sign); }
    const ah = 9 + R() * 6, ax = cx + (R() - 0.5) * w * 0.5, az = cz + (R() - 0.5) * d * 0.5;
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, ah, 5), antMat); ant.position.set(ax, b.top + ah / 2, az); ant.castShadow = true; world.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), hookMat); tip.position.set(ax, b.top + ah, az); world.add(tip); const tg = glowSprite(0x4fd8ff, 2.5, 0.8); tg.position.copy(tip.position); world.add(tg);
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), tipMat); blink.position.set(ax, b.top + ah - 1.2, az); world.add(blink);
    anchors.push(V3(ax, b.top + ah, az));
    if (R() < 0.35) { const wg = new THREE.Group(); const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 12), new THREE.MeshStandardMaterial({ color: day ? 0xb5784a : 0x2a2238 })); tank.position.y = 3.3;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.2, 12), new THREE.MeshStandardMaterial({ color: day ? 0x8a5534 : 0x352b48 })); roof.position.y = 5.2;
      for (let k = 0; k < 4; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2, 4), antMat); leg.position.set(Math.cos(k * 1.57) * 1.2, 1, Math.sin(k * 1.57) * 1.2); wg.add(leg); }
      wg.add(tank, roof); wg.traverse(o => o.isMesh && (o.castShadow = true)); wg.position.set(cx - (ax - cx) * 0.8, b.top, cz - (az - cz) * 0.8); world.add(wg);
      buildings.push({ minX: wg.position.x - 1.6, maxX: wg.position.x + 1.6, minZ: wg.position.z - 1.6, maxZ: wg.position.z + 1.6, top: b.top + 4.6, small: true }); }
  }
  const tp = new THREE.Mesh(new THREE.ConeGeometry(17, 14, 4), new THREE.MeshStandardMaterial({ color: day ? 0x3a6ad8 : 0x1b1530 })); tp.rotation.y = Math.PI / 4; tp.position.set(tower.cx, tower.top + 7, tower.cz); tp.castShadow = true; world.add(tp);
  [[0, -1], [-1, 0]].forEach(([sx, sz]) => { const clock = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff3c0, emissiveIntensity: day ? 0.3 : 1.4 })); clock.position.set(tower.cx + sx * 11.05, tower.top - 8, tower.cz + sz * 11.05); clock.lookAt(clock.position.x + sx, clock.position.y, clock.position.z + sz); world.add(clock); });
  door = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.4), new THREE.MeshStandardMaterial({ color: 0x2a2f4a, emissive: 0x000000 })); door.position.set(tower.cx, 3, tower.minZ - 0.25); world.add(door);
  door.light = new THREE.PointLight(0x6ff0ff, 0, 25, 1.6); door.light.position.set(tower.cx, 4, tower.minZ - 3); scene.add(door.light);
  const poleMat = new THREE.MeshStandardMaterial({ color: day ? 0x3a4060 : 0x2c2840, metalness: 0.5, roughness: 0.5 }), bulbMat = E(0xffd27a, day ? 1.2 : 5);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i <= GRID; i++) for (let j = 0; j < GRID; j++) { if ((i + j) % 2) continue;
    [[i * CELL, j * CELL + CELL / 2], [j * CELL + CELL / 2, i * CELL]].forEach(([x, z]) => { if (x < 2 || z < 2 || x > SIZE - 2 || z > SIZE - 2) return;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7, 6), poleMat); pole.position.set(x, 3.5, z); pole.castShadow = true; world.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bulbMat); bulb.position.set(x, 7, z); world.add(bulb);
      let cone = null; if (!day) { cone = new THREE.Mesh(new THREE.ConeGeometry(4, 7, 16, 1, true), coneMat); cone.position.set(x, 3.5, z); world.add(cone); }
      lamps.push({ pos: V3(x, 6.8, z), bulb, cone, fl: 0 }); anchors.push(V3(x, 7.2, z)); }); }
  if (!day) for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffc870, 0, 22, 1.5); scene.add(l); lampLights.push(l); }
  world.fogs = []; if (!day) for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.55 }));
    s.scale.set(30 + Math.random() * 30, 8 + Math.random() * 6, 1); s.position.set(Math.random() * SIZE, 2 + Math.random() * 5, Math.random() * SIZE); s.v = (Math.random() - 0.5) * 1.5; world.add(s); world.fogs.push(s); }
  MISSION.objectives.cells.forEach(([gx, gz]) => { const b = cellMap.get(gx + ',' + gz) || buildings.find(bb => !bb.small && bb !== tower && !beacons.some(x => x.b === bb) && bb.gx >= gx);
    const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 6), poleMat); pole.position.y = 1.5;
    const lan = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0x8a86a8, emissive: 0xff4fd8, emissiveIntensity: 0.6 })); lan.position.y = 3.6; g.add(pole, lan); addOutline(g, 0x14102a, 1.1);
    const halo = glowSprite(0xff4fd8, 4, 0.7); halo.position.y = 3.6; g.add(halo);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 33; g.add(beam);
    g.position.set(b.cx, b.top, b.cz); world.add(g); beacons.push({ g, lan, halo, beam, b, lit: false, pos: V3(b.cx, b.top + 1, b.cz) }); });
}

// ---------- state ----------
const P = { pos: V3(), vel: V3(), yaw: 0, onGround: false, jumps: 0, hp: 5, inv: 0, fire: 0, fuel: 100, dashT: 0, dashCd: 0, cloak: 0, swing: null, safe: V3(), down: 0, wallRun: false, jetting: false, landV: 0 };
let hero, H, heroCfg, day, cam = { yaw: 0, pitch: 0.3, dist: 8 }, score = 0, combo = 0, comboT = -9, bestCombo = 0, lit = 0, running = false, ended = false, tScare = 25, tWhisper = 8, tSpawn = 2, hitStop = 0, shake = 0, tPlay = 0;
const enemies = [], blasts = [], input = { x: 0, y: 0, jump: false, fire: false, sp: false, jumpP: false, spP: false, camDX: 0, camDY: 0 };
let rope, trail;
const NS = 900, sparkGeo = new THREE.BufferGeometry(), sPos = new Float32Array(NS * 3), sCol = new Float32Array(NS * 3), sVel = new Float32Array(NS * 3), sLife = new Float32Array(NS); let sIdx = 0;
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sparkGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.5, map: glowTex, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sparks.frustumCulled = false;
const SPARK_COLS = [0xff4fd8, 0x4fd8ff, 0xffe14d, 0x7dff8a, 0xffffff].map(c => new THREE.Color(c));
function burst(p, n = 30, sp = 9) { for (let i = 0; i < n; i++) { const k = sIdx++ % NS; sPos.set([p.x, p.y, p.z], k * 3); const v = V3().randomDirection().multiplyScalar(sp * (0.3 + Math.random())); sVel.set([v.x, v.y + 3, v.z], k * 3); const c = SPARK_COLS[i % 5]; sCol.set([c.r * 2.2, c.g * 2.2, c.b * 2.2], k * 3); sLife[k] = 0.5 + Math.random() * 0.7; } }
function updSparks(dt) { for (let k = 0; k < NS; k++) { if (sLife[k] <= 0) continue; sLife[k] -= dt; sVel[k * 3 + 1] -= 14 * dt;
  for (let a = 0; a < 3; a++) sPos[k * 3 + a] += sVel[k * 3 + a] * dt; if (sLife[k] <= 0) sPos[k * 3 + 1] = -999; for (let a = 0; a < 3; a++) sCol[k * 3 + a] *= 0.985; }
  sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true; }
const rings = []; function shockwave(p, color, size = 6) { const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(p); m.lookAt(camera.position); scene.add(m); rings.push({ m, t: 0, size }); }
const TN = 28; function makeTrail(color) { const geo = new THREE.BufferGeometry(); const pos = new Float32Array(TN * 6), colr = new Float32Array(TN * 6), idx = [];
  for (let i = 0; i < TN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.frustumCulled = false; m.pts = []; m.col = new THREE.Color(color); return m; }
function updTrail(on) { const t = trail; t.pts.unshift({ p: P.pos.clone().setY(P.pos.y + 1.0), on }); if (t.pts.length > TN) t.pts.pop();
  const pos = t.geometry.attributes.position.array, col = t.geometry.attributes.color.array; const camDir = camera.getWorldDirection(V3());
  for (let i = 0; i < TN; i++) { const a = t.pts[Math.min(i, t.pts.length - 1)], b = t.pts[Math.min(i + 1, t.pts.length - 1)]; const dir = a.p.clone().sub(b.p); if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    const side = dir.cross(camDir).normalize().multiplyScalar(0.28 * (1 - i / TN)); const k = a.on ? (1 - i / TN) : 0;
    pos.set([a.p.x + side.x, a.p.y + side.y, a.p.z + side.z, a.p.x - side.x, a.p.y - side.y, a.p.z - side.z], i * 6);
    col.set([t.col.r * k, t.col.g * k, t.col.b * k, t.col.r * k, t.col.g * k, t.col.b * k], i * 6); }
  t.geometry.attributes.position.needsUpdate = true; t.geometry.attributes.color.needsUpdate = true; }

const wispGeo = new THREE.SphereGeometry(0.75, 14, 10), wispMat = new THREE.MeshStandardMaterial({ color: 0x1a0f2e, roughness: 0.6, emissive: 0x2a0a40, emissiveIntensity: 0.6 }), eyeMat = E(0x7dff8a, 6), tailGeo = new THREE.ConeGeometry(0.55, 1.5, 10), flashMat = E(0xffffff, 3);
function spawnWisp(pos) { const g = new THREE.Group(); const body = new THREE.Mesh(wispGeo, wispMat); const tail = new THREE.Mesh(tailGeo, wispMat); tail.rotation.x = Math.PI; tail.position.y = -0.95; g.add(body, tail);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), eyeMat); e.position.set(s * 0.27, 0.12, 0.62); e.userData.noOutline = true; g.add(e); }
  addOutline(g, 0xff4fd8, 1.12); const aura = glowSprite(0xb04cff, 4.5, day ? 0.35 : 0.55); g.add(aura); g.position.copy(pos); g.scale.setScalar(0.01); scene.add(g);
  enemies.push({ g, body, hp: 2, ph: Math.random() * 6, spd: 5 + Math.random() * 2 + (day ? 0 : 1), vel: V3(), born: 0 }); }
const blastGeo = new THREE.CapsuleGeometry(0.16, 0.9, 4, 8); blastGeo.rotateX(Math.PI / 2);
function handPos() { const b = hero.bone('DEF-hand.R'); return b ? b.getWorldPosition(V3()) : P.pos.clone().setY(P.pos.y + 1.3); }
function shoot() {
  const origin = P.pos.clone().add(V3(0, 1.3, 0)); const fwd = V3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
  let best = null, bd = 44; for (const e of enemies) { const to = e.g.position.clone().sub(origin); const d = to.length(); if (d < bd && to.normalize().dot(fwd) > 0.5) { bd = d; best = e; } }
  const dir = best ? best.g.position.clone().sub(origin).normalize() : fwd.clone().setY(0.04).normalize();
  hero.setAim(dir); hero.trigger('shoot'); const o2 = handPos().addScaledVector(dir, 0.3);
  const spread = H.shots === 3 ? [-0.12, 0, 0.12] : [0];
  for (const s of spread) { const d = dir.clone().applyAxisAngle(V3(0, 1, 0), s); const m = new THREE.Mesh(blastGeo, E(heroCfg.accent, 7)); m.position.copy(o2); m.lookAt(m.position.clone().add(d));
    m.add(glowSprite(heroCfg.accent, 1.8, 0.9)); scene.add(m); blasts.push({ m, v: d.multiplyScalar(55), life: 1.0 }); }
  P.fire = H.fireRate; SFX.zap(); burst(o2, 5, 3);
}
function hurt(from) { if (P.inv > 0 || P.dashT > 0 || P.down > 0 || ended) return; P.hp--; P.inv = 1.3; SFX.hurt(); shake = 0.5; releaseSwing(false); flash('#ff3355'); combo = 0; hero.trigger('hit');
  const k = P.pos.clone().sub(from).setY(0).normalize().multiplyScalar(10); P.vel.set(k.x, 7, k.z);
  if (P.hp <= 0) { P.down = 1.6; burst(P.pos.clone().setY(P.pos.y + 1), 50); } }
function flash(color) { const f = $('flash'); f.style.background = color; f.style.opacity = 0.35; setTimeout(() => f.style.opacity = 0, 70); }
function popup(text, big) { const d = document.createElement('div'); d.className = big ? 'pop big' : 'pop'; d.textContent = text; d.style.left = (42 + Math.random() * 16) + '%'; $('pops').appendChild(d); setTimeout(() => d.remove(), 1000); }
function addScore(n, label) { score += n; const s = $('score'); s.textContent = score.toLocaleString(); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); if (label) popup(label); }

// ---------- physics ----------
const R_ = 0.4, H_ = 1.8;
function collide(prevY) {
  const was = P.onGround; P.onGround = false; let wall = null;
  if (P.pos.y <= 0) { P.pos.y = 0; if (P.vel.y < 0) P.vel.y = 0; P.onGround = true; }
  for (const b of buildings) {
    if (P.pos.x < b.minX - R_ || P.pos.x > b.maxX + R_ || P.pos.z < b.minZ - R_ || P.pos.z > b.maxZ + R_ || P.pos.y > b.top + 0.01) continue;
    if (prevY >= b.top - 0.35 && P.vel.y <= 0) { P.pos.y = b.top; P.vel.y = 0; P.onGround = true; continue; }
    if (P.pos.y + H_ < b.top - (b.h || 4) - 1) continue;
    const pens = [[P.pos.x - (b.minX - R_), -1, 'x'], [(b.maxX + R_) - P.pos.x, 1, 'x'], [P.pos.z - (b.minZ - R_), -1, 'z'], [(b.maxZ + R_) - P.pos.z, 1, 'z']].sort((a, c) => a[0] - c[0]);
    const [pen, sgn, ax] = pens[0]; P.pos[ax] += sgn * pen; if (P.vel[ax] * sgn < 0) P.vel[ax] = 0; wall = { ax, sgn, b };
  }
  if (P.onGround && !was) { const hv = Math.hypot(P.vel.x, P.vel.z);
    if (P.landV < -21 && hv > 3) { hero.trigger('roll'); SFX.land(); shake = Math.max(shake, 0.25); burst(P.pos.clone().setY(P.pos.y + 0.1), 16, 5); }
    else if (P.landV < -11) { hero.trigger('land'); SFX.land(); burst(P.pos.clone().setY(P.pos.y + 0.1), 8, 3); shake = Math.max(shake, 0.12); } }
  return wall;
}
function pickAnchor() { const fwd = V3(Math.sin(P.yaw), 0, Math.cos(P.yaw)); let best = null, bs = 1e9;
  for (const a of anchors) { if (a.y < P.pos.y + 3) continue; const to = a.clone().sub(P.pos); const d = to.length(); if (d > 48 || d < 4) continue; const dot = to.setY(0).normalize().dot(fwd); if (dot < -0.1) continue; const s = d - dot * 14; if (s < bs) { bs = s; best = a; } }
  return best; }
function releaseSwing(boost) { if (!P.swing) return; P.swing = null; rope.visible = false; if (boost) { P.vel.multiplyScalar(1.15); P.vel.y += 7; SFX.whoosh(); addScore(5, 'FLING +5'); hero.trigger('flip'); } P.jumps = 1; }
function step(dt) {
  if (P.down > 0) { P.down -= dt; if (P.down <= 0) { P.pos.copy(P.safe); P.vel.set(0, 0, 0); P.hp = 5; P.inv = 2; } return; }
  P.inv -= dt; P.fire -= dt; P.dashCd -= dt; P.cloak -= dt; P.jetting = false;
  const f = V3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), r = V3(-f.z, 0, f.x);
  const want = f.multiplyScalar(-input.y).add(r.multiplyScalar(input.x)); const mag = Math.min(1, want.length());
  if (mag > 0.15) { const ty = Math.atan2(want.x, want.z); let dy = ty - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); P.yaw += dy * Math.min(1, dt * 10); }
  const SPEED = 11 * H.stats.speed;
  if (P.dashT > 0) { P.dashT -= dt; P.vel.x = Math.sin(P.yaw) * 36; P.vel.z = Math.cos(P.yaw) * 36; P.vel.y = 0; for (const e of enemies) if (!e.dashHit && e.g.position.distanceTo(P.pos) < 2.4) { e.dashHit = true; hitEnemy(e, 2); } }
  else if (!P.swing) { const k = P.onGround ? 12 : 4; const wn = want.lengthSq() > 1e-6 ? want.clone().normalize() : want;
    P.vel.x += (wn.x * mag * SPEED - P.vel.x) * Math.min(1, k * dt); P.vel.z += (wn.z * mag * SPEED - P.vel.z) * Math.min(1, k * dt); }
  if (input.jumpP) { if (P.swing) releaseSwing(true); else if (P.onGround) { P.vel.y = 12 * H.stats.jump; P.jumps = 1; SFX.jump(); hero.trigger('jump'); }
    else if (P.jumps < 2) { P.vel.y = 11 * H.stats.jump; P.jumps = 2; SFX.jump(); hero.trigger('flip'); burst(P.pos, 12, 4); shockwave(P.pos.clone().setY(P.pos.y + 0.2), heroCfg.accent, 3); } }
  if (input.fire && P.fire <= 0) shoot();
  if (heroCfg.hero === 'weaver') {
    if (input.spP && !P.swing) { const a = pickAnchor(); SFX.web(); if (a) { P.swing = { a, L: a.distanceTo(P.pos.clone().setY(P.pos.y + 1.3)) }; rope.visible = true; P.vel.addScaledVector(V3(Math.sin(P.yaw), 0, Math.cos(P.yaw)), 4); burst(a, 12, 4); } else popup('No hook in reach!'); }
    if (P.swing && !input.sp) releaseSwing(true);
  } else if (heroCfg.hero === 'blaster') { if (input.sp && P.fuel > 0) { P.fuel -= 45 * dt; P.vel.y = Math.min(P.vel.y + 42 * dt, 8); P.jetting = true; if (Math.random() < 0.5) burst(P.pos.clone().setY(P.pos.y + 0.8), 1, 2); if (Math.random() < 0.2) SFX.jet(); } }
  else { if (input.spP && P.dashCd <= 0) { P.dashT = 0.25; P.dashCd = 0.85; P.cloak = 2.2; P.inv = Math.max(P.inv, 0.35); SFX.dash(); shake = 0.2; enemies.forEach(e => e.dashHit = false); shockwave(P.pos.clone().setY(P.pos.y + 1), heroCfg.accent, 5); } P.fuel = Math.min(100, Math.max(0, (1 - P.dashCd / 0.85) * 100)); }
  P.vel.y -= 28 * dt; if (P.vel.y < -40) P.vel.y = -40; P.landV = P.vel.y;
  if (P.swing) { P.vel.add(V3(Math.sin(P.yaw), 0, Math.cos(P.yaw)).multiplyScalar(mag * 14 * dt)); if (input.y < -0.5) P.swing.L = Math.max(5, P.swing.L - 6 * dt); }
  const prevY = P.pos.y; P.pos.addScaledVector(P.vel, dt);
  if (P.swing) { const hand = P.pos.clone().setY(P.pos.y + 1.3); const d = hand.clone().sub(P.swing.a); const len = d.length();
    if (len > P.swing.L) { d.multiplyScalar(1 / len); P.pos.addScaledVector(d, -(len - P.swing.L)); const vr = P.vel.dot(d); if (vr > 0) P.vel.addScaledVector(d, -vr); } }
  const wall = collide(prevY);
  if (P.swing && P.onGround && P.vel.length() < 2) releaseSwing(false);
  P.wallRun = false;
  if (wall && heroCfg.hero === 'weaver' && mag > 0.3 && !P.onGround) { P.vel.y = Math.max(P.vel.y, 7); P.jumps = 0; P.wallRun = true; P.yaw = Math.atan2(-(wall.ax === 'x' ? wall.sgn : 0), -(wall.ax === 'z' ? wall.sgn : 0)); }
  if (P.onGround) { P.jumps = 0; if (heroCfg.hero === 'blaster') P.fuel = Math.min(100, P.fuel + 60 * dt); if (P.pos.y > 1 && P.inv <= 0) P.safe.copy(P.pos).setY(P.pos.y + 0.5); }
  P.pos.x = THREE.MathUtils.clamp(P.pos.x, -40, SIZE + 40); P.pos.z = THREE.MathUtils.clamp(P.pos.z, -40, SIZE + 40);
  for (const bc of beacons) if (!bc.lit && bc.pos.distanceTo(P.pos) < 3) { bc.lit = true; lit++; SFX.pickup(); burst(bc.pos.clone().setY(bc.pos.y + 2.5), 90, 12); shockwave(bc.pos.clone().setY(bc.pos.y + 3), 0xffe14d, 14); shake = 0.35; hitStop = 0.08;
    bc.lan.material.color.set(0xffe14d); bc.lan.material.emissive.set(0xffe14d); bc.lan.material.emissiveIntensity = 3; bc.halo.material.color.set(0xffe14d); bc.halo.scale.setScalar(7); bc.beam.material.color.set(0xffe14d); bc.beam.material.opacity = 0.45;
    const L = new THREE.PointLight(0xffd36b, 14, 30, 1.6); L.position.copy(bc.pos).setY(bc.pos.y + 3.5); scene.add(L); addScore(MISSION.scoring.objective, 'BEACON +' + MISSION.scoring.objective);
    if (lit === beacons.length) { door.material.emissive.set(0x6ff0ff); door.material.emissiveIntensity = 3; door.light.intensity = 40; toast('ALL BEACONS LIT! Get to the clock tower door!'); } else toast(`BEACON ${lit}/${beacons.length}!`); }
  if (lit === beacons.length && P.pos.distanceTo(door.position) < 4.5 && !ended) complete();
}
function hitEnemy(e, dmg) { e.hp -= dmg; e.flash = 0.08; burst(e.g.position, 6, 4); SFX.select();
  if (e.hp <= 0) { combo = tPlay - comboT < MISSION.scoring.comboWindow ? combo + 1 : 1; comboT = tPlay; bestCombo = Math.max(bestCombo, combo);
    const pts = MISSION.scoring.pop * combo; addScore(pts, combo > 1 ? `+${pts}  x${combo}` : `+${pts}`); SFX.pop(); SFX.combo(combo);
    burst(e.g.position, 50 + combo * 5, 12); shockwave(e.g.position.clone(), 0xff4fd8, 7); hitStop = 0.05; shake = Math.max(shake, 0.22);
    if (combo === 5 || combo === 10 || combo === 15 || combo === 20) { popup(`COMBO x${combo}!`, true); flash('#ff4fd8'); }
    scene.remove(e.g); enemies.splice(enemies.indexOf(e), 1); } }
function updEnemies(dt) {
  const sp = MISSION.spawns.wisp; tSpawn -= dt; const cap = day ? sp.cap : sp.capScary;
  if (tSpawn <= 0) { tSpawn = day ? sp.every : sp.everyScary; if (enemies.length < cap) { const a = P.yaw + (Math.random() - 0.5) * 2.2; const d = 24 + Math.random() * 12;
    spawnWisp(V3(P.pos.x + Math.sin(a) * d, Math.max(3, P.pos.y + 2 + Math.random() * 6), P.pos.z + Math.cos(a) * d)); } }
  for (const e of enemies.slice()) { e.ph += dt * 3; e.born = Math.min(1, e.born + dt * 2.5); const to = P.pos.clone().setY(P.pos.y + 1.1).sub(e.g.position); const d = to.length();
    if (d < 50 && P.cloak <= 0 && P.down <= 0) e.vel.lerp(to.normalize().multiplyScalar(e.spd), 0.04); else e.vel.multiplyScalar(0.97);
    e.vel.y += Math.sin(e.ph) * 0.1; e.g.position.addScaledVector(e.vel, dt); e.g.lookAt(P.pos.x, e.g.position.y, P.pos.z); e.g.scale.setScalar(e.born * (1 + Math.sin(e.ph * 2) * 0.07));
    if (e.flash > 0) { e.flash -= dt; e.body.material = e.flash > 0 ? flashMat : wispMat; }
    if (d < 1.4) hurt(e.g.position); if (d > 90) { scene.remove(e.g); enemies.splice(enemies.indexOf(e), 1); } }
  for (const b of blasts.slice()) { b.life -= dt; b.m.position.addScaledVector(b.v, dt); let hit = b.life <= 0;
    if (!hit) for (const e of enemies) if (e.g.position.distanceTo(b.m.position) < 1.25) { hitEnemy(e, 1); hit = true; break; }
    if (hit) { scene.remove(b.m); blasts.splice(blasts.indexOf(b), 1); } }
  for (const r of rings.slice()) { r.t += dt * 2.2; r.m.scale.setScalar(1 + r.t * r.size); r.m.material.opacity = Math.max(0, 1 - r.t); r.m.lookAt(camera.position); if (r.t >= 1) { scene.remove(r.m); rings.splice(rings.indexOf(r), 1); } }
}
function updLights() { if (day) return; lamps.sort((a, b) => a.pos.distanceToSquared(P.pos) - b.pos.distanceToSquared(P.pos));
  lampLights.forEach((l, i) => { const L = lamps[i]; if (!L || i >= Q.lights) { l.visible = false; return; } l.visible = true; l.position.copy(L.pos);
    let k = 1; if (L.fl > 0) { L.fl--; k = 0.1; } else if (Math.random() < 0.01) L.fl = 3 + Math.random() * 6; l.intensity = 22 * k; if (L.cone) L.cone.visible = k === 1; }); }
function speedLines(v) { sctx.clearRect(0, 0, speedC.width, speedC.height); const k = THREE.MathUtils.clamp((v - 13) / 14, 0, 1); if (k <= 0) return;
  const w = speedC.width, h = speedC.height, cx = w / 2, cy = h * 0.45; sctx.strokeStyle = `rgba(255,255,255,${0.55 * k})`;
  for (let i = 0; i < 46; i++) { const a = Math.random() * 6.283, r0 = Math.max(w, h) * (0.32 + Math.random() * 0.2), r1 = r0 + 60 + Math.random() * 160 * k; sctx.lineWidth = 1 + Math.random() * 2.5;
    sctx.beginPath(); sctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); sctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); sctx.stroke(); } }

// ---------- UI / input ----------
function toast(m) { const t = $('toast'); t.textContent = m; t.style.opacity = 1; t.classList.remove('zoom'); void t.offsetWidth; t.classList.add('zoom'); clearTimeout(t._h); t._h = setTimeout(() => t.style.opacity = 0, 2400); }
function hud() { $('hp').textContent = '♥'.repeat(Math.max(0, P.hp)) + '♡'.repeat(5 - Math.max(0, P.hp));
  const cw = Math.max(0, 1 - (tPlay - comboT) / MISSION.scoring.comboWindow); $('combo').style.display = combo > 1 && cw > 0 ? 'block' : 'none'; $('comboN').textContent = 'x' + combo; $('comboBar').style.width = (cw * 100) + '%';
  if (cw <= 0) combo = 0;
  $('obj').textContent = lit < beacons.length ? `BEACONS ${lit}/${beacons.length}` : 'GO TO THE TOWER DOOR!';
  $('fuel').style.width = (heroCfg.hero === 'weaver' ? 0 : P.fuel) + 'px'; $('timer').textContent = Math.floor(tPlay / 60) + ':' + String(Math.floor(tPlay % 60)).padStart(2, '0');
  const tgt = lit < beacons.length ? beacons.filter(b => !b.lit).sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos))[0].pos : door.position;
  const ang = Math.atan2(tgt.x - P.pos.x, tgt.z - P.pos.z) - (cam.yaw + Math.PI); $('arrow').style.transform = `rotate(${-ang}rad)`;
  $('dist').textContent = Math.round(tgt.distanceTo(P.pos)) + 'm'; $('spd').textContent = Math.round(P.vel.length() * 3.6) + ' km/h'; }
const touch = { joy: null, cam: null };
function bindControls() {
  const joyEl = $('joy'), knob = $('knob');
  const btn = (id, key) => { const el = $(id); el.addEventListener('pointerdown', e => { e.preventDefault(); input[key] = true; if (key === 'jump') input.jumpP = true; if (key === 'sp') input.spP = true; el.classList.add('on'); SFX.init(); el.setPointerCapture(e.pointerId); });
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
  const keys = {}; addEventListener('keydown', e => { if (!keys[e.code]) { if (e.code === 'Space') input.jumpP = true; if (e.code === 'KeyG' || e.code === 'KeyK') input.spP = true; } keys[e.code] = true; if (e.code === 'Escape') togglePause(); }); addEventListener('keyup', e => keys[e.code] = false);
  bindControls.kb = () => { if (touch.joy) return; const kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), ky = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (kx || ky || bindControls.kbWas) { input.x = kx; input.y = ky; bindControls.kbWas = !!(kx || ky); }
    ['jump', 'fire', 'sp'].forEach((k, i) => { const c = [['Space'], ['KeyF', 'KeyJ'], ['KeyG', 'KeyK']][i]; const kd = c.some(x => keys[x]); if (kd) input[k] = true; else if (bindControls['k' + k]) input[k] = false; bindControls['k' + k] = kd; });
    if (keys.KeyQ) input.camDX -= 6; if (keys.KeyE) input.camDX += 6; };
  $('pause').onclick = togglePause;
}
let paused = false; function togglePause() { if (!running || ended) return; paused = !paused; $('pauseMenu').style.display = paused ? 'flex' : 'none'; }
document.addEventListener('visibilitychange', () => { if (document.hidden) { SFX.suspend(); if (running && !ended && !paused) togglePause(); } else SFX.resume(); });
function complete() { ended = true; SFX.win(); SFX.stopAmbient(); const timeBonus = Math.max(0, Math.round((MISSION.scoring.parTime - tPlay) * 5)); score += timeBonus;
  const prev = save.best3d[MISSION.id] || 0; if (score > prev) { save.best3d[MISSION.id] = score; persist(); }
  const stars = score > 1800 ? 3 : score > 1000 ? 2 : 1;
  $('endMsg').innerHTML = `MISSION COMPLETE!<div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><small>Score ${score.toLocaleString()} · Best combo x${bestCombo} · Time bonus +${timeBonus}${score > prev ? ' · NEW BEST!' : ''}</small><br><small>Mission 2 and the Hollow King boss come next in 3D. For now, play them in the classic game.</small>`; $('end').style.display = 'flex'; }
function jumpScare() { SFX.screech(); shake = 0.6; const s = $('scare'); s.style.display = 'block'; s.style.animation = 'none'; void s.offsetWidth; s.style.animation = 'scare 0.9s ease-out forwards';
  setTimeout(() => { s.style.display = 'none'; for (let k = 0; k < 3; k++) spawnWisp(P.pos.clone().add(V3(Math.sin(P.yaw) * 6 + (k - 1) * 3, 2.5, Math.cos(P.yaw) * 6))); }, 900); }

// ---------- loop ----------
const clock = new THREE.Clock(); let acc = 0, fpsT = 0, fpsN = 0, lowFor = 0, lightT = 0;
function frame() {
  requestAnimationFrame(frame);
  let dt = Math.min(clock.getDelta(), 0.05);
  if (save.saver3d !== false) { acc += dt; if (acc < 1 / 31) return; dt = Math.min(acc, 0.05); acc = 0; }
  fpsN++; fpsT += dt; if (fpsT > 1) { const fps = fpsN / fpsT; $('fps').textContent = Math.round(fps) + ' fps'; fpsN = fpsT = 0;
    const target = save.saver3d !== false ? 26 : 45; if (tier === 'auto' && running) { lowFor = fps < target ? lowFor + 1 : 0; if (lowFor >= 3 && Q !== TIERS.low) { setTier(Q === TIERS.high ? 'medium' : 'low'); lowFor = 0; } } }
  if (!running) {
    if (menuHero) { spin += dt * 0.55; menuHero.root.rotation.y = menuHero.t.pose > 0 ? 0.35 : spin; menuHero.update(dt, { menu: true, speed: 0, yaw: 0 }); }
    menuScene.userData.rings.forEach((r, i) => r.rotation.z += dt * (i ? -0.5 : 0.8)); menuScene.children.forEach(o => { if (o.isSprite) { o.position.y += o.userData.v * dt; if (o.position.y > 4) o.position.y = 0; } });
    renderPass.scene = menuScene; renderPass.camera = menuCam; composer.render(); return;
  }
  renderPass.scene = scene; renderPass.camera = camera;
  if (!paused && !ended) {
    bindControls.kb();
    if (hitStop > 0) hitStop -= dt; else { tPlay += dt; const n = Math.ceil(dt / (1 / 120)); for (let i = 0; i < n; i++) { step(dt / n); input.jumpP = false; input.spP = false; } updEnemies(dt); }
    if ((lightT -= dt) < 0) { updLights(); lightT = 0.3; }
    if (!day) { tWhisper -= dt; if (tWhisper < 0) { SFX.whisper(); tWhisper = 7 + Math.random() * 9; } tScare -= dt; if (tScare < 0 && P.vel.length() > 3) { tScare = 30 + Math.random() * 25; jumpScare(); } }
    if (P.hp <= 2 && P.down <= 0) { P.beat = (P.beat || 0) - dt; if (P.beat < 0) { SFX.heartbeat(); P.beat = 0.9; } }
    hud();
  }
  const hv = Math.hypot(P.vel.x, P.vel.z);
  hero.root.position.copy(P.pos); hero.root.rotation.y = P.yaw;
  hero.update(hitStop > 0 ? dt * 0.1 : dt, { speed: hv, onGround: P.onGround, vy: P.vel.y, swinging: !!P.swing, anchor: P.swing && P.swing.a, wall: P.wallRun, yaw: P.yaw, jetting: P.jetting });
  hero.root.visible = P.down > 0 ? false : P.inv > 0 ? (Math.floor(performance.now() / 70) % 2 === 0) : true;
  if (P.swing) { const hand = handPos(); const len = hand.distanceTo(P.swing.a); rope.position.copy(hand.clone().add(P.swing.a).multiplyScalar(0.5)); rope.scale.set(1, len, 1); rope.quaternion.setFromUnitVectors(V3(0, 1, 0), P.swing.a.clone().sub(hand).normalize()); }
  const spd = P.vel.length(); updTrail(spd > 9 || !!P.swing || P.dashT > 0); speedLines(spd);
  updSparks(dt);
  if (world) world.fogs.forEach(s => { s.position.x += s.v * dt; if (s.position.x > SIZE + 20) s.position.x = -20; if (s.position.x < -20) s.position.x = SIZE + 20; });
  sun.position.set(P.pos.x + 60, P.pos.y + 110, P.pos.z + 40); sun.target.position.copy(P.pos); world.dome.position.copy(camera.position);
  cam.yaw -= input.camDX * 0.006; cam.pitch = THREE.MathUtils.clamp(cam.pitch + input.camDY * 0.004, 0.05, 1.1); input.camDX = input.camDY = 0;
  if (Math.abs(input.x) > 0.3 && !touch.cam) { const behind = P.yaw + Math.PI; let d = behind - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * dt * 0.8 * Math.abs(input.x); }
  const tgt = P.pos.clone().setY(P.pos.y + 1.6), dist = cam.dist + Math.min(4, spd * 0.12);
  camera.fov = THREE.MathUtils.lerp(camera.fov, 62 + Math.min(18, Math.max(0, spd - 10)), Math.min(1, dt * 4)); camera.updateProjectionMatrix();
  const want = V3(tgt.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * dist, tgt.y + Math.sin(cam.pitch) * dist + 0.8, tgt.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * dist);
  want.y = Math.max(want.y, 0.8); camera.position.lerp(want, Math.min(1, dt * 8)); if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake * 1.5; camera.position.y += (Math.random() - 0.5) * shake * 1.5; }
  camera.lookAt(tgt);
  if (Q.bloom) composer.render(); else renderer.render(scene, camera);
}

// ---------- menu (avatar select) ----------
function menu() {
  const p = save.p[0];
  const render = () => { const H0 = HEROES[p.hero];
    $('heroes').innerHTML = HERO_KEYS.map(k => `<button class="hb ${p.hero === k ? 'sel' : ''}" data-h="${k}">${HEROES[k].name}<small>${HEROES[k].role} · ${HEROES[k].special}</small></button>`).join('');
    $('suits').innerHTML = H0.suits.map(s => `<button class="chip ${p.suit === s.id ? 'sel' : ''}" data-s="${s.id}">${s.name}</button>`).join('');
    $('cols').innerHTML = COLORS.map(c => `<button class="sw ${p.color === c ? 'sel' : ''}" data-c="${c}" style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('');
    $('accs').innerHTML = ACCENTS.map(c => `<button class="sw sm ${p.accent === c ? 'sel' : ''}" data-a="${c}" style="background:#${c.toString(16).padStart(6, '0')};box-shadow:0 0 10px #${c.toString(16).padStart(6, '0')}"></button>`).join('');
    $('embs').innerHTML = EMBLEMS.map(e => `<button class="chip ${p.emblem === e ? 'sel' : ''}" data-e="${e}">${{ hex: '⬡', star: '★', bolt: '⚡', moon: '☾', heart: '♥', eye: '◉' }[e]}</button>`).join('');
    $('heroName').textContent = H0.name; $('who').textContent = p.name; $('tip').textContent = H0.tip; $('best').textContent = save.best3d[MISSION.id] ? 'BEST ' + save.best3d[MISSION.id].toLocaleString() : '';
    $('scaryB').textContent = save.scary ? 'SCARY MODE: ON 👻' : 'SCARY MODE: OFF ☀️'; $('scaryB').classList.toggle('red', !!save.scary);
    $('saverB').textContent = save.saver3d !== false ? '🔋 30fps SAVER' : '⚡ 60fps'; $('qB').textContent = 'GFX: ' + (save.q3d || 'auto').toUpperCase();
    $('offB').textContent = location.protocol === 'file:' ? 'Offline file ✓' : (window.__off ? 'Ready to play offline ✓' : 'Saving for offline…'); };
  $('menu').onclick = (e) => { const t = e.target.closest('button'); if (!t) return; SFX.init(); SFX.select(); let rebuild = false;
    if (t.dataset.h) { p.hero = t.dataset.h; if (!HEROES[p.hero].suits.some(s => s.id === p.suit)) p.suit = 'classic'; rebuild = true; }
    if (t.dataset.s) { p.suit = t.dataset.s; rebuild = true; } if (t.dataset.c) { p.color = +t.dataset.c; rebuild = true; } if (t.dataset.a) { p.accent = +t.dataset.a; rebuild = true; } if (t.dataset.e) { p.emblem = t.dataset.e; rebuild = true; }
    if (t.id === 'scaryB') save.scary = !save.scary; if (t.id === 'saverB') save.saver3d = save.saver3d === false;
    if (t.id === 'qB') { const o = ['auto', 'low', 'medium', 'high']; save.q3d = o[(o.indexOf(save.q3d || 'auto') + 1) % 4]; }
    if (t.id === 'poseB' && menuHero) { menuHero.trigger('pose'); SFX.pose(); }
    persist(); render(); if (rebuild) refreshMenuHero(true); if (t.id === 'go') start(); };
  render(); refreshMenuHero(false); setInterval(() => { if ($('menu').style.display !== 'none') render(); }, 2000);
}
async function start() {
  heroCfg = { ...save.p[0] }; H = HEROES[heroCfg.hero]; day = !save.scary; tier = save.q3d || 'auto';
  $('go').textContent = 'LOADING…';
  hero = await createCharacter(heroCfg);
  $('menu').style.display = 'none'; $('hud').style.display = 'block'; $('touch').style.display = 'block'; $('bSp').textContent = H.special; $('name').textContent = heroCfg.name; $('name').style.color = '#' + heroCfg.color.toString(16).padStart(6, '0');
  document.body.classList.toggle('night', !day);
  buildWorld(day); setTier(tier === 'auto' ? 'medium' : tier); scene.add(hero.root); scene.add(sparks);
  rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), E(0xffffff, 3)); rope.visible = false; scene.add(rope);
  trail = makeTrail(heroCfg.accent); scene.add(trail);
  const s = buildings[0]; P.pos.set(s.cx, s.top, s.cz); P.safe.copy(P.pos); P.yaw = Math.PI / 4; cam.yaw = P.yaw + Math.PI;
  SFX.init(); SFX.ambient(!day); running = true; toast(MISSION.title.toUpperCase()); setTimeout(() => toast(H.tip), 2600); addScore(0);
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().then(() => screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) {}
  window.__np3 = { P, beacons, enemies, door, step, get lit() { return lit; }, get score() { return score; }, get combo() { return combo; }, hero: () => hero, complete, jumpScare, pickAnchor, input, Q: () => Q, anchors, hitEnemy, spawnWisp, cam };
}
addEventListener('resize', resize); resize(); bindControls(); menu(); frame();
if ('serviceWorker' in navigator && location.protocol !== 'file:') { navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'np-cached') window.__off = true; });
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(async () => { const k = await (await caches.open('np3d-v2')).keys(); if (k.length >= 5) window.__off = true; }).catch(() => {}); }
