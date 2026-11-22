// Lantern Thief — keyboard input: WASD or arrows to move, Shift to run,
// Enter to start, R to restart. Also tracks one mouse click (start buttons).
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  let clicked = false;

  function codeOf(e) {
    return e.code;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousedown', () => {
    clicked = true;
  });

  return {
    // Movement vector in -1..1 on each axis, from WASD or the arrow keys.
    move() {
      let mx = 0;
      let my = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
      return { mx, my, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
    },
    // True once for a key pressed since the last call.
    wasPressed(code) {
      if (pressed.has(code)) {
        pressed.delete(code);
        return true;
      }
      return false;
    },
    wasClicked() {
      const c = clicked;
      clicked = false;
      return c;
    },
    isDown(code) {
      return keys.has(code);
    },
    // For scripted play (screenshots): pretend these keys are held.
    setTestKeys(list) {
      keys.clear();
      for (const code of list) keys.add(code);
    },
    _codeOf: codeOf,
  };
}
