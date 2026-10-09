window.NP_CACHE = 'np-v2'; window.NP_FILES_COUNT = 14;
window.addEventListener('load', () => {
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#05040f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    input: { activePointers: 6 }, fps: { target: 60, limit: (Save.load().saver !== false) ? 30 : 0 }, render: { antialias: true, powerPreference: 'high-performance' },
    scene: [TitleScene, GameScene, UIScene]
  });
  window.__game = game;
  window.applySaver = () => { const on = Save.load().saver !== false, L = game.loop; L.fpsLimit = on ? 30 : 0; L.hasFpsLimit = on; L._limitRate = on ? 1000 / 30 : 0; game.renderer && game.renderer.resize && 0; };
  // Phaser sleeps the loop when the tab is hidden; we also silence audio.
  document.addEventListener('visibilitychange', () => { if (document.hidden) SFX.suspend(); else SFX.resume(); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.__offlineReady = false;
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'np-cached') window.__offlineReady = true; });
    navigator.serviceWorker.register('sw.js').then(async () => {
      const check = async () => { const c = await caches.open(window.NP_CACHE || 'np-v2'); const k = await c.keys(); if (k.length >= window.NP_FILES_COUNT) window.__offlineReady = true; };
      await navigator.serviceWorker.ready; check(); setTimeout(check, 2500);
    }).catch(() => {});
  }
});
