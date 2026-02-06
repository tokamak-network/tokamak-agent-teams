/**
 * input.js — Keyboard input manager with DAS/ARR
 *
 * Exports:
 *   - createInput(): factory function that returns an Input object
 *
 * Input object methods:
 *   - update(deltaTime): process DAS/ARR timers
 *   - getActions(): get array of actions triggered this frame
 *   - reset(): clear all key states
 */

// DAS and ARR configuration (in milliseconds)
const DAS_DELAY = 170;  // Delayed Auto Shift delay
const ARR_RATE = 50;    // Auto Repeat Rate interval

// Key mapping to actions
const KEY_MAP = {
  // Movement
  'ArrowLeft': 'MOVE_LEFT',
  'a': 'MOVE_LEFT',
  'A': 'MOVE_LEFT',
  'ArrowRight': 'MOVE_RIGHT',
  'd': 'MOVE_RIGHT',
  'D': 'MOVE_RIGHT',
  'ArrowDown': 'SOFT_DROP',
  's': 'SOFT_DROP',
  'S': 'SOFT_DROP',

  // Rotation
  'ArrowUp': 'ROTATE_CW',
  'x': 'ROTATE_CW',
  'X': 'ROTATE_CW',
  'z': 'ROTATE_CCW',
  'Z': 'ROTATE_CCW',
  'Control': 'ROTATE_CCW',

  // Drop
  ' ': 'HARD_DROP',
  'w': 'HARD_DROP',
  'W': 'HARD_DROP',

  // Hold
  'c': 'HOLD',
  'C': 'HOLD',
  'Shift': 'HOLD',

  // System
  'Escape': 'PAUSE',
  'p': 'PAUSE',
  'P': 'PAUSE',
  'Enter': 'RESTART'
};

// Actions that should use DAS/ARR (repeated when held)
const DAS_ACTIONS = ['MOVE_LEFT', 'MOVE_RIGHT', 'SOFT_DROP'];

/**
 * Create a new input manager instance
 * @returns {object} Input object with methods
 */
function createInput() {
  // Key state tracking
  const keyStates = {};  // key -> { pressed: boolean, time: number, dasActive: boolean, arrTime: number }
  const actionBuffer = [];  // Actions triggered this frame

  let isListening = false;

  /**
   * Handle keydown event
   */
  function onKeyDown(e) {
    const action = KEY_MAP[e.key];
    if (!action) return;

    e.preventDefault();

    // Check if key is already pressed (auto-repeat from browser)
    if (keyStates[e.key] && keyStates[e.key].pressed) {
      return;
    }

    // Mark key as pressed
    keyStates[e.key] = {
      pressed: true,
      time: 0,
      dasActive: false,
      arrTime: 0
    };

    // Immediate action for non-DAS keys, or first press of DAS keys
    actionBuffer.push(action);
  }

  /**
   * Handle keyup event
   */
  function onKeyUp(e) {
    const action = KEY_MAP[e.key];
    if (!action) return;

    e.preventDefault();

    // Clear key state
    if (keyStates[e.key]) {
      delete keyStates[e.key];
    }
  }

  /**
   * Start listening for keyboard events
   */
  function startListening() {
    if (isListening || typeof document === 'undefined') return;

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    isListening = true;
  }

  /**
   * Stop listening for keyboard events
   */
  function stopListening() {
    if (!isListening || typeof document === 'undefined') return;

    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    isListening = false;
  }

  /**
   * Update input state and process DAS/ARR
   * @param {number} deltaTime - Time elapsed since last frame in milliseconds
   */
  function update(deltaTime) {
    // Process each held key
    for (const key in keyStates) {
      if (!keyStates.hasOwnProperty(key)) continue;

      const state = keyStates[key];
      const action = KEY_MAP[key];

      // Skip if not a DAS action
      if (!DAS_ACTIONS.includes(action)) continue;

      state.time += deltaTime;

      // Check if DAS delay has passed
      if (!state.dasActive && state.time >= DAS_DELAY) {
        state.dasActive = true;
        state.arrTime = 0;
        // Trigger immediate action when DAS activates
        actionBuffer.push(action);
      }

      // Process ARR if DAS is active
      if (state.dasActive) {
        state.arrTime += deltaTime;

        if (state.arrTime >= ARR_RATE) {
          actionBuffer.push(action);
          state.arrTime -= ARR_RATE;
        }
      }
    }
  }

  /**
   * Get all actions triggered this frame and clear the buffer
   * @returns {array} Array of action strings
   */
  function getActions() {
    const actions = actionBuffer.slice(); // Copy array
    actionBuffer.length = 0; // Clear buffer
    return actions;
  }

  /**
   * Reset all key states and clear action buffer
   */
  function reset() {
    for (const key in keyStates) {
      if (keyStates.hasOwnProperty(key)) {
        delete keyStates[key];
      }
    }
    actionBuffer.length = 0;
  }

  // Auto-start listening when created in browser environment
  if (typeof document !== 'undefined') {
    startListening();
  }

  // Return public interface
  return {
    update: update,
    getActions: getActions,
    reset: reset,
    startListening: startListening,
    stopListening: stopListening
  };
}

// Legacy compatibility: setupInput function for old code
function setupInput(callback) {
  if (typeof document === 'undefined') return;

  document.addEventListener('keydown', function(e) {
    const action = KEY_MAP[e.key];
    if (action && callback) {
      e.preventDefault();
      callback({ type: action });
    }
  });
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createInput,
    setupInput,
    DAS_DELAY,
    ARR_RATE,
    KEY_MAP
  };
}
