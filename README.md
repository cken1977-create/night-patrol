# Night Patrol 🌙

A tablet-first co-op hero game set in a haunted city at night. Grandpa made it for the family.

**Live:** https://night-patrol-brsa-registry.vercel.app

**Play:** open the site on a tablet, turn it sideways, and tap **Share → Add to Home Screen** (iPad Safari) or **⋮ → Install app** (Android Chrome).

## Heroes
- **WEAVER**: an original web-slinger. Hold SWING to swing from glowing hooks, push the stick to pump, and let go to fling.
- **BLASTER**: a gadget hero with a triple-shot arm cannon and a jetpack (fuel bar).
- **SHADE**: a stealth hero. DASH zips through monsters, hurts them, and makes them lose track of you.

Each player picks a hero, color, and name. Settings are saved on the device only.

## Missions (v1)
1. **Lights Out**: light 4 rooftop beacons, then reach the clock-tower door.
2. **Lost & Found**: rescue 4 lost pets, then reach the door.
3. **The Hollow King**: boss fight in 3 phases (orb volleys, summoned shadows, dive attacks). Beat him to bring back the dawn.

**Scary Mode** (OFF by default; the default look is a bright golden-hour city) makes the streets darker, adds flickering lamps, whispers, a heartbeat at low health, and surprise jump-scare monsters. There is no gore: monsters pop into sparks.

## Controls
- **Touch, 1 player:** floating joystick on the left half. JUMP, BLAST, and the special button are on the right.
- **Touch, 2 players on one tablet:** each player gets a joystick on their outer edge and buttons toward the middle.
- **Keyboard:** P1 uses WASD to move, Space to jump, F to blast, and G for the special (in single player, the arrow keys plus Z/X/C also work). P2 uses the arrow keys to move, O to jump, P to blast, and L for the special.
- Jump twice for a double jump. Down + JUMP drops through a roof. BLAST auto-aims at the nearest monster in front of you.

## Tech
Phaser 3.80 (vendored) with plain static files and no build step. All art is procedural (`src/art.js`) and all sound is synthesized with Web Audio (`src/audio.js`). It is a PWA: `manifest.webmanifest` plus `sw.js` for offline play.

Run it locally with `python3 -m http.server` and open http://localhost:8000.

## Kid-safe
No ads, no chat, no accounts, no analytics. The game makes no network calls besides loading itself.

## Plan for networked co-op (v2)
- **Transport:** Supabase Realtime *Broadcast* channels, which are free tier and need only the public anon key (safe to ship in the client). PartyKit or a Cloudflare Durable Object is an alternative.
- **Room code:** the host taps "Host" to get a 4-letter code, and the guest enters it. Both join channel `np-<code>`. Use only random room codes, and add no chat or free text, so no personal data is involved.
- **Model:** the host is authoritative for enemies, boss, and objectives. Each client simulates its own hero and broadcasts position, velocity, and input about 15 times a second. Remote heroes are interpolated. The host broadcasts enemy spawns, kills, and objective events.
- **Work items:** a lobby scene, a `NetSync` module, entity IDs on enemies, and host migration on disconnect (or ending the session).
- **Needed from Grandpa:** a free Supabase project URL plus anon key (or a PartyKit account). No secrets would live in the repo.

## Credits
See [CREDITS.md](CREDITS.md).

## Offline (storm-ready)
- The first online visit precaches every file. After that, the game plays fully in airplane mode, both in the browser and from the home-screen icon. The title screen shows **"Ready to play offline ✓"** once caching is done.
- Backup: `night-patrol-offline.html` is one self-contained file. Open it directly from Files or Downloads, no internet needed. It is also downloadable from the site at `/night-patrol-offline.html`.
- 🔋 Battery Saver (on by default) caps the game at 30fps. The game pauses and goes silent when the tab is hidden.
