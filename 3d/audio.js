// Procedural Web Audio sound engine (no audio files needed).
const SFX = (() => {
  let ctx = null, master = null, noiseBuf = null, on = true;
  let amb = [], musicTimer = null;
  const ok = () => ctx && on;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = on ? 0.7 : 0; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // iOS unlock: play a silent buffer
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(master); s.start(0);
  }
  function tone(type, f0, f1, dur, vol = 0.2, delay = 0) {
    if (!ok()) return; const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, ftype, freq, q = 1, delay = 0, f1) {
    if (!ok()) return; const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  return {
    init,
    get on() { return on; },
    setOn(v) { on = v; if (master) master.gain.value = v ? 0.7 : 0; },
    suspend() { if (ctx) ctx.suspend(); }, resume() { if (ctx) ctx.resume(); },
    zap() { tone('square', 900, 260, 0.11, 0.05); tone('sine', 1500, 700, 0.08, 0.05); },
    pop() { noise(0.2, 0.25, 'bandpass', 2400, 2, 0, 600); tone('triangle', 500, 1600, 0.12, 0.1); },
    jump() { tone('sine', 280, 720, 0.14, 0.09); },
    web() { noise(0.14, 0.2, 'highpass', 2500, 1, 0, 6000); tone('sine', 1200, 400, 0.1, 0.04); },
    jet() { noise(0.12, 0.08, 'lowpass', 700); },
    dash() { noise(0.25, 0.25, 'bandpass', 600, 1, 0, 3000); },
    hurt() { tone('sawtooth', 240, 70, 0.3, 0.14); },
    pickup() { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.16, 0.1, i * 0.07)); },
    win() { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone('triangle', f, f, 0.3, 0.12, i * 0.1)); },
    screech() { noise(1.0, 0.55, 'bandpass', 2000, 3, 0, 5200); tone('sawtooth', 950, 180, 0.9, 0.22); tone('square', 1270, 260, 0.75, 0.1); tone('sine', 60, 30, 0.6, 0.5); },
    whisper() { noise(1.8, 0.07, 'bandpass', 1000 + Math.random() * 1800, 9, 0, 800 + Math.random() * 2000); },
    boom() { noise(0.9, 0.5, 'lowpass', 500, 1, 0, 60); tone('sine', 130, 30, 0.9, 0.4); },
    heartbeat() { tone('sine', 65, 40, 0.13, 0.45); tone('sine', 58, 35, 0.13, 0.32, 0.2); },
    ambient(scary) {
      if (!ctx) return; this.stopAmbient();
      const t = ctx.currentTime, out = ctx.createGain(); out.gain.value = 0; out.gain.linearRampToValueAtTime(scary ? 1 : 0.6, t + 3); out.connect(master);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170; lp.connect(out);
      [55, 58.3, 82.4].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = scary ? f * 0.94 : f; const g = ctx.createGain(); g.gain.value = 0.035; o.connect(g); g.connect(lp); o.start(); amb.push(o); });
      const w = ctx.createBufferSource(); w.buffer = noiseBuf; w.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.8;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 320; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
      const wg = ctx.createGain(); wg.gain.value = 0.06; w.connect(bp); bp.connect(wg); wg.connect(out); w.start();
      amb.push(w, lfo); amb.out = out;
    },
    stopAmbient() { amb.forEach(n => { try { n.stop(); } catch (e) {} }); if (amb.out) amb.out.disconnect(); amb = []; },
    music(onOff) {
      clearInterval(musicTimer); musicTimer = null; if (!onOff) return;
      const seq = [55, 55, 65.4, 55, 73.4, 55, 65.4, 49]; let i = 0;
      musicTimer = setInterval(() => { if (!ok()) return; const f = seq[i++ % seq.length]; tone('sawtooth', f, f * 0.98, 0.2, 0.09); if (i % 2) noise(0.05, 0.08, 'highpass', 7000); if (i % 4 === 0) tone('sine', 90, 40, 0.2, 0.3); }, 220);
    }
  };
})();
