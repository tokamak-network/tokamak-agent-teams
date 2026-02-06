/**
 * ball.js — Ball entity and physics
 *
 * Maintains ball position, velocity, and implements ball physics
 * including wall collisions and speed management.
 *
 * Exports: Ball class with update(), reset(), increaseSpeed(), getBounds(), render()
 */

// Constants
const BALL_RADIUS = 8;
const BALL_INITIAL_SPEED = 5;
const BALL_MAX_SPEED = 12;
const BALL_SPEED_INCREMENT = 0.3; // pixels/frame per paddle hit (SPEC requirement)

/**
 * Ball class
 */
class Ball {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = BALL_RADIUS;
  }

  /**
   * Advances ball position by its velocity each frame.
   * Checks for top/bottom wall collisions and reverses vy accordingly.
   */
  update() {
    this.x += this.vx;
    this.y += this.vy;

    // Check for top wall collision
    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy); // Bounce down
    }

    // Check for bottom wall collision
    if (this.y + this.radius >= this.canvasHeight) {
      this.y = this.canvasHeight - this.radius;
      this.vy = -Math.abs(this.vy); // Bounce up
    }
  }

  /**
   * Places ball at center of the court.
   * Sets vx to BALL_INITIAL_SPEED in the given direction and vy to a small random value.
   * @param {number} directionX - Direction for horizontal velocity (-1 or 1)
   */
  reset(directionX) {
    this.x = this.canvasWidth / 2;
    this.y = this.canvasHeight / 2;
    this.vx = BALL_INITIAL_SPEED * (directionX || 1);
    this.vy = (Math.random() * 4) - 2; // Random value between -2 and 2
  }

  /**
   * Multiplies the velocity magnitude by the increment factor, capping at BALL_MAX_SPEED.
   */
  increaseSpeed() {
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const newSpeed = Math.min(currentSpeed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);

    if (currentSpeed > 0) {
      const ratio = newSpeed / currentSpeed;
      this.vx *= ratio;
      this.vy *= ratio;
    }
  }

  /**
   * Returns the bounding box for collision detection.
   * @returns {{left: number, right: number, top: number, bottom: number}}
   */
  getBounds() {
    return {
      left: this.x - this.radius,
      right: this.x + this.radius,
      top: this.y - this.radius,
      bottom: this.y + this.radius
    };
  }

  /**
   * Draws the ball as a filled white circle with glow effect.
   * @deprecated Use Renderer.drawBall(ctx, ball) instead for centralized rendering.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Ball, BALL_RADIUS, BALL_INITIAL_SPEED, BALL_MAX_SPEED, BALL_SPEED_INCREMENT };
}
