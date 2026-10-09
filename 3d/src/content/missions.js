// MISSION DATA FORMAT — each mission is plain data; main.js builds the city + objectives from it.
// city: procedural block grid (seeded). objectives.type: 'beacons' | 'rescue' | 'boss' (only 'beacons' implemented in 3D yet).
export const MISSIONS = [
  { id: 'm1', title: 'Mission 1: Light the Beacons', brief: 'Shadow creatures are swarming the city! Light 4 rooftop beacons, then reach the clock tower door.',
    city: { grid: 7, cell: 34, seed: 1234, plazaChance: 0.08 },
    objectives: { type: 'beacons', count: 4, cells: [[1, 5], [5, 1], [3, 3], [4, 5]] },
    exit: { type: 'tower', cell: 'last' },
    spawns: { wisp: { every: 2.2, everyScary: 1.6, cap: 9, capScary: 12 } },
    scoring: { pop: 10, objective: 100, comboWindow: 2.5, parTime: 240 } },
  { id: 'm2', title: 'Mission 2: Lost & Found', locked: true, objectives: { type: 'rescue', count: 4 } },
  { id: 'boss', title: 'Final: The Hollow King', locked: true, objectives: { type: 'boss' } }
];
