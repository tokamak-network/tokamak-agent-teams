/**
 * renderer.js — Canvas rendering engine
 *
 * Handles all drawing to the HTML5 Canvas:
 * - Playfield grid with borders
 * - Locked blocks with bevel effect
 * - Active piece and ghost piece
 * - Side panels: next piece preview, hold piece, score/level/lines
 * - Game state overlays: menu, pause, game over
 * - Visual effects: line clear flash, animations
 *
 * Exports:
 * - createRenderer(canvas): creates a renderer instance
 * - Renderer.render(state): draws a complete frame
 * - Renderer.renderMenu(): draws start screen
 * - Renderer.renderPause(): draws pause overlay
 * - Renderer.renderGameOver(stats): draws game over screen
 */

// Design constants (as per spec)
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const BLOCK_SIZE = 28;

// Playfield dimensions
const PLAYFIELD_WIDTH = 10;
const PLAYFIELD_HEIGHT = 20; // Visible rows only
const PLAYFIELD_PIXEL_WIDTH = PLAYFIELD_WIDTH * BLOCK_SIZE; // 280px
const PLAYFIELD_PIXEL_HEIGHT = PLAYFIELD_HEIGHT * BLOCK_SIZE; // 560px

// Positioning
const PLAYFIELD_X = 100; // Center-left of canvas
const PLAYFIELD_Y = 40;  // Top margin

// Side panel dimensions
const LEFT_PANEL_WIDTH = 80;
const RIGHT_PANEL_WIDTH = 120;
const LEFT_PANEL_X = PLAYFIELD_X - LEFT_PANEL_WIDTH - 10;
const RIGHT_PANEL_X = PLAYFIELD_X + PLAYFIELD_PIXEL_WIDTH + 10;

// Color palette (as per spec)
const COLORS = {
  BACKGROUND: '#0a0a0a',
  PLAYFIELD_BG: '#1a1a2e',
  GRID_LINES: '#16213e',
  TEXT: '#ffffff',
  TEXT_GRAY: '#888888',
  GHOST_ALPHA: 0.25
};

// Try to import pieces for rendering if available
let PIECE_COLORS = null;
let PIECE_SHAPES = null;

if (typeof window !== 'undefined') {
  // Browser environment - will be available globally from pieces.js
  // Use window.COLORS to avoid shadowing by renderer's COLORS constant
  if (typeof window.COLORS !== 'undefined' && window.COLORS.I) {
    PIECE_COLORS = window.COLORS;
  }
  if (typeof window.SHAPES !== 'undefined') {
    PIECE_SHAPES = window.SHAPES;
  }
}

/**
 * Create a new renderer instance
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Object} Renderer object with render methods
 */
function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  // Set canvas size
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // Animation state
  let animations = {
    lineClear: null,        // { rows: [array], timer: number, duration: 150 }
    hardDrop: null,         // { x: number, startY: number, endY: number, timer: number, duration: 100, color: string }
    lockPulse: null,        // { piece: object, timer: number, duration: 200 }
    gameOverCurtain: null   // { timer: number, duration: 1000, progress: 0-1 }
  };

  /**
   * Draw a single block with bevel effect
   * @param {number} x - X position in pixels
   * @param {number} y - Y position in pixels
   * @param {string} color - Block color (hex)
   * @param {number} alpha - Opacity (0-1)
   */
  function drawBlock(x, y, color, alpha) {
    if (alpha === undefined) {
      alpha = 1;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // Main block fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);

    // Bevel effect (lighter top-left, darker bottom-right)
    if (alpha === 1) {
      // Top-left highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x, y, BLOCK_SIZE, 2);
      ctx.fillRect(x, y, 2, BLOCK_SIZE);

      // Bottom-right shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x, y + BLOCK_SIZE - 2, BLOCK_SIZE, 2);
      ctx.fillRect(x + BLOCK_SIZE - 2, y, 2, BLOCK_SIZE);
    }

    // Block border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, BLOCK_SIZE - 1, BLOCK_SIZE - 1);

    ctx.restore();
  }

  /**
   * Draw the playfield grid and locked blocks
   * @param {Array} grid - 2D array of board state
   */
  function drawPlayfield(grid) {
    // Background
    ctx.fillStyle = COLORS.PLAYFIELD_BG;
    ctx.fillRect(PLAYFIELD_X, PLAYFIELD_Y, PLAYFIELD_PIXEL_WIDTH, PLAYFIELD_PIXEL_HEIGHT);

    // Grid lines
    ctx.strokeStyle = COLORS.GRID_LINES;
    ctx.lineWidth = 1;

    for (let x = 0; x <= PLAYFIELD_WIDTH; x++) {
      const px = PLAYFIELD_X + x * BLOCK_SIZE;
      ctx.beginPath();
      ctx.moveTo(px + 0.5, PLAYFIELD_Y);
      ctx.lineTo(px + 0.5, PLAYFIELD_Y + PLAYFIELD_PIXEL_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= PLAYFIELD_HEIGHT; y++) {
      const py = PLAYFIELD_Y + y * BLOCK_SIZE;
      ctx.beginPath();
      ctx.moveTo(PLAYFIELD_X, py + 0.5);
      ctx.lineTo(PLAYFIELD_X + PLAYFIELD_PIXEL_WIDTH, py + 0.5);
      ctx.stroke();
    }

    // Draw locked blocks (only visible rows: 0-19, which map to grid rows 2-21)
    if (grid) {
      for (let y = 0; y < PLAYFIELD_HEIGHT; y++) {
        const gridY = y + 2; // Offset to skip hidden rows
        if (!grid[gridY]) continue;

        for (let x = 0; x < PLAYFIELD_WIDTH; x++) {
          const cell = grid[gridY][x];
          if (cell !== null) {
            const px = PLAYFIELD_X + x * BLOCK_SIZE;
            const py = PLAYFIELD_Y + y * BLOCK_SIZE;
            drawBlock(px, py, cell, 1);
          }
        }
      }
    }
  }

  /**
   * Draw a piece (active or ghost)
   * @param {Object} piece - Piece object with type, rotation, x, y
   * @param {number} alpha - Opacity (1 for active, 0.25 for ghost)
   */
  function drawPiece(piece, alpha) {
    if (!piece || !PIECE_SHAPES || !PIECE_COLORS) return;
    if (alpha === undefined) {
      alpha = 1;
    }

    const shape = PIECE_SHAPES[piece.type][piece.rotation];
    const color = PIECE_COLORS[piece.type];

    if (!shape || !color) return;

    for (let i = 0; i < shape.length; i++) {
      const blockX = piece.x + shape[i][0];
      const blockY = piece.y + shape[i][1];

      // Only draw if within visible area (rows 2-21 map to screen rows 0-19)
      if (blockY >= 2 && blockY < 22) {
        const screenY = blockY - 2;
        const px = PLAYFIELD_X + blockX * BLOCK_SIZE;
        const py = PLAYFIELD_Y + screenY * BLOCK_SIZE;

        drawBlock(px, py, color, alpha);
      }
    }
  }

  /**
   * Draw a small piece preview
   * @param {string} pieceType - Piece type
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} scale - Scale factor (default 0.7)
   */
  function drawPiecePreview(pieceType, x, y, scale) {
    if (!PIECE_SHAPES || !PIECE_COLORS) return;
    if (scale === undefined) {
      scale = 0.7;
    }

    const shape = PIECE_SHAPES[pieceType][0]; // Spawn rotation
    const color = PIECE_COLORS[pieceType];

    if (!shape || !color) return;

    const blockSize = BLOCK_SIZE * scale;

    // Calculate bounding box for centering
    let minX = 999, maxX = -999, minY = 999, maxY = -999;
    for (let i = 0; i < shape.length; i++) {
      minX = Math.min(minX, shape[i][0]);
      maxX = Math.max(maxX, shape[i][0]);
      minY = Math.min(minY, shape[i][1]);
      maxY = Math.max(maxY, shape[i][1]);
    }

    const width = (maxX - minX + 1) * blockSize;
    const height = (maxY - minY + 1) * blockSize;
    const offsetX = -minX * blockSize;
    const offsetY = -minY * blockSize;

    // Center in preview area
    const centerX = x - width / 2;
    const centerY = y - height / 2;

    for (let i = 0; i < shape.length; i++) {
      const bx = centerX + offsetX + shape[i][0] * blockSize;
      const by = centerY + offsetY + shape[i][1] * blockSize;

      ctx.fillStyle = color;
      ctx.fillRect(bx, by, blockSize, blockSize);

      // Simple border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, blockSize, blockSize);
    }
  }

  /**
   * Draw hold piece panel
   * @param {string} holdPieceType - Held piece type or null
   */
  function drawHoldPanel(holdPieceType) {
    const panelX = LEFT_PANEL_X;
    const panelY = PLAYFIELD_Y;

    // Label
    ctx.fillStyle = COLORS.TEXT_GRAY;
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HOLD', panelX + LEFT_PANEL_WIDTH / 2, panelY + 15);

    // Preview box
    const boxY = panelY + 25;
    const boxHeight = 60;
    ctx.strokeStyle = COLORS.GRID_LINES;
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, boxY, LEFT_PANEL_WIDTH, boxHeight);

    // Draw piece if held
    if (holdPieceType) {
      drawPiecePreview(holdPieceType, panelX + LEFT_PANEL_WIDTH / 2, boxY + boxHeight / 2, 0.6);
    }
  }

  /**
   * Draw next pieces panel
   * @param {Array} nextPieces - Array of next piece types (up to 3)
   */
  function drawNextPanel(nextPieces) {
    const panelX = RIGHT_PANEL_X;
    const panelY = PLAYFIELD_Y;

    // Label
    ctx.fillStyle = COLORS.TEXT_GRAY;
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', panelX + RIGHT_PANEL_WIDTH / 2, panelY + 15);

    // Draw up to 3 next pieces
    if (nextPieces && nextPieces.length > 0) {
      const boxHeight = 50;
      const spacing = 10;

      for (let i = 0; i < Math.min(3, nextPieces.length); i++) {
        const boxY = panelY + 25 + i * (boxHeight + spacing);

        // Preview box
        ctx.strokeStyle = COLORS.GRID_LINES;
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, boxY, RIGHT_PANEL_WIDTH, boxHeight);

        // Draw piece
        drawPiecePreview(nextPieces[i], panelX + RIGHT_PANEL_WIDTH / 2, boxY + boxHeight / 2, 0.5);
      }
    }
  }

  /**
   * Draw stats panel (score, level, lines)
   * @param {Object} stats - Stats object from scoring module
   */
  function drawStatsPanel(stats) {
    const panelX = RIGHT_PANEL_X;
    const panelY = PLAYFIELD_Y + 200;

    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'left';

    let y = panelY;
    const lineHeight = 25;

    // Score
    ctx.fillStyle = COLORS.TEXT_GRAY;
    ctx.fillText('SCORE', panelX, y);
    ctx.fillStyle = COLORS.TEXT;
    ctx.fillText(stats.score || 0, panelX, y + lineHeight);
    y += lineHeight * 2 + 10;

    // Level
    ctx.fillStyle = COLORS.TEXT_GRAY;
    ctx.fillText('LEVEL', panelX, y);
    ctx.fillStyle = COLORS.TEXT;
    ctx.fillText(stats.level || 1, panelX, y + lineHeight);
    y += lineHeight * 2 + 10;

    // Lines
    ctx.fillStyle = COLORS.TEXT_GRAY;
    ctx.fillText('LINES', panelX, y);
    ctx.fillStyle = COLORS.TEXT;
    ctx.fillText(stats.lines || 0, panelX, y + lineHeight);
  }

  /**
   * Update animation timers
   * @param {number} deltaTime - Time elapsed in milliseconds
   */
  function updateAnimations(deltaTime) {
    // Update line clear flash
    if (animations.lineClear) {
      animations.lineClear.timer += deltaTime;
      if (animations.lineClear.timer >= animations.lineClear.duration) {
        animations.lineClear = null;
      }
    }

    // Update hard drop trail
    if (animations.hardDrop) {
      animations.hardDrop.timer += deltaTime;
      if (animations.hardDrop.timer >= animations.hardDrop.duration) {
        animations.hardDrop = null;
      }
    }

    // Update lock pulse
    if (animations.lockPulse) {
      animations.lockPulse.timer += deltaTime;
      if (animations.lockPulse.timer >= animations.lockPulse.duration) {
        animations.lockPulse = null;
      }
    }

    // Update game over curtain
    if (animations.gameOverCurtain) {
      animations.gameOverCurtain.timer += deltaTime;
      animations.gameOverCurtain.progress = Math.min(1, animations.gameOverCurtain.timer / animations.gameOverCurtain.duration);
    }
  }

  /**
   * Draw line clear flash effect
   */
  function drawLineClearFlash() {
    if (!animations.lineClear) return;

    const alpha = 1 - (animations.lineClear.timer / animations.lineClear.duration);
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#ffffff';

    for (let i = 0; i < animations.lineClear.rows.length; i++) {
      const screenY = animations.lineClear.rows[i] - 2; // Convert to screen coordinates
      if (screenY >= 0 && screenY < PLAYFIELD_HEIGHT) {
        const py = PLAYFIELD_Y + screenY * BLOCK_SIZE;
        ctx.fillRect(PLAYFIELD_X, py, PLAYFIELD_PIXEL_WIDTH, BLOCK_SIZE);
      }
    }

    ctx.restore();
  }

  /**
   * Draw hard drop trail effect
   */
  function drawHardDropTrail() {
    if (!animations.hardDrop) return;

    const progress = animations.hardDrop.timer / animations.hardDrop.duration;
    const alpha = (1 - progress) * 0.6;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = animations.hardDrop.color;

    const startScreenY = animations.hardDrop.startY - 2;
    const endScreenY = animations.hardDrop.endY - 2;

    if (startScreenY >= 0 && endScreenY < PLAYFIELD_HEIGHT) {
      const px = PLAYFIELD_X + animations.hardDrop.x * BLOCK_SIZE;
      const py1 = PLAYFIELD_Y + Math.max(0, startScreenY) * BLOCK_SIZE;
      const py2 = PLAYFIELD_Y + Math.min(PLAYFIELD_HEIGHT - 1, endScreenY) * BLOCK_SIZE + BLOCK_SIZE;
      const height = py2 - py1;

      if (height > 0) {
        ctx.fillRect(px, py1, BLOCK_SIZE, height);
      }
    }

    ctx.restore();
  }

  /**
   * Draw piece lock brightness pulse
   */
  function drawLockPulse() {
    if (!animations.lockPulse || !PIECE_SHAPES || !PIECE_COLORS) return;

    const piece = animations.lockPulse.piece;
    const progress = animations.lockPulse.timer / animations.lockPulse.duration;
    // Pulse: bright at start, fade to normal
    const brightness = 1 + (1 - progress) * 0.5;

    const shape = PIECE_SHAPES[piece.type][piece.rotation];
    const color = PIECE_COLORS[piece.type];

    if (!shape || !color) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (1 - progress) * 0.5;

    for (let i = 0; i < shape.length; i++) {
      const blockX = piece.x + shape[i][0];
      const blockY = piece.y + shape[i][1];

      if (blockY >= 2 && blockY < 22) {
        const screenY = blockY - 2;
        const px = PLAYFIELD_X + blockX * BLOCK_SIZE;
        const py = PLAYFIELD_Y + screenY * BLOCK_SIZE;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
      }
    }

    ctx.restore();
  }

  /**
   * Draw game over curtain animation
   */
  function drawGameOverCurtain() {
    if (!animations.gameOverCurtain) return;

    const progress = animations.gameOverCurtain.progress;
    const rowsToGray = Math.floor(progress * PLAYFIELD_HEIGHT);

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#666666';

    for (let y = PLAYFIELD_HEIGHT - 1; y >= PLAYFIELD_HEIGHT - rowsToGray; y--) {
      const py = PLAYFIELD_Y + y * BLOCK_SIZE;
      ctx.fillRect(PLAYFIELD_X, py, PLAYFIELD_PIXEL_WIDTH, BLOCK_SIZE);
    }

    ctx.restore();
  }

  /**
   * Render a complete game frame
   * @param {Object} state - Full game state object
   * @param {number} deltaTime - Time elapsed since last frame (for animations)
   */
  function render(state, deltaTime) {
    // Update animations
    if (deltaTime) {
      updateAnimations(deltaTime);
    }

    // Clear canvas
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!state) {
      // No state, show placeholder
      ctx.fillStyle = COLORS.TEXT;
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      return;
    }

    // Draw playfield grid and locked blocks
    drawPlayfield(state.grid);

    // Draw ghost piece (if active piece exists)
    if (state.activePiece && state.ghostY !== undefined) {
      const ghostPiece = {
        type: state.activePiece.type,
        rotation: state.activePiece.rotation,
        x: state.activePiece.x,
        y: state.ghostY
      };
      drawPiece(ghostPiece, COLORS.GHOST_ALPHA);
    }

    // Draw active piece
    if (state.activePiece) {
      drawPiece(state.activePiece, 1);
    }

    // Draw animations
    drawHardDropTrail();
    drawLockPulse();
    drawLineClearFlash();
    drawGameOverCurtain();

    // Draw UI panels
    drawHoldPanel(state.holdPiece);
    drawNextPanel(state.nextPieces);
    drawStatsPanel(state.stats || {});
  }

  /**
   * Render start/menu screen
   */
  function renderMenu() {
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '32px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TETRIS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

    ctx.font = '16px monospace';
    ctx.fillStyle = COLORS.TEXT_GRAY;
    ctx.fillText('Press any key to start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  }

  /**
   * Render pause overlay
   */
  function renderPause() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '32px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = COLORS.TEXT_GRAY;
    ctx.fillText('Press ESC or P to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
  }

  /**
   * Render game over screen
   * @param {Object} stats - Final game statistics
   */
  function renderGameOver(stats) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '32px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

    if (stats) {
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillStyle = COLORS.TEXT_GRAY;
      let y = CANVAS_HEIGHT / 2;

      ctx.fillText('Score: ' + (stats.score || 0), CANVAS_WIDTH / 2, y);
      y += 30;
      ctx.fillText('Level: ' + (stats.level || 1), CANVAS_WIDTH / 2, y);
      y += 30;
      ctx.fillText('Lines: ' + (stats.lines || 0), CANVAS_WIDTH / 2, y);
    }

    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = COLORS.TEXT_GRAY;
    ctx.fillText('Press ENTER to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 100);
  }

  /**
   * Trigger line clear flash animation
   * @param {Array} rows - Array of row indices that were cleared
   */
  function triggerLineClearFlash(rows) {
    if (!rows || rows.length === 0) return;
    animations.lineClear = {
      rows: rows.slice(), // Copy array
      timer: 0,
      duration: 150
    };
  }

  /**
   * Trigger hard drop trail animation
   * @param {number} x - Column position
   * @param {number} startY - Starting Y position
   * @param {number} endY - Ending Y position
   * @param {string} color - Piece color
   */
  function triggerHardDropTrail(x, startY, endY, color) {
    animations.hardDrop = {
      x: x,
      startY: startY,
      endY: endY,
      timer: 0,
      duration: 100,
      color: color
    };
  }

  /**
   * Trigger piece lock pulse animation
   * @param {Object} piece - Piece object with type, rotation, x, y
   */
  function triggerLockPulse(piece) {
    if (!piece) return;
    animations.lockPulse = {
      piece: {
        type: piece.type,
        rotation: piece.rotation,
        x: piece.x,
        y: piece.y
      },
      timer: 0,
      duration: 200
    };
  }

  /**
   * Trigger game over curtain animation
   */
  function triggerGameOverCurtain() {
    animations.gameOverCurtain = {
      timer: 0,
      duration: 1000,
      progress: 0
    };
  }

  /**
   * Clear all animations
   */
  function clearAnimations() {
    animations.lineClear = null;
    animations.hardDrop = null;
    animations.lockPulse = null;
    animations.gameOverCurtain = null;
  }

  // Return public interface
  return {
    ctx: ctx, // Expose ctx for tests
    render: render,
    renderMenu: renderMenu,
    renderPause: renderPause,
    renderGameOver: renderGameOver,
    // Animation triggers
    triggerLineClearFlash: triggerLineClearFlash,
    triggerHardDropTrail: triggerHardDropTrail,
    triggerLockPulse: triggerLockPulse,
    triggerGameOverCurtain: triggerGameOverCurtain,
    clearAnimations: clearAnimations
  };
}

// Legacy render function for backwards compatibility with tests
function render(renderer, state) {
  if (renderer && renderer.render) {
    renderer.render(state);
  }
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createRenderer,
    render, // Legacy compatibility
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    BLOCK_SIZE
  };
}
