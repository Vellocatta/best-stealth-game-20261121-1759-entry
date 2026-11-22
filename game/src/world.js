// Lantern Thief — the runtime world: player, guards, relics, exit and the
// win/lose rules. Pure simulation: no DOM, no randomness, no clock reads,
// so a fixed input script always replays the same game (screenshots use it).
import {
  COLS,
  ROWS,
  TILE,
  PLAYER_WALK_SPEED,
  PLAYER_RUN_SPEED,
  PLAYER_RADIUS,
  GUARD_RADIUS,
  RELICS_TO_WIN,
  NOISE_WALK_RADIUS,
  NOISE_RUN_RADIUS,
  ALARM_AT,
} from './config.js';
import { buildLevel, isSolid, isShadow, tileCenter, GUARD_DEFS } from './level.js';
import {
  makeGuard,
  updateGuard,
  guardsHearNoise,
  alarmLevel,
  anyChase,
} from './guards.js';

export function createWorld() {
  const level = buildLevel();
  const spawn = tileCenter(level.spawn.x, level.spawn.y);
  const exit = tileCenter(level.exit.x, level.exit.y);
  return {
    level,
    player: {
      x: spawn.x,
      y: spawn.y,
      angle: -Math.PI / 2,
      running: false,
      moving: false,
      inShadow: false,
      noiseRadius: 0,
    },
    guards: GUARD_DEFS.map(makeGuard),
    exit,
    relicsTaken: 0,
    time: 0,
    state: 'title', // title | playing | won | lost
    caughtBy: null,
    alarm: 0,
  };
}

// Move a circle through the tile grid, sliding along walls (axis-separated).
function moveCircle(level, body, dx, dy, radius) {
  const nx = body.x + dx;
  if (!circleHitsSolid(level, nx, body.y, radius)) body.x = nx;
  const ny = body.y + dy;
  if (!circleHitsSolid(level, body.x, ny, radius)) body.y = ny;
}

function circleHitsSolid(level, x, y, radius) {
  const x0 = Math.floor((x - radius) / TILE);
  const x1 = Math.floor((x + radius) / TILE);
  const y0 = Math.floor((y - radius) / TILE);
  const y1 = Math.floor((y + radius) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolid(level, tx, ty)) continue;
      // Closest point on the tile to the circle centre.
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      if ((x - cx) ** 2 + (y - cy) ** 2 < radius * radius) return true;
    }
  }
  return false;
}

// One simulation step. input: {mx, my, run} with mx/my in -1..1.
export function updateWorld(world, input, dt) {
  if (world.state !== 'playing') return;
  world.time += dt;
  const p = world.player;

  const len = Math.hypot(input.mx, input.my);
  p.moving = len > 0.1;
  if (p.moving) {
    const speed = input.run ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
    const nx = (input.mx / len) * speed * dt;
    const ny = (input.my / len) * speed * dt;
    p.angle = Math.atan2(input.my, input.mx);
    moveCircle(world.level, p, nx, ny, PLAYER_RADIUS);
  }
  p.running = input.run && p.moving;
  const tileX = Math.floor(p.x / TILE);
  const tileY = Math.floor(p.y / TILE);
  p.inShadow = isShadow(world.level, tileX, tileY);
  p.noiseRadius = p.running ? NOISE_RUN_RADIUS : p.moving ? NOISE_WALK_RADIUS : 0;
  if (p.noiseRadius > 0) guardsHearNoise(world.guards, p.x, p.y, p.noiseRadius);

  // Relics: step close and the ember is yours.
  for (const relic of world.level.relics) {
    if (relic.taken) continue;
    const c = tileCenter(relic.x, relic.y);
    if (Math.hypot(p.x - c.x, p.y - c.y) < TILE * 0.62) {
      relic.taken = true;
      world.relicsTaken += 1;
    }
  }

  // Guards see, chase, and catch.
  for (const guard of world.guards) {
    updateGuard(world.level, guard, p, dt);
  }
  world.alarm = alarmLevel(world.guards);
  if (anyChase(world.guards)) {
    for (const guard of world.guards) {
      if (guard.state !== 'chase') continue;
      if (Math.hypot(guard.x - p.x, guard.y - p.y) < GUARD_RADIUS + PLAYER_RADIUS + 3) {
        world.state = 'lost';
        world.caughtBy = guard.name;
        return;
      }
    }
  }

  // Exit opens once every relic is taken.
  if (world.relicsTaken >= RELICS_TO_WIN) {
    if (Math.hypot(p.x - world.exit.x, p.y - world.exit.y) < TILE * 0.7) {
      world.state = 'won';
    }
  }
}

export { COLS, ROWS, TILE, ALARM_AT };
