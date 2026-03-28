import Phaser from 'phaser';

interface LogoMarkBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MARK_COLOR = 0x2f5369;

export function drawHomeLogoMark(
  graphics: Phaser.GameObjects.Graphics,
  bounds: LogoMarkBounds,
): void {
  const cx = bounds.x + bounds.width * 0.5;
  const cy = bounds.y + bounds.height * 0.53;
  const scale = Math.min(bounds.width / 56, bounds.height / 42);

  const torsoTop = { x: cx, y: cy - 12 * scale };
  const torsoBottom = { x: cx, y: cy + 3 * scale };

  const leftHand = { x: cx - 12.5 * scale, y: cy - 5.5 * scale };
  const rightHand = { x: cx + 12.5 * scale, y: cy - 5.5 * scale };

  const leftKnee = { x: cx - 4.2 * scale, y: cy + 12 * scale };
  const rightKnee = { x: cx + 4.2 * scale, y: cy + 12 * scale };
  const leftFoot = { x: cx - 7.3 * scale, y: cy + 18.3 * scale };
  const rightFoot = { x: cx + 7.3 * scale, y: cy + 18.3 * scale };

  const limbW = Math.max(4, 5.2 * scale);
  const torsoW = Math.max(5, 6.2 * scale);
  const footW = Math.max(4, 4.8 * scale);
  const footLen = Math.max(7, 8.6 * scale);

  drawCapsule(graphics, torsoTop, torsoBottom, torsoW, MARK_COLOR);
  drawCapsule(graphics, torsoTop, leftHand, limbW, MARK_COLOR);
  drawCapsule(graphics, torsoTop, rightHand, limbW, MARK_COLOR);
  drawCapsule(graphics, torsoBottom, leftKnee, limbW, MARK_COLOR);
  drawCapsule(graphics, torsoBottom, rightKnee, limbW, MARK_COLOR);

  drawFoot(graphics, leftFoot, -1, footLen, footW, MARK_COLOR);
  drawFoot(graphics, rightFoot, 1, footLen, footW, MARK_COLOR);

  graphics.fillStyle(MARK_COLOR, 1);
  graphics.fillCircle(cx, cy - 18.4 * scale, Math.max(5.5, 6.6 * scale));
}

function drawFoot(
  graphics: Phaser.GameObjects.Graphics,
  center: { x: number; y: number },
  dir: -1 | 1,
  length: number,
  width: number,
  color: number,
): void {
  const start = { x: center.x - length * 0.5 * dir, y: center.y };
  const end = { x: center.x + length * 0.5 * dir, y: center.y };
  drawCapsule(graphics, start, end, width, color);
}

function drawCapsule(
  graphics: Phaser.GameObjects.Graphics,
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  color: number,
): void {
  graphics.lineStyle(width, color, 1);
  graphics.beginPath();
  graphics.moveTo(start.x, start.y);
  graphics.lineTo(end.x, end.y);
  graphics.strokePath();

  const radius = width * 0.5;
  graphics.fillStyle(color, 1);
  graphics.fillCircle(start.x, start.y, radius);
  graphics.fillCircle(end.x, end.y, radius);
}
