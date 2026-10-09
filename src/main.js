window.addEventListener('load', () => {
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#05040f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    input: { activePointers: 6 }, fps: { target: 60 }, render: { antialias: true, powerPreference: 'high-performance' },
    scene: [TitleScene, GameScene, UIScene]
  });
  window.__game = game;
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
});
