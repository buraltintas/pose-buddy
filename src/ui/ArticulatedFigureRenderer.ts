import Phaser from 'phaser';
import type { JointName, Pose, Point } from '../models/pose';

interface RigRenderData {
  chestHub: Point;
  leftShoulder: Point;
  rightShoulder: Point;
  leftKnee: Point;
  rightKnee: Point;
}

interface RenderOptions {
  isTargetSilhouette: boolean;
  activeJoint?: JointName | null;
}

export class ArticulatedFigureRenderer {
  public draw(
    graphics: Phaser.GameObjects.Graphics,
    pose: Pose,
    rigData: RigRenderData,
    options: RenderOptions,
  ): void {
    graphics.clear();

    const color = options.isTargetSilhouette ? 0x2f475a : 0x375a73;
    const headColor = options.isTargetSilhouette ? 0x2f475a : 0x3e647e;
    const segmentWidth = options.isTargetSilhouette ? 10 : 18;

    const chest = rigData.chestHub;

    this.drawCapsule(
      graphics,
      pose.head,
      pose.neck,
      Math.max(7, segmentWidth - 4),
      color,
    );
    this.drawCapsule(graphics, pose.neck, chest, segmentWidth, color);
    this.drawCapsule(graphics, chest, pose.hip, segmentWidth + 1, color);

    this.drawCapsule(graphics, chest, pose.leftElbow, segmentWidth, color);
    this.drawCapsule(
      graphics,
      pose.leftElbow,
      pose.leftHand,
      segmentWidth,
      color,
    );

    this.drawCapsule(graphics, chest, pose.rightElbow, segmentWidth, color);
    this.drawCapsule(
      graphics,
      pose.rightElbow,
      pose.rightHand,
      segmentWidth,
      color,
    );

    this.drawCapsule(graphics, pose.hip, rigData.leftKnee, segmentWidth, color);
    this.drawCapsule(
      graphics,
      rigData.leftKnee,
      pose.leftFoot,
      segmentWidth,
      color,
    );

    this.drawCapsule(
      graphics,
      pose.hip,
      rigData.rightKnee,
      segmentWidth,
      color,
    );
    this.drawCapsule(
      graphics,
      rigData.rightKnee,
      pose.rightFoot,
      segmentWidth,
      color,
    );

    this.drawHeadDisc(
      graphics,
      pose.head,
      options.isTargetSilhouette ? 18 : 32,
      headColor,
    );
    this.drawFeetPieces(
      graphics,
      rigData.leftKnee,
      pose.leftFoot,
      rigData.rightKnee,
      pose.rightFoot,
      color,
      segmentWidth,
      options.isTargetSilhouette,
    );

    if (!options.isTargetSilhouette) {
      this.drawPivot(graphics, pose.neck, 8, options.activeJoint === 'neck');
      this.drawPivot(graphics, chest, 8, false);
      this.drawPivot(
        graphics,
        pose.leftElbow,
        8,
        options.activeJoint === 'leftElbow',
      );
      this.drawPivot(
        graphics,
        pose.rightElbow,
        8,
        options.activeJoint === 'rightElbow',
      );
      this.drawPivot(graphics, pose.hip, 9, false);
      this.drawPivot(graphics, rigData.leftKnee, 8, false);
      this.drawPivot(graphics, rigData.rightKnee, 8, false);
      this.drawPivot(
        graphics,
        pose.leftHand,
        7,
        options.activeJoint === 'leftHand',
      );
      this.drawPivot(
        graphics,
        pose.rightHand,
        7,
        options.activeJoint === 'rightHand',
      );
      this.drawPivot(
        graphics,
        pose.leftFoot,
        7,
        options.activeJoint === 'leftFoot',
      );
      this.drawPivot(
        graphics,
        pose.rightFoot,
        7,
        options.activeJoint === 'rightFoot',
      );

      if (options.activeJoint === 'head') {
        graphics.lineStyle(4, 0xf1b85c, 0.95);
        graphics.strokeCircle(pose.head.x, pose.head.y, 28);
      }
    }
  }

  private drawCapsule(
    graphics: Phaser.GameObjects.Graphics,
    start: Point,
    end: Point,
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

  private drawHeadDisc(
    graphics: Phaser.GameObjects.Graphics,
    head: Point,
    radius: number,
    color: number,
  ): void {
    graphics.fillStyle(color, 1);
    graphics.fillCircle(head.x, head.y, radius);
    graphics.lineStyle(2, 0xe8eef2, 0.6);
    graphics.strokeCircle(head.x, head.y, radius);
  }

  private drawFeetPieces(
    graphics: Phaser.GameObjects.Graphics,
    leftKnee: Point,
    leftFoot: Point,
    rightKnee: Point,
    rightFoot: Point,
    color: number,
    width: number,
    isTargetSilhouette: boolean,
  ): void {
    const leftDir = normalize(sub(leftFoot, leftKnee));
    const rightDir = normalize(sub(rightFoot, rightKnee));

    this.drawFootCap(
      graphics,
      leftFoot,
      leftDir,
      Math.max(11, width - 1),
      color,
      -1,
      isTargetSilhouette,
    );
    this.drawFootCap(
      graphics,
      rightFoot,
      rightDir,
      Math.max(11, width - 1),
      color,
      1,
      isTargetSilhouette,
    );
  }

  private drawFootCap(
    graphics: Phaser.GameObjects.Graphics,
    foot: Point,
    legDir: Point,
    width: number,
    color: number,
    sideSign: number,
    isTargetSilhouette: boolean,
  ): void {
    const horizontal = { x: sideSign, y: 0 };
    const legPerp = { x: -legDir.y, y: legDir.x };
    // Keep feet mostly horizontal while allowing slight articulation from leg pose.
    const axis = normalize(add(scale(horizontal, 0.9), scale(legPerp, 0.22)));

    const anchor = add(foot, scale(legDir, Math.max(3, width * 0.2)));
    const footLength = Math.max(26, width * 2.35);
    const footThickness = width;

    // Ankle connects near the heel side so the foot projects outward instead of centering on the pivot.
    const heel = add(anchor, scale(axis, -footLength * 0.14));
    const toe = add(anchor, scale(axis, footLength * 0.86));

    this.drawCapsule(
      graphics,
      foot,
      anchor,
      Math.max(7, footThickness - 2),
      color,
    );
    this.drawCapsule(graphics, heel, toe, footThickness, color);

    if (!isTargetSilhouette) {
      graphics.lineStyle(2, 0xe6edf2, 0.45);
      graphics.strokeCircle(
        anchor.x,
        anchor.y,
        Math.max(3, footThickness * 0.25),
      );
    }
  }

  private drawPivot(
    graphics: Phaser.GameObjects.Graphics,
    p: Point,
    radius: number,
    active: boolean,
  ): void {
    graphics.fillStyle(active ? 0xfff2db : 0xeceff2, 1);
    graphics.lineStyle(2, active ? 0xc78e3a : 0x304a5c, 0.95);
    graphics.fillCircle(p.x, p.y, radius);
    graphics.strokeCircle(p.x, p.y, radius);

    graphics.fillStyle(active ? 0xe0a651 : 0x647b8a, 0.9);
    graphics.fillCircle(p.x, p.y, Math.max(2, radius * 0.28));
  }
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: Point, scalar: number): Point {
  return { x: v.x * scalar, y: v.y * scalar };
}

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) {
    return { x: 0, y: 1 };
  }

  return { x: v.x / len, y: v.y / len };
}
