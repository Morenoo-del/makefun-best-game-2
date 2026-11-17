// Ember Grove — keyboard and mouse input.
//
// One small state object the game loop reads each tick. Keys are tracked by
// their `code` so WASD and the arrow keys both steer, and the mouse position
// is kept in logical canvas coordinates for menu buttons and upgrade cards.

export function createInput(canvas) {
  const keys = new Set();
  // Keys pressed since the last tick, separate from keys held: a quick tap
  // ends (keyup) before the next frame, so pressedOnce must read this set
  // or short presses would be lost entirely.
  const pressed = new Set();
  const state = {
    keys,
    pressed,
    // Logical (1280x720) mouse position, updated on every move.
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    // True for exactly one update after a click lands.
    clicked: false,
    clickX: 0,
    clickY: 0,
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    keys.add(event.code);
    pressed.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    pressed.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = toLogical(event);
    state.mouseX = p.x;
    state.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toLogical(event);
    state.mouseX = p.x;
    state.mouseY = p.y;
    state.mouseDown = true;
  });
  window.addEventListener('mouseup', (event) => {
    const p = toLogical(event);
    state.mouseX = p.x;
    state.mouseY = p.y;
    state.mouseDown = false;
    state.clicked = true;
    state.clickX = p.x;
    state.clickY = p.y;
  });

  return state;
}

// Read once per tick: the steering vector from held keys, normalised.
export function moveVector(input) {
  let x = 0;
  let y = 0;
  const k = input.keys;
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
  if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
  if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

// True when the key was pressed since the last call; consumes the press so a
// held key does not repeat the action every frame. Reads the pressed set,
// not the held set, so a tap shorter than one frame still registers.
export function pressedOnce(input, code) {
  if (input.pressed.has(code)) {
    input.pressed.delete(code);
    return true;
  }
  return false;
}

// True when a click landed inside the rectangle since the last call.
export function clickedIn(input, x, y, w, h) {
  if (!input.clicked) return false;
  return input.clickX >= x && input.clickX <= x + w && input.clickY >= y && input.clickY <= y + h;
}

// Call at the end of every tick: a click lives for one tick only.
export function endTick(input) {
  input.clicked = false;
}
