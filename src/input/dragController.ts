import Phaser from 'phaser';
import type { JointName, Point, Side } from '../models/pose';
import { PoseRig } from '../rig/poseRig';

interface DragCallbacks {
  onDragStart?: (joint: JointName) => void;
  onDragEnd?: () => void;
}

type DragManipulator =
  | { key: 'head'; joint: JointName }
  | { key: 'hand'; side: Side; joint: JointName }
  | { key: 'foot'; side: Side; joint: JointName }
  | { key: 'lowerArm'; side: Side; joint: JointName }
  | { key: 'lowerLeg'; side: Side; joint: JointName }
  | { key: 'upperArm'; side: Side; joint: JointName }
  | { key: 'upperLeg'; side: Side; joint: JointName }
  | { key: 'knee'; side: Side; joint: JointName }
  | { key: 'elbow'; side: Side; joint: JointName };

export class DragController {
  private scene: Phaser.Scene;
  private rig: PoseRig;
  private activeManipulator: DragManipulator | null;
  private enabled: boolean;
  private callbacks: DragCallbacks;

  constructor(
    scene: Phaser.Scene,
    rig: PoseRig,
    callbacks: DragCallbacks = {},
  ) {
    this.scene = scene;
    this.rig = rig;
    this.activeManipulator = null;
    this.enabled = true;
    this.callbacks = callbacks;

    this.registerInput();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.activeManipulator = null;
    }
  }

  public setRig(rig: PoseRig): void {
    this.rig = rig;
    this.activeManipulator = null;
  }

  private registerInput(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.enabled) {
        return;
      }

      const manipulator = this.findManipulator({
        x: pointer.worldX,
        y: pointer.worldY,
      });
      if (!manipulator) {
        return;
      }

      this.activeManipulator = manipulator;
      this.callbacks.onDragStart?.(manipulator.joint);
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.enabled || !this.activeManipulator || !pointer.isDown) {
        return;
      }

      this.applyManipulator(this.activeManipulator, {
        x: pointer.worldX,
        y: pointer.worldY,
      });
    });

    const endDrag = (): void => {
      if (!this.activeManipulator) {
        return;
      }

      this.activeManipulator = null;
      this.callbacks.onDragEnd?.();
    };

    this.scene.input.on('pointerup', endDrag);
    this.scene.input.on('pointerupoutside', endDrag);
  }

  private findManipulator(pointer: Point): DragManipulator | null {
    const pose = this.rig.getPose();
    const limb = this.rig.getLimbRenderData();

    const hand = this.pickPoint(pointer, 42, [
      {
        point: pose.leftHand,
        manipulator: { key: 'hand', side: 'left', joint: 'leftHand' },
      },
      {
        point: pose.rightHand,
        manipulator: { key: 'hand', side: 'right', joint: 'rightHand' },
      },
    ]);
    if (hand) {
      return hand;
    }

    const foot = this.pickPoint(pointer, 44, [
      {
        point: pose.leftFoot,
        manipulator: { key: 'foot', side: 'left', joint: 'leftFoot' },
      },
      {
        point: pose.rightFoot,
        manipulator: { key: 'foot', side: 'right', joint: 'rightFoot' },
      },
    ]);
    if (foot) {
      return foot;
    }

    const lowerArm = this.pickSegment(
      pointer,
      42,
      [
        {
          a: pose.leftElbow,
          b: pose.leftHand,
          manipulator: { key: 'lowerArm', side: 'left', joint: 'leftHand' },
        },
        {
          a: pose.rightElbow,
          b: pose.rightHand,
          manipulator: { key: 'lowerArm', side: 'right', joint: 'rightHand' },
        },
      ],
      0.18,
      1,
    );
    if (lowerArm) {
      return lowerArm;
    }

    const lowerLeg = this.pickSegment(
      pointer,
      42,
      [
        {
          a: limb.leftKnee,
          b: pose.leftFoot,
          manipulator: { key: 'lowerLeg', side: 'left', joint: 'leftFoot' },
        },
        {
          a: limb.rightKnee,
          b: pose.rightFoot,
          manipulator: { key: 'lowerLeg', side: 'right', joint: 'rightFoot' },
        },
      ],
      0.18,
      1,
    );
    if (lowerLeg) {
      return lowerLeg;
    }

    const upperArm = this.pickSegment(
      pointer,
      44,
      [
        {
          a: limb.chestHub,
          b: pose.leftElbow,
          manipulator: { key: 'upperArm', side: 'left', joint: 'leftElbow' },
        },
        {
          a: limb.chestHub,
          b: pose.rightElbow,
          manipulator: { key: 'upperArm', side: 'right', joint: 'rightElbow' },
        },
      ],
      0,
      0.92,
    );
    if (upperArm) {
      return upperArm;
    }

    const upperLeg = this.pickSegment(
      pointer,
      44,
      [
        {
          a: pose.hip,
          b: limb.leftKnee,
          manipulator: { key: 'upperLeg', side: 'left', joint: 'leftFoot' },
        },
        {
          a: pose.hip,
          b: limb.rightKnee,
          manipulator: { key: 'upperLeg', side: 'right', joint: 'rightFoot' },
        },
      ],
      0,
      0.92,
    );
    if (upperLeg) {
      return upperLeg;
    }

    const torso = this.pickSegment(
      pointer,
      30,
      [
        {
          a: pose.head,
          b: pose.neck,
          manipulator: { key: 'head', joint: 'head' },
        },
      ],
      0,
      1,
    );
    if (torso) {
      return torso;
    }

    const elbowFallback = this.pickPoint(pointer, 18, [
      {
        point: pose.leftElbow,
        manipulator: { key: 'elbow', side: 'left', joint: 'leftElbow' },
      },
      {
        point: pose.rightElbow,
        manipulator: { key: 'elbow', side: 'right', joint: 'rightElbow' },
      },
    ]);
    if (elbowFallback) {
      return elbowFallback;
    }

    const kneeFallback = this.pickPoint(pointer, 18, [
      {
        point: limb.leftKnee,
        manipulator: { key: 'knee', side: 'left', joint: 'leftFoot' },
      },
      {
        point: limb.rightKnee,
        manipulator: { key: 'knee', side: 'right', joint: 'rightFoot' },
      },
    ]);
    if (kneeFallback) {
      return kneeFallback;
    }

    return this.pickPoint(pointer, 14, [
      { point: pose.head, manipulator: { key: 'head', joint: 'head' } },
    ]);
  }

  private applyManipulator(manipulator: DragManipulator, pointer: Point): void {
    switch (manipulator.key) {
      case 'hand':
      case 'lowerArm':
        this.rig.dragArmLower(manipulator.side, pointer);
        break;
      case 'upperArm':
      case 'elbow':
        this.rig.dragArmUpper(manipulator.side, pointer);
        break;
      case 'foot':
      case 'lowerLeg':
        this.rig.dragLegLower(manipulator.side, pointer);
        break;
      case 'upperLeg':
      case 'knee':
        this.rig.dragLegUpper(manipulator.side, pointer);
        break;
      case 'head':
        this.rig.dragJoint('head', pointer);
        break;
      default:
        break;
    }
  }

  private pickPoint<T extends DragManipulator>(
    pointer: Point,
    threshold: number,
    candidates: Array<{ point: Point; manipulator: T }>,
  ): T | null {
    const thresholdSq = threshold * threshold;
    let best: T | null = null;
    let bestSq = thresholdSq;

    for (const candidate of candidates) {
      const dx = candidate.point.x - pointer.x;
      const dy = candidate.point.y - pointer.y;
      const dSq = dx * dx + dy * dy;
      if (dSq <= bestSq) {
        bestSq = dSq;
        best = candidate.manipulator;
      }
    }

    return best;
  }

  private pickSegment<T extends DragManipulator>(
    pointer: Point,
    threshold: number,
    segments: Array<{ a: Point; b: Point; manipulator: T }>,
    minT: number,
    maxT: number,
  ): T | null {
    let best: T | null = null;
    let minDist = threshold;

    for (const segment of segments) {
      const hit = distancePointToSegment(pointer, segment.a, segment.b);
      if (hit.t < minT || hit.t > maxT) {
        continue;
      }

      if (hit.distance <= minDist) {
        minDist = hit.distance;
        best = segment.manipulator;
      }
    }

    return best;
  }
}

function distancePointToSegment(
  p: Point,
  a: Point,
  b: Point,
): { distance: number; t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq < 1e-6) {
    return { distance: Math.hypot(apx, apy), t: 0 };
  }

  const t = Phaser.Math.Clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  return {
    distance: Math.hypot(p.x - cx, p.y - cy),
    t,
  };
}
