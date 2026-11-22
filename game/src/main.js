// Lantern Thief — the game loop: title, play, win, lose, restart. With a
// ?shot= parameter it draws one fixed scene and stops, so screenshots are
// byte-stable renders of the game's own code.
import { createWorld, updateWorld } from './world.js';
import { setupCanvas, render } from './render.js';
import { createInput } from './input.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = setupCanvas(canvas);
const input = createInput();
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
let world = createWorld();

if (shot) {
  // Screenshot mode: one deterministic frame, no loop, no input.
  applyShot(world, shot);
  render(ctx, world);
  document.title = `Lantern Thief — ${shot}`;
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (world.state === 'title') {
      if (input.wasPressed('Enter') || input.wasPressed('Space') || input.wasClicked()) {
        world.state = 'playing';
      }
    } else if (world.state === 'playing') {
      const m = input.move();
      updateWorld(world, m, dt);
      if (input.wasPressed('KeyR')) world = createWorld();
    } else if (world.state === 'won' || world.state === 'lost') {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter')) {
        world = createWorld();
        world.state = 'playing';
      }
    }
    render(ctx, world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
