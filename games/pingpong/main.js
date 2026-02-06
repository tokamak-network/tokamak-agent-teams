/**
 * main.js — Entry point and game loop orchestrator
 *
 * Manages the core game loop, state machine, and coordinates all game objects.
 */

// Game states
const GameState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  POINT_SCORED: 'POINT_SCORED',
  GAME_OVER: 'GAME_OVER'
};

// Game variables
let currentState = GameState.MENU;
let pointCountdown = 0;
let difficulty = 'medium';

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Initialize game objects
const ball = new Ball(canvas.width, canvas.height);
const playerPaddle = new Paddle(PADDLE_MARGIN, canvas.height / 2 - PADDLE_HEIGHT / 2);
const cpuPaddle = new Paddle(canvas.width - PADDLE_MARGIN - PADDLE_WIDTH, canvas.height / 2 - PADDLE_HEIGHT / 2);
const scoreManager = new ScoreManager();
const aiController = new AIController(difficulty);
const inputHandler = new InputHandler();

/**
 * Start a new game from the menu or game over screen
 */
function startGame() {
  scoreManager.reset();
  currentState = GameState.PLAYING;

  // Reset ball to center with random direction
  ball.reset(Math.random() > 0.5 ? 1 : -1);

  // Reset paddles to center
  playerPaddle.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
  cpuPaddle.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
}

/**
 * Reset ball position after a point is scored and start countdown
 */
function resetPoint(directionX) {
  currentState = GameState.POINT_SCORED;
  pointCountdown = 60; // 60 frames = 1 second

  // Reset ball for next point
  ball.reset(directionX);
}

/**
 * Toggle pause state
 */
function togglePause() {
  if (currentState === GameState.PLAYING) {
    currentState = GameState.PAUSED;
  } else if (currentState === GameState.PAUSED) {
    currentState = GameState.PLAYING;
  }
}

/**
 * Set AI difficulty
 */
function setDifficulty(level) {
  difficulty = level;
  aiController.setDifficulty(level);
}

/**
 * Update game state, handle input, and check collisions
 */
function update() {
  if (currentState === GameState.PLAYING) {
    // Handle player input
    let playerDirection = 0;
    if (inputHandler.isKeyDown('w') || inputHandler.isKeyDown('W') || inputHandler.isKeyDown('ArrowUp')) {
      playerDirection = -1;
    }
    if (inputHandler.isKeyDown('s') || inputHandler.isKeyDown('S') || inputHandler.isKeyDown('ArrowDown')) {
      playerDirection = 1;
    }
    playerPaddle.setDirection(playerDirection);
    playerPaddle.update(canvas.height);

    // Update CPU AI
    aiController.update(ball, cpuPaddle, canvas.height);

    // Update ball
    ball.update();

    // Check paddle collisions
    if (checkPaddleCollision(ball, playerPaddle)) {
      resolvePaddleCollision(ball, playerPaddle);
    }
    if (checkPaddleCollision(ball, cpuPaddle)) {
      resolvePaddleCollision(ball, cpuPaddle);
    }

    // Check scoring
    const scorer = checkScore(ball, canvas.width);
    if (scorer === 'player') {
      const gameOver = scoreManager.addPlayerPoint();
      if (gameOver) {
        currentState = GameState.GAME_OVER;
      } else {
        resetPoint(-1); // Ball goes toward CPU
      }
    } else if (scorer === 'cpu') {
      const gameOver = scoreManager.addCpuPoint();
      if (gameOver) {
        currentState = GameState.GAME_OVER;
      } else {
        resetPoint(1); // Ball goes toward player
      }
    }
  } else if (currentState === GameState.POINT_SCORED) {
    // Countdown timer between points
    pointCountdown--;
    if (pointCountdown <= 0) {
      currentState = GameState.PLAYING;
    }
  }
}

/**
 * Render current game state to canvas
 */
function render() {
  if (typeof Renderer !== 'undefined') {
    Renderer.clearCanvas(ctx, canvas.width, canvas.height);
    Renderer.drawCourt(ctx, canvas.width, canvas.height);

    if (currentState === GameState.MENU) {
      Renderer.drawMenu(ctx, canvas.width, canvas.height);
    } else {
      Renderer.drawPaddle(ctx, playerPaddle);
      Renderer.drawPaddle(ctx, cpuPaddle);
      Renderer.drawBall(ctx, ball);

      const scores = scoreManager.getScores();
      Renderer.drawScore(ctx, scores, canvas.width);

      if (currentState === GameState.PAUSED) {
        Renderer.drawPaused(ctx, canvas.width, canvas.height);
      } else if (currentState === GameState.POINT_SCORED) {
        const secondsLeft = Math.ceil(pointCountdown / 60);
        Renderer.drawCountdown(ctx, secondsLeft, canvas.width, canvas.height);
      } else if (currentState === GameState.GAME_OVER) {
        const winner = scoreManager.getWinner();
        Renderer.drawGameOver(ctx, winner, scores, canvas.width, canvas.height);
      }

      Renderer.drawDifficulty(ctx, difficulty, canvas.width, canvas.height);
    }
  } else {
    // Fallback if Renderer not loaded
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentState === GameState.MENU) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PING PONG', canvas.width / 2, canvas.height / 2);
      ctx.font = '20px monospace';
      ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2 + 50);
    } else {
      if (playerPaddle.render) playerPaddle.render(ctx);
      if (cpuPaddle.render) cpuPaddle.render(ctx);
      if (ball.render) ball.render(ctx);
    }
  }
}

/**
 * Main game loop - runs at 60fps via requestAnimationFrame
 */
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

/**
 * Register keyboard input handlers for game controls
 */
function setupInputHandlers() {
  // Space - start/restart game
  inputHandler.onKeyPress(' ', () => {
    if (currentState === GameState.MENU || currentState === GameState.GAME_OVER) {
      startGame();
    }
  });

  // P - pause/unpause
  inputHandler.onKeyPress('p', togglePause);
  inputHandler.onKeyPress('P', togglePause);

  // Difficulty keys
  inputHandler.onKeyPress('1', () => setDifficulty('easy'));
  inputHandler.onKeyPress('2', () => setDifficulty('medium'));
  inputHandler.onKeyPress('3', () => setDifficulty('hard'));
}

/**
 * Initialize game and start main loop
 */
function init() {
  setupInputHandlers();
  requestAnimationFrame(gameLoop);
}

// Start the game when script loads
if (typeof document !== 'undefined') {
  init();
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { startGame, resetGame: startGame, togglePause, gameState: currentState };
}
