import type { Point } from '../models/pose';

const EPS = 1e-6;

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Point, scalar: number): Point {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function length(v: Point): number {
  return Math.hypot(v.x, v.y);
}

export function distance(a: Point, b: Point): number {
  return length(sub(a, b));
}

export function normalize(v: Point): Point {
  const len = length(v);
  if (len < EPS) {
    return { x: 0, y: -1 };
  }

  return { x: v.x / len, y: v.y / len };
}

export function perpendicular(v: Point): Point {
  return { x: -v.y, y: v.x };
}

export function clampLength(v: Point, maxLen: number): Point {
  const len = length(v);
  if (len <= maxLen) {
    return { ...v };
  }

  const ratio = maxLen / Math.max(len, EPS);
  return scale(v, ratio);
}

export function fromAngle(angleRad: number): Point {
  return { x: Math.cos(angleRad), y: Math.sin(angleRad) };
}

export function clonePoint(p: Point): Point {
  return { x: p.x, y: p.y };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
