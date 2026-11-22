// Lantern Thief — canvas renderer: the Ember Museum from above, guards with
// their vision cones, the thief's lantern glow, and the HUD. One draw call
// per frame, no assets: every shape is drawn from the level data.
import {
  TILE,
  COLS,
  ROWS,
  VIEW_W,
  VIEW_H,
  SIGHT_RANGE,
  SIGHT_HALF_ANGLE,
  SIGHT_RANGE_DARK,
  PLAYER_RADIUS,
  GUARD_RADIUS,
  RELICS_TO_WIN,
  ALARM_AT,
} from './config.js';
import { tileCenter } from './level.js';

const HUD_H = 28;
const MAP_Y = HUD_H;

function hexA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function setupCanvas(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H + HUD_H;
  return canvas.getContext('2d');
}

export function render(ctx, world) {
  const { level, player, guards } = world;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H + HUD_H);
  drawHud(ctx, world);
  ctx.save();
  ctx.translate(0, MAP_Y);

  drawFloor(ctx, level);
  drawShadows(ctx, level);
  drawExit(ctx, world);
  drawRelics(ctx, level, world.time);
  drawPedestals(ctx, level);
  drawWalls(ctx, level);
  drawCones(ctx, guards, player);
  drawGuards(ctx, guards);
  drawPlayer(ctx, player, world.time);

  ctx.restore();

  if (world.state === 'title') drawTitle(ctx, world);
  else if (world.state === 'won') drawEnd(ctx, 'THE VAULT IS OPEN', 'Every ember relic is yours — the thief slips into the night.', '#7ddc8a');
  else if (world.state === 'lost') drawEnd(ctx, 'CAUGHT', `Spotted by ${world.caughtBy ?? 'the watch'} — the lanterns close in. Press R to try again.`, '#e85d4d');
}

function drawFloor(ctx, level) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const key = `${x},${y}`;
      const even = (x + y) % 2 === 0;
      ctx.fillStyle = level.walls.has(key)
        ? '#0b0e16'
        : even
          ? '#1a2030'
          : '#171c2a';
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}

function drawShadows(ctx, level) {
  for (const key of level.shadows) {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = 'rgba(88, 60, 160, 0.30)';
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    ctx.strokeStyle = 'rgba(150, 120, 230, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * TILE + 1.5, y * TILE + 1.5, TILE - 3, TILE - 3);
  }
}

function drawWalls(ctx, level) {
  for (const key of level.walls) {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = '#2c3350';
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    ctx.fillStyle = '#3d476b';
    ctx.fillRect(x * TILE, y * TILE, TILE, 4);
    ctx.fillStyle = '#232842';
    ctx.fillRect(x * TILE, y * TILE + TILE - 3, TILE, 3);
  }
}

function drawPedestals(ctx, level) {
  for (const key of level.pedestals) {
    const [x, y] = key.split(',').map(Number);
    const cx = x * TILE + TILE / 2;
    const cy = y * TILE + TILE / 2;
    ctx.fillStyle = '#4a4238';
    ctx.fillRect(x * TILE + 5, y * TILE + 5, TILE - 10, TILE - 10);
    ctx.fillStyle = '#6b5f4c';
    ctx.fillRect(x * TILE + 5, y * TILE + 5, TILE - 10, 4);
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRelics(ctx, level, time) {
  for (const relic of level.relics) {
    if (relic.taken) continue;
    const c = tileCenter(relic.x, relic.y);
    const pulse = 1 + 0.18 * Math.sin(time * 3.2 + relic.x);
    const glow = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 26 * pulse);
    glow.addColorStop(0, 'rgba(255, 170, 60, 0.85)');
    glow.addColorStop(0.5, 'rgba(255, 120, 40, 0.25)');
    glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 26 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.arc(c.x - 2, c.y - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, world) {
  const { exit, relicsTaken } = world;
  const open = relicsTaken >= RELICS_TO_WIN;
  const glow = ctx.createRadialGradient(exit.x, exit.y, 2, exit.x, exit.y, 34);
  glow.addColorStop(0, open ? 'rgba(125, 220, 138, 0.8)' : 'rgba(125, 220, 138, 0.18)');
  glow.addColorStop(1, 'rgba(125, 220, 138, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(exit.x, exit.y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = open ? '#7ddc8a' : '#4a6b52';
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x - 12, exit.y - 12, 24, 24);
  ctx.fillStyle = open ? '#c9f5d2' : '#7a8a7e';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', exit.x, exit.y - 20);
}

function drawCones(ctx, guards, player) {
  for (const guard of guards) {
    const range = player.inShadow ? SIGHT_RANGE_DARK : SIGHT_RANGE;
    const seen = guard.detection > 0.05;
    const base =
      guard.state === 'chase'
        ? 'rgba(232, 93, 77, 0.30)'
        : guard.state === 'suspicious'
          ? 'rgba(232, 163, 61, 0.24)'
          : 'rgba(232, 200, 110, 0.20)';
    const grad = ctx.createRadialGradient(guard.x, guard.y, 6, guard.x, guard.y, range);
    grad.addColorStop(0, base);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, range, guard.angle - SIGHT_HALF_ANGLE, guard.angle + SIGHT_HALF_ANGLE);
    ctx.closePath();
    ctx.fill();
    if (seen) {
      ctx.strokeStyle = guard.state === 'chase' ? 'rgba(232,93,77,0.7)' : 'rgba(232,163,61,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

function drawGuards(ctx, guards) {
  for (const guard of guards) {
    // Body.
    ctx.fillStyle = guard.color;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD_RADIUS - 4, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick: where the lantern points.
    const fx = guard.x + Math.cos(guard.angle) * (GUARD_RADIUS + 5);
    const fy = guard.y + Math.sin(guard.angle) * (GUARD_RADIUS + 5);
    ctx.strokeStyle = '#ffe9b0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guard.x + Math.cos(guard.angle) * GUARD_RADIUS * 0.4, guard.y + Math.sin(guard.angle) * GUARD_RADIUS * 0.4);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    // Name + state.
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(guard.name, guard.x, guard.y - GUARD_RADIUS - 4);
    // Detection arc over the guard.
    if (guard.detection > 0.02) {
      ctx.strokeStyle = guard.detection >= ALARM_AT ? '#e85d4d' : '#e8a33d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD_RADIUS + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.detection);
      ctx.stroke();
    }
  }
}

function drawPlayer(ctx, player, time) {
  // Lantern glow around the thief.
  const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 70);
  glow.addColorStop(0, 'rgba(255, 210, 120, 0.20)');
  glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 70, 0, Math.PI * 2);
  ctx.fill();
  // Hooded thief: dark cloak, amber rim, direction tick.
  ctx.fillStyle = '#12141d';
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 2;
  ctx.stroke();
  const fx = player.x + Math.cos(player.angle) * (PLAYER_RADIUS + 4);
  const fy = player.y + Math.sin(player.angle) * (PLAYER_RADIUS + 4);
  ctx.strokeStyle = '#ffe9b0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  // Shadow indicator: a small moon when hidden in deep shadow.
  if (player.inShadow) {
    ctx.fillStyle = '#b79cff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('hidden', player.x, player.y - PLAYER_RADIUS - 4);
  }
  void time;
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#0d1017';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('LANTERN THIEF', 12, HUD_H / 2 + 1);

  // Relics.
  let x = 190;
  for (let i = 0; i < RELICS_TO_WIN; i++) {
    ctx.fillStyle = i < world.relicsTaken ? '#ffb347' : '#3a3f52';
    ctx.beginPath();
    ctx.arc(x, HUD_H / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    x += 20;
  }
  ctx.fillStyle = '#9aa0b5';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${world.relicsTaken}/${RELICS_TO_WIN} relics`, x + 2, HUD_H / 2 + 1);

  // Detection meter.
  const mx = 430;
  ctx.fillStyle = '#2a2f42';
  ctx.fillRect(mx, 7, 180, 14);
  ctx.fillStyle = world.alarm >= ALARM_AT ? '#e85d4d' : world.alarm > 0.25 ? '#e8a33d' : '#4da3e8';
  ctx.fillRect(mx, 7, 180 * Math.min(1, world.alarm), 14);
  ctx.fillStyle = '#e8e4d8';
  ctx.fillText(world.alarm >= ALARM_AT ? 'SPOTTED!' : 'detection', mx + 188, HUD_H / 2 + 1);

  // Timer + guard states (timer sits left of the state list, no overlap).
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  ctx.fillStyle = '#9aa0b5';
  ctx.textAlign = 'right';
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, VIEW_W - 340, HUD_H / 2 + 1);
  const states = world.guards.map((g) => `${g.name}: ${g.state}`).join('  ');
  ctx.fillText(states, VIEW_W - 12, HUD_H / 2 + 1);
  ctx.textAlign = 'left';
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(5, 6, 12, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H + HUD_H);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LANTERN THIEF', VIEW_W / 2, 250);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '19px Georgia, serif';
  ctx.fillText('The Ember Museum sleeps. Three relics glow in the dark.', VIEW_W / 2, 305);
  ctx.fillText('Slip past the night watch, steal them all, and reach the EXIT unseen.', VIEW_W / 2, 332);
  ctx.fillStyle = '#9aa0b5';
  ctx.font = '16px sans-serif';
  ctx.fillText('WASD / arrows to move · Shift to run (loud!) · deep shadow hides you', VIEW_W / 2, 385);
  ctx.fillText('Running makes noise — guards come to listen. A full detection meter means a chase.', VIEW_W / 2, 408);
  ctx.fillStyle = '#7ddc8a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press ENTER or click to begin', VIEW_W / 2, 460);
  void world;
}

function drawEnd(ctx, title, line, color) {
  ctx.fillStyle = 'rgba(5, 6, 12, 0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H + HUD_H);
  ctx.fillStyle = color;
  ctx.font = 'bold 46px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, VIEW_W / 2, 300);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '19px Georgia, serif';
  ctx.fillText(line, VIEW_W / 2, 350);
}
