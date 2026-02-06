/**
 * collision.js — Collision detection and response
 *
 * Provides functions for detecting and resolving collisions between
 * the ball, paddles, and scoring boundaries.
 * Wall collisions are now handled internally by Ball.update().
 */

/**
 * Check if ball collides with paddle using AABB overlap test
 * @param {Ball} ball - The ball object
 * @param {Paddle} paddle - The paddle object
 * @returns {boolean} True if collision detected
 */
function checkPaddleCollision(ball, paddle) {
  const ballBounds = ball.getBounds();
  const paddleBounds = paddle.getBounds();

  // AABB (Axis-Aligned Bounding Box) collision detection
  return (
    ballBounds.right > paddleBounds.left &&
    ballBounds.left < paddleBounds.right &&
    ballBounds.bottom > paddleBounds.top &&
    ballBounds.top < paddleBounds.bottom
  );
}

/**
 * Resolve paddle collision with angle-based deflection
 * @param {Ball} ball - The ball object
 * @param {Paddle} paddle - The paddle object
 */
function resolvePaddleCollision(ball, paddle) {
  // Get collision angle based on where ball hit the paddle
  const collisionAngle = paddle.getCollisionAngle(ball.y);

  // Maximum deflection angle in radians (60 degrees)
  const maxDeflectionAngle = Math.PI / 3;
  const deflectionAngle = collisionAngle * maxDeflectionAngle;

  // Calculate new velocity based on deflection angle
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

  // Reverse horizontal direction and apply angle
  const direction = ball.vx > 0 ? -1 : 1;
  ball.vx = direction * speed * Math.cos(deflectionAngle);
  ball.vy = speed * Math.sin(deflectionAngle);

  // Reposition ball to prevent multiple collision triggers
  const paddleBounds = paddle.getBounds();
  if (direction > 0) {
    // Ball now moving right (hit left paddle), place right of paddle
    ball.x = paddleBounds.right + ball.radius + 1;
  } else {
    // Ball now moving left (hit right paddle), place left of paddle
    ball.x = paddleBounds.left - ball.radius - 1;
  }

  // Increase ball speed after successful paddle hit
  ball.increaseSpeed();
}

/**
 * Check if ball has crossed scoring boundaries
 * @param {Ball} ball - The ball object
 * @param {number} canvasWidth - Width of the canvas
 * @returns {string|null} 'player' if player scores, 'cpu' if cpu scores, null otherwise
 */
function checkScore(ball, canvasWidth) {
  const bounds = ball.getBounds();

  // Ball passed left edge - CPU scores
  if (bounds.right < 0) {
    return 'cpu';
  }

  // Ball passed right edge - Player scores
  if (bounds.left > canvasWidth) {
    return 'player';
  }

  return null;
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkPaddleCollision,
    resolvePaddleCollision,
    checkScore
  };
}
