// Lantern Thief — deterministic screenshot scenes: each ?shot= name places
// the thief, the guards and the relics in one fixed pose, so the same URL
// always renders the same frame. No randomness anywhere in the game.
import { tileCenter } from './level.js';

// Put a guard at a tile, facing an angle, in a state with a detection level.
function placeGuard(guard, tx, ty, angle, state, detection) {
  const c = tileCenter(tx, ty);
  guard.x = c.x;
  guard.y = c.y;
  guard.angle = angle;
  guard.state = state;
  guard.stateTime = 0;
  guard.detection = detection;
  guard.pauseTime = 0;
  guard.lastSeen = null;
  guard.investigate = null;
}

export function applyShot(world, name) {
  const p = world.player;
  const g = world.guards;
  const level = world.level;
  world.time = 42; // fixed clock so glows and pulses match across shots
  if (name === 'title') {
    world.state = 'title';
    return;
  }
  if (name === 'play') {
    // The thief crouches in deep shadow by a pedestal, one ember relic ahead,
    // Amber's lantern sweeping just past. Nothing has seen anything yet.
    world.state = 'playing';
    p.x = tileCenter(4, 6).x;
    p.y = tileCenter(4, 6).y;
    p.angle = Math.PI / 2;
    p.inShadow = true;
    placeGuard(g[0], 9, 6, Math.PI, 'calm', 0);
    placeGuard(g[1], 30, 9, 0, 'calm', 0);
    placeGuard(g[2], 15, 12, Math.PI / 2, 'calm', 0);
    placeGuard(g[3], 24, 3, 0, 'calm', 0);
    world.alarm = 0;
    return;
  }
  if (name === 'chase') {
    // Brine caught the thief mid-gallery: full meter, red cone, sprint in.
    // One relic already taken, the exit still shut.
    world.state = 'playing';
    level.relics[0].taken = true;
    world.relicsTaken = 1;
    p.x = tileCenter(20, 11).x;
    p.y = tileCenter(20, 11).y;
    p.angle = Math.PI;
    p.inShadow = false;
    placeGuard(g[0], 14, 11, 0, 'chase', 1);
    placeGuard(g[1], 26, 9, Math.PI, 'suspicious', 0.55);
    placeGuard(g[2], 15, 14, -Math.PI / 2, 'calm', 0);
    placeGuard(g[3], 24, 3, 0, 'calm', 0);
    g[0].lastSeen = { x: p.x, y: p.y };
    g[1].lastSeen = { x: p.x, y: p.y };
    world.alarm = 1;
    return;
  }
  if (name === 'win') {
    // Every relic taken, the thief at the open EXIT as the watch sweeps on,
    // none the wiser.
    world.state = 'won';
    for (const relic of level.relics) relic.taken = true;
    world.relicsTaken = 3;
    p.x = world.exit.x;
    p.y = world.exit.y;
    p.angle = 0;
    p.inShadow = false;
    placeGuard(g[0], 8, 11, Math.PI, 'calm', 0);
    placeGuard(g[1], 30, 9, 0, 'calm', 0);
    placeGuard(g[2], 15, 12, Math.PI / 2, 'calm', 0);
    placeGuard(g[3], 24, 3, 0, 'calm', 0);
    world.alarm = 0;
    return;
  }
  world.state = 'title';
}
