/**
 * paddle.js — Paddle entity
 *
 * Maintains paddle position, dimensions, and movement direction.
 *
 * Exports: Paddle class with update(), setDirection(), getBounds(), getCenterY(),
 *          getCollisionAngle(), render()
 */

// Constants
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const PADDLE_SPEED = 6;
const PADDLE_MARGIN = 20;

/**
 * Paddle class
 */
class Paddle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = PADDLE_WIDTH;
    this.height = PADDLE_HEIGHT;
    this.speed = PADDLE_SPEED;
    this.direction = 0; // -1 (up), 0 (none), 1 (down)
  }

  /**
   * Moves the paddle up or down based on current input state.
   * Clamps position so the paddle stays within the canvas bounds.
   * @param {number} canvasHeight - Height of the canvas
   */
  update(canvasHeight) {
    this.y += this.direction * this.speed;

    // Clamp to canvas bounds
    if (this.y < 0) {
      this.y = 0;
    }
    if (this.y + this.height > canvasHeight) {
      this.y = canvasHeight - this.height;
    }
  }

  /**
   * Sets current movement direction.
   * @param {number} dir - Direction: -1 (up), 0 (none), 1 (down)
   */
  setDirection(dir) {
    this.direction = dir;
  }

  /**
   * Returns the bounding box for collision detection.
   * @returns {{left: number, right: number, top: number, bottom: number}}
   */
  getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  }

  /**
   * Returns the vertical center of the paddle (used by AI targeting).
   * @returns {number}
   */
  getCenterY() {
    return this.y + this.height / 2;
  }

  /**
   * Given the ball's Y position, returns a normalized value from -1 to 1
   * representing where on the paddle the ball hit.
   * -1 is the top edge, 0 is center, 1 is the bottom edge.
   * @param {number} ballY - The Y position of the ball
   * @returns {number}
   */
  getCollisionAngle(ballY) {
    const paddleCenter = this.getCenterY();
    const relativeIntersectY = ballY - paddleCenter;
    const normalizedIntersect = relativeIntersectY / (this.height / 2);

    // Clamp to [-1, 1]
    return Math.max(-1, Math.min(1, normalizedIntersect));
  }

  /**
   * Draws the paddle as a filled white rectangle with slightly rounded corners.
   * @deprecated Use Renderer.drawPaddle(ctx, paddle) instead for centralized rendering.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();

    // Use roundRect if available, otherwise fall back to regular rect
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(this.x, this.y, this.width, this.height, 2);
    } else {
      // Fallback for older browsers
      ctx.rect(this.x, this.y, this.width, this.height);
    }

    ctx.fill();
  }
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Paddle, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED, PADDLE_MARGIN };
}
