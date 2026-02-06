/**
 * input.js — Keyboard input handler
 *
 * Registers keydown and keyup event listeners on the window object.
 * Maintains a Set of currently pressed keys.
 *
 * Controls per SPEC.md:
 * - W / ArrowUp: Move Player 1 paddle up
 * - S / ArrowDown: Move Player 1 paddle down
 * - Space: Start game / Restart after game over
 * - P: Pause / Unpause the game
 * - 1/2/3: Set CPU difficulty to Easy/Medium/Hard
 *
 * Exports: InputHandler class with isKeyDown(), onKeyPress(), destroy()
 */

class InputHandler {
  constructor() {
    this.pressedKeys = new Set();
    this.keyPressCallbacks = new Map();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
    }
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} e
   */
  handleKeyDown(e) {
    const key = e.key;

    // Prevent default for game keys to avoid page scrolling
    if (['ArrowUp', 'ArrowDown', ' ', 'w', 's', 'W', 'S', 'p', 'P', '1', '2', '3'].includes(key)) {
      e.preventDefault();
    }

    // Add to pressed keys set
    this.pressedKeys.add(key);

    // Trigger one-shot callbacks
    if (this.keyPressCallbacks.has(key)) {
      const callbacks = this.keyPressCallbacks.get(key);
      callbacks.forEach(callback => callback());
    }
  }

  /**
   * Handle keyup events
   * @param {KeyboardEvent} e
   */
  handleKeyUp(e) {
    this.pressedKeys.delete(e.key);
  }

  /**
   * Check if a key is currently held down
   * @param {string} key - The key to check
   * @returns {boolean}
   */
  isKeyDown(key) {
    return this.pressedKeys.has(key);
  }

  /**
   * Register a one-shot callback triggered on keydown for a specific key
   * (used for state toggles like pause and start)
   * @param {string} key - The key to listen for
   * @param {Function} callback - The callback to execute
   */
  onKeyPress(key, callback) {
    if (!this.keyPressCallbacks.has(key)) {
      this.keyPressCallbacks.set(key, []);
    }
    this.keyPressCallbacks.get(key).push(callback);
  }

  /**
   * Remove all event listeners (cleanup)
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
    }
    this.pressedKeys.clear();
    this.keyPressCallbacks.clear();
  }
}

/**
 * Legacy setupInput function for backward compatibility
 * @deprecated Use InputHandler class instead
 */
function setupInput(callback) {
  if (typeof document === 'undefined') return;

  document.addEventListener('keydown', function(e) {
    if (callback) {
      e.preventDefault();
      callback(e.key);
    }
  });
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InputHandler, setupInput };
}
