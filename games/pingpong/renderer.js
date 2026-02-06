/**
 * renderer.js — All drawing operations
 *
 * Centralizes all canvas drawing operations according to SPEC.md
 * Exports: Renderer object with all draw methods
 */

const Renderer = {
  /**
   * Clears the entire canvas with background color
   */
  clearCanvas: function(ctx, width, height) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, width, height);
  },

  /**
   * Draws the court decorations: center dashed line, center circle, top/bottom borders
   */
  drawCourt: function(ctx, width, height) {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;

    // Top border
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.stroke();

    // Bottom border
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();

    // Center dashed line
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 40, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.stroke();
  },

  /**
   * Renders the ball with a subtle glow effect
   */
  drawBall: function(ctx, ball) {
    ctx.save();

    // Add glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFFFFF';

    // Draw ball
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  /**
   * Renders the paddle with slightly rounded corners
   */
  drawPaddle: function(ctx, paddle) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();

    // Use roundRect if available, otherwise fall back to regular rect
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 2);
    } else {
      // Fallback for older browsers
      ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    }

    ctx.fill();
  },

  /**
   * Renders both scores in large retro font above the court
   */
  drawScore: function(ctx, scores, width) {
    ctx.font = '48px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';
    ctx.fillText(scores.player.toString(), width * 0.25, 60);
    ctx.fillText(scores.cpu.toString(), width * 0.75, 60);
  },

  /**
   * Renders the title screen with game name and start prompt
   */
  drawMenu: function(ctx, width, height) {
    // Game title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PING PONG', width / 2, height / 2 - 40);

    // Pulsing subtitle - uses time-based animation
    const pulseOpacity = 0.3 + Math.abs(Math.sin(Date.now() / 500)) * 0.7;
    ctx.font = '20px monospace';
    ctx.fillStyle = `rgba(255, 255, 255, ${pulseOpacity})`;
    ctx.fillText('Press SPACE to Start', width / 2, height / 2 + 40);

    // Difficulty hint
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('1/2/3 = Easy/Medium/Hard', width / 2, height / 2 + 80);

    // Controls hint
    ctx.fillText('W/S or Arrow Keys to Move', width / 2, height / 2 + 110);
    ctx.fillText('P to Pause', width / 2, height / 2 + 130);
  },

  /**
   * Renders a semi-transparent overlay with "PAUSED" text
   */
  drawPaused: function(ctx, width, height) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // PAUSED text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', width / 2, height / 2);

    // Resume hint
    ctx.font = '20px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Press P to Resume', width / 2, height / 2 + 50);
  },

  /**
   * Renders the game over screen with winner announcement and restart prompt
   */
  drawGameOver: function(ctx, winner, scores, width, height) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // GAME OVER text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', width / 2, height / 2 - 60);

    // Winner announcement
    ctx.font = '32px monospace';
    const winnerText = winner === 'player' ? 'Player Wins!' : 'CPU Wins!';
    ctx.fillText(winnerText, width / 2, height / 2);

    // Final score
    ctx.font = '24px monospace';
    ctx.fillText(`${scores.player} - ${scores.cpu}`, width / 2, height / 2 + 40);

    // Pulsing restart prompt
    const pulseOpacity = 0.3 + Math.abs(Math.sin(Date.now() / 500)) * 0.7;
    ctx.font = '20px monospace';
    ctx.fillStyle = `rgba(255, 255, 255, ${pulseOpacity})`;
    ctx.fillText('Press SPACE to Restart', width / 2, height / 2 + 100);
  },

  /**
   * Renders a countdown number in the center during the pause between points
   */
  drawCountdown: function(ctx, seconds, width, height) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '72px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(seconds.toString(), width / 2, height / 2);
  },

  /**
   * Shows the current difficulty label in the top-right corner
   */
  drawDifficulty: function(ctx, level, width, height) {
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    const levelText = level.charAt(0).toUpperCase() + level.slice(1);
    ctx.fillText(`AI: ${levelText}`, width - 20, 30);
  }
};

// Legacy API for backwards compatibility with tests
function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    ctx: ctx,
    width: canvas.width,
    height: canvas.height
  };
}

function render(renderer, state) {
  if (!renderer || !renderer.ctx) return;

  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;

  // Clear canvas
  Renderer.clearCanvas(ctx, w, h);

  // Placeholder rendering for test compatibility
  ctx.fillStyle = '#00d4ff';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Game initializing...', w / 2, h / 2);

  if (state && state.score !== undefined) {
    ctx.fillText('Score: ' + state.score, w / 2, h / 2 + 30);
  }
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Renderer, createRenderer, render };
}
