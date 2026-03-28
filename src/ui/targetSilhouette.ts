import type { NormalizedPose, Point, Pose } from '../models/pose';
import { solveTwoBoneJoint } from '../rig/twoBone';
import { ArticulatedFigureRenderer } from './ArticulatedFigureRenderer';
import { fitContentIntoRect } from './fitContent';

interface SilhouetteArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const renderer = new ArticulatedFigureRenderer();

export function drawTargetSilhouette(
  graphics: Phaser.GameObjects.Graphics,
  pose: NormalizedPose,
  area: SilhouetteArea,
): void {
  const joints = [
    pose.hip,
    pose.neck,
    pose.head,
    pose.leftElbow,
    pose.leftHand,
    pose.rightElbow,
    pose.rightHand,
    pose.leftFoot,
    pose.rightFoot,
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  joints.forEach((joint) => {
    minX = Math.min(minX, joint.x);
    minY = Math.min(minY, joint.y);
    maxX = Math.max(maxX, joint.x);
    maxY = Math.max(maxY, joint.y);
  });

  minX -= 0.42;
  maxX += 0.42;
  minY -= 0.9;
  maxY += 0.58;

  const contentWidth = Math.max(1e-6, maxX - minX);
  const contentHeight = Math.max(1e-6, maxY - minY);
  const fit = fitContentIntoRect(
    contentWidth,
    contentHeight,
    area,
    Math.max(2, Math.min(area.width, area.height) * 0.03),
  );
  const scale = fit.scale;
  const offsetX = fit.rect.x - minX * scale;
  const offsetY = fit.rect.y - minY * scale;

  const p = (joint: Point): Point => ({
    x: offsetX + joint.x * scale,
    y: offsetY + joint.y * scale,
  });

  const hip = p(pose.hip);
  const neck = p(pose.neck);
  const head = p(pose.head);
  const leftElbow = p(pose.leftElbow);
  const leftHand = p(pose.leftHand);
  const rightElbow = p(pose.rightElbow);
  const rightHand = p(pose.rightHand);
  const leftFoot = p(pose.leftFoot);
  const rightFoot = p(pose.rightFoot);

  const torsoLength = distance(hip, neck);
  const chestHub = moveToward(neck, hip, torsoLength * 0.15);
  const legLength = torsoLength * 1.26;
  const leftKnee = solveTwoBoneJoint(
    hip,
    leftFoot,
    legLength * 0.5,
    legLength * 0.5,
    1,
  );
  const rightKnee = solveTwoBoneJoint(
    hip,
    rightFoot,
    legLength * 0.5,
    legLength * 0.5,
    -1,
  );

  const mappedPose: Pose = {
    hip,
    neck,
    head,
    leftElbow,
    leftHand,
    rightElbow,
    rightHand,
    leftFoot,
    rightFoot,
  };

  renderer.draw(
    graphics,
    mappedPose,
    {
      chestHub,
      leftShoulder: chestHub,
      rightShoulder: chestHub,
      leftKnee,
      rightKnee,
    },
    { isTargetSilhouette: true },
  );
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveToward(start: Point, end: Point, len: number): Point {
  const v = { x: end.x - start.x, y: end.y - start.y };
  const d = Math.hypot(v.x, v.y);
  if (d < 1e-6) {
    return { ...end };
  }

  const t = len / d;
  return {
    x: start.x + v.x * t,
    y: start.y + v.y * t,
  };
}
