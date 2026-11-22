// Lantern Thief — the night watch: patrol routes, vision cones and the
// alert state machine (calm -> suspicious -> chase -> search -> calm).
// A guard never cheats: it only knows what it can see or hear.
import {
  GUARD_PATROL_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_CHASE_SPEED,
  SIGHT_RANGE,
  SIGHT_HALF_ANGLE,
  SIGHT_RANGE_DARK,
  DETECT_FILL_RATE,
  DETECT_FILL_RATE_SHADOW,
  DETECT_DRAIN_RATE,
  ALARM_AT,
  SEARCH_TIME,
  SUSPICIOUS_TIME,
  HEAR_RADIUS,
} from './config.js';
import { hasLineOfSight, isShadow, tileCenter } from './level.js';

export function makeGuard(def) {
  const start = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
  const next = tileCenter(def.waypoints[1][0], def.waypoints[1][1]);
  return {
    name: def.name,
    color: def.color,
    waypoints: def.waypoints.map(([x, y]) => tileCenter(x, y)),
    waypointIndex: 1,
    x: start.x,
    y: start.y,
    // Facing angle: start looking along the patrol route.
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    state: 'calm', // calm | suspicious | chase | search
    stateTime: 0,
    detection: 0, // 0 unseen .. 1 spotted (per guard, feeds the alarm)
    lastSeen: null, // {x, y} where the thief was last seen
    investigate: null, // {x, y} a noise to check out
    pauseTime: 0, // guards pause and look around at each waypoint
    lookSweep: 0, // slow head sweep while paused
  };
}

// Can this guard see the thief right now? Range, cone angle, line of
// sight, and shadow all matter. Returns a visibility factor 0..1.
export function guardSeesThief(level, guard, thief) {
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = thief.inShadow ? SIGHT_RANGE_DARK : SIGHT_RANGE;
  if (dist > range) return 0;
  let rel = Math.atan2(dy, dx) - guard.angle;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  if (Math.abs(rel) > SIGHT_HALF_ANGLE) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, thief.x, thief.y)) return 0;
  // Closer and more centred in the cone reads as a clearer sighting.
  const closeness = 1 - dist / range;
  const centred = 1 - Math.abs(rel) / SIGHT_HALF_ANGLE;
  return Math.min(1, 0.35 + 0.65 * closeness * centred);
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
  return dist <= speed * dt;
}

// One simulation step for one guard. Returns events for sound + HUD:
// 'spotted' when the alarm trips, 'suspicious' when a glimpse is caught.
export function updateGuard(level, guard, thief, dt) {
  const events = [];
  const seen = guardSeesThief(level, guard, thief);
  const wasDetected = guard.detection >= ALARM_AT;

  if (seen > 0) {
    const rate = thief.inShadow ? DETECT_FILL_RATE_SHADOW : DETECT_FILL_RATE;
    guard.detection = Math.min(1, guard.detection + rate * seen * dt);
    guard.lastSeen = { x: thief.x, y: thief.y };
    if (guard.detection > 0.25 && guard.state === 'calm') {
      guard.state = 'suspicious';
      guard.stateTime = 0;
      events.push('suspicious');
    }
    if (guard.detection >= ALARM_AT && !wasDetected) {
      guard.state = 'chase';
      guard.stateTime = 0;
      events.push('spotted');
    }
  } else {
    guard.detection = Math.max(0, guard.detection - DETECT_DRAIN_RATE * dt);
    if (guard.state === 'chase' && guard.lastSeen) {
      guard.state = 'search';
      guard.stateTime = 0;
    }
  }

  guard.stateTime += dt;
  switch (guard.state) {
    case 'calm': {
      if (guard.pauseTime > 0) {
        // Pause at the waypoint: sweep the lantern left and right.
        guard.pauseTime -= dt;
        guard.lookSweep += dt;
        guard.angle += Math.sin(guard.lookSweep * 2.2) * 0.35 * dt;
        break;
      }
      const target = guard.waypoints[guard.waypointIndex];
      if (moveToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTime = 1.4;
        guard.lookSweep = 0;
      }
      break;
    }
    case 'suspicious': {
      // Walk to the last glimpse and look around.
      const spot = guard.lastSeen ?? guard.investigate;
      if (spot) moveToward(guard, spot.x, spot.y, GUARD_SUSPICIOUS_SPEED, dt);
      if (guard.stateTime > SUSPICIOUS_TIME && guard.detection < 0.25) {
        guard.state = 'calm';
        guard.stateTime = 0;
      }
      break;
    }
    case 'chase': {
      // Run at the thief while seen; run at the last seen spot otherwise.
      const target = seen > 0 ? thief : guard.lastSeen;
      if (target) moveToward(guard, target.x, target.y, GUARD_CHASE_SPEED, dt);
      break;
    }
    case 'search': {
      // Sweep the area around the last seen spot, then give up.
      const spot = guard.lastSeen;
      if (spot) {
        const orbit = guard.stateTime * 1.1;
        const tx = spot.x + Math.cos(orbit) * 48;
        const ty = spot.y + Math.sin(orbit) * 48;
        moveToward(guard, tx, ty, GUARD_SUSPICIOUS_SPEED, dt);
      }
      if (guard.stateTime > SEARCH_TIME) {
        guard.state = 'calm';
        guard.stateTime = 0;
        guard.lastSeen = null;
      }
      break;
    }
  }
  return events;
}

// A noise at (x, y) with the given radius: the nearest calm guard that
// can hear it turns suspicious and walks over to investigate.
export function guardsHearNoise(guards, x, y, radius) {
  for (const guard of guards) {
    if (guard.state !== 'calm') continue;
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (dist < Math.min(radius, HEAR_RADIUS) + 40) {
      guard.state = 'suspicious';
      guard.stateTime = 0;
      guard.investigate = { x, y };
      guard.lastSeen = { x, y };
    }
  }
}

// Alarm level for the HUD: the highest detection across the watch.
export function alarmLevel(guards) {
  return guards.reduce((top, g) => Math.max(top, g.detection), 0);
}

// Is any guard currently chasing the thief?
export function anyChase(guards) {
  return guards.some((g) => g.state === 'chase');
}
