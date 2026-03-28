import type { JointName, NormalizedPose } from '../models/pose';
import { SCORE_JOINTS } from '../models/pose';

export interface PoseScore {
  score: number;
  percentage: number;
  perJointError: Record<JointName, number>;
}

const MAX_POSITION_ERROR = 0.6;
const POSITION_WEIGHT = 0.65;
const ANGLE_WEIGHT = 0.35;

const JOINT_WEIGHTS: Record<JointName, number> = {
  head: 1.2,
  neck: 1,
  leftHand: 1.3,
  rightHand: 1.3,
  leftElbow: 1,
  rightElbow: 1,
  hip: 0,
  leftFoot: 1.2,
  rightFoot: 1.2,
};

export function scorePose(
  current: NormalizedPose,
  target: NormalizedPose,
): PoseScore {
  const perJointError: Record<JointName, number> = {
    head: 0,
    neck: 0,
    leftHand: 0,
    rightHand: 0,
    leftElbow: 0,
    rightElbow: 0,
    hip: 0,
    leftFoot: 0,
    rightFoot: 0,
  };

  let weightedPositionError = 0;
  let weightTotal = 0;

  for (const joint of SCORE_JOINTS) {
    const dx = current[joint].x - target[joint].x;
    const dy = current[joint].y - target[joint].y;
    const error = Math.hypot(dx, dy);
    perJointError[joint] = error;

    const weight = JOINT_WEIGHTS[joint];
    weightedPositionError += Math.min(error, MAX_POSITION_ERROR) * weight;
    weightTotal += weight;
  }

  const normalizedPositionError =
    weightedPositionError / Math.max(weightTotal * MAX_POSITION_ERROR, 1e-6);
  const normalizedAngleError = getAngleError(current, target);
  const combinedError =
    POSITION_WEIGHT * normalizedPositionError +
    ANGLE_WEIGHT * normalizedAngleError;
  const score = Math.max(0, 1 - combinedError);

  return {
    score,
    percentage: Math.round(score * 100),
    perJointError,
  };
}

function getAngleError(
  current: NormalizedPose,
  target: NormalizedPose,
): number {
  const vectorsCurrent = [
    vector(current.hip, current.neck),
    vector(current.neck, current.head),
    vector(current.neck, current.leftElbow),
    vector(current.leftElbow, current.leftHand),
    vector(current.neck, current.rightElbow),
    vector(current.rightElbow, current.rightHand),
    vector(current.hip, current.leftFoot),
    vector(current.hip, current.rightFoot),
  ];

  const vectorsTarget = [
    vector(target.hip, target.neck),
    vector(target.neck, target.head),
    vector(target.neck, target.leftElbow),
    vector(target.leftElbow, target.leftHand),
    vector(target.neck, target.rightElbow),
    vector(target.rightElbow, target.rightHand),
    vector(target.hip, target.leftFoot),
    vector(target.hip, target.rightFoot),
  ];

  let sum = 0;
  for (let i = 0; i < vectorsCurrent.length; i += 1) {
    const a = Math.atan2(vectorsCurrent[i].y, vectorsCurrent[i].x);
    const b = Math.atan2(vectorsTarget[i].y, vectorsTarget[i].x);
    sum += angleDiff(a, b) / Math.PI;
  }

  return sum / vectorsCurrent.length;
}

function vector(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  return { x: b.x - a.x, y: b.y - a.y };
}

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b);
  while (d > Math.PI) {
    d = Math.abs(d - Math.PI * 2);
  }

  return d;
}
