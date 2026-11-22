// Lantern Thief — the Ember Museum, one hand-designed level.
//
// Legend: # wall · . floor · P display pedestal (cover: blocks movement
// and a guard's sight) · D deep shadow (a thief standing in it is much
// harder to spot) · R ember relic · S thief's entrance · E exit door.
import { COLS, ROWS } from './config.js';

const MAP = [
  '########################################',
  '#........#.........#.........#.........#',
  '#..R.....#....R....#....R....#....P....#',
  '#........#.........#.........#.........#',
  '#...P....#....P....#....P....#....P....#',
  '#........#.........#.........#.........#',
  '#...D....#....D....#....D....#....D....#',
  '#........#.........#.........#.........#',
  '#####.#########.#########.#########.####',
  '#......................................#',
  '#..P.........P........P........P.......#',
  '#....D...........D...........D.........#',
  '#......................................#',
  '#..P.........P........P........P.......#',
  '#####.#########.#########.#########.####',
  '#........#.........#.........#.........#',
  '#...P....#....P....#....P....#....P....#',
  '#........#.........#.........#.........#',
  '#...D....#....D....#....D....#....D....#',
  '#........#.........#.........#.........#',
  '#..S.....#.........#.........#.....E...#',
  '########################################',
];

// The museum's night watch: name, patrol loop (tile waypoints), facing.
export const GUARD_DEFS = [
  { name: 'Amber', color: '#e8a33d', waypoints: [[2, 11], [37, 11]] },
  { name: 'Brine', color: '#4da3e8', waypoints: [[37, 9], [2, 9]] },
  { name: 'Cinder', color: '#e85d4d', waypoints: [[15, 9], [15, 20]] },
  { name: 'Dusk', color: '#b06ee8', waypoints: [[22, 3], [28, 3]] },
];

export function buildLevel() {
  if (MAP.length !== ROWS) throw new Error(`map has ${MAP.length} rows, want ${ROWS}`);
  for (const row of MAP) {
    if (row.length !== COLS) throw new Error(`map row is ${row.length} wide, want ${COLS}: ${row}`);
  }
  const walls = new Set();
  const pedestals = new Set();
  const shadows = new Set();
  const relics = [];
  let spawn = null;
  let exit = null;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = MAP[y][x];
      const key = `${x},${y}`;
      if (ch === '#') walls.add(key);
      else if (ch === 'P') pedestals.add(key);
      else if (ch === 'D') shadows.add(key);
      else if (ch === 'R') relics.push({ x, y, taken: false });
      else if (ch === 'S') spawn = { x, y };
      else if (ch === 'E') exit = { x, y };
    }
  }
  if (!spawn || !exit || relics.length !== 3) {
    throw new Error('level needs a spawn, an exit and exactly 3 relics');
  }
  return { walls, pedestals, shadows, relics, spawn, exit };
}

// True when the tile blocks walking (walls and pedestals do).
export function isSolid(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const key = `${tx},${ty}`;
  return level.walls.has(key) || level.pedestals.has(key);
}

// True when the tile is deep shadow, where a thief is hard to spot.
export function isShadow(level, tx, ty) {
  return level.shadows.has(`${tx},${ty}`);
}

// Sight line between two pixel points: blocked by walls and pedestals.
// Steps along the line in small hops and checks the tile under each hop.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / 32);
    const ty = Math.floor((y0 + dy * t) / 32);
    if (isSolid(level, tx, ty)) return false;
  }
  return true;
}

// Pixel centre of a tile.
export function tileCenter(tx, ty) {
  return { x: tx * 32 + 16, y: ty * 32 + 16 };
}
