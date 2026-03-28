import type { Point } from '../models/pose';
import {
  add,
  clampLength,
  distance,
  normalize,
  perpendicular,
  scale,
  sub,
} from './math';

const EPS = 1e-6;

export function solveTwoBoneJoint(
  start: Point,
  end: Point,
  firstLength: number,
  secondLength: number,
  bendSign: number,
): Point {
  const toEnd = sub(end, start);
  const d = Math.max(distance(start, end), EPS);
  const maxReach = firstLength + secondLength - EPS;
  const clampedEnd = add(start, clampLength(toEnd, maxReach));
  const dir = normalize(sub(clampedEnd, start));
  const clampedDistance = Math.max(Math.min(d, maxReach), EPS);

  const a =
    (firstLength * firstLength -
      secondLength * secondLength +
      clampedDistance * clampedDistance) /
    (2 * clampedDistance);

  const heightSq = Math.max(firstLength * firstLength - a * a, 0);
  const h = Math.sqrt(heightSq);
  const mid = add(start, scale(dir, a));
  const side = perpendicular(dir);
  const bend = bendSign >= 0 ? 1 : -1;

  return add(mid, scale(side, h * bend));
}
