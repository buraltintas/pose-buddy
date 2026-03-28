import type {
  JointName,
  NormalizedPose,
  Point,
  Pose,
  RigSettings,
  Side,
} from '../models/pose';
import { add, clampLength, clonePoint, normalize, scale, sub } from './math';
import { solveTwoBoneJoint } from './twoBone';

interface LimbRenderData {
  chestHub: Point;
  leftShoulder: Point;
  rightShoulder: Point;
  leftKnee: Point;
  rightKnee: Point;
}

interface ArmState {
  elbow: Point;
  hand: Point;
}

interface LegState {
  knee: Point;
  foot: Point;
}

type ArmControlMode = 'ikFromHand' | 'handAroundElbow' | 'elbowAroundShoulder';
type LegControlMode = 'ikFromFoot' | 'footAroundKnee' | 'kneeAroundHip';

const DEFAULT_SETTINGS: RigSettings = {
  torsoLength: 148,
  headLength: 60,
  shoulderOffset: 22,
  upperArmLength: 66,
  lowerArmLength: 66,
  upperLegLength: 92,
  lowerLegLength: 92,
};

export class PoseRig {
  public readonly settings: RigSettings;

  private hip: Point;
  private neck: Point;
  private headDir: Point;
  private arms: Record<Side, ArmState>;
  private armControl: Record<Side, ArmControlMode>;
  private legs: Record<Side, LegState>;
  private legControl: Record<Side, LegControlMode>;
  private bendSign: Record<Side, number>;

  constructor(origin: Point, settings: Partial<RigSettings> = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.hip = clonePoint(origin);
    this.neck = clonePoint(origin);
    this.headDir = { x: 0, y: -1 };
    this.arms = {
      left: {
        elbow: clonePoint(origin),
        hand: clonePoint(origin),
      },
      right: {
        elbow: clonePoint(origin),
        hand: clonePoint(origin),
      },
    };
    this.armControl = {
      left: 'ikFromHand',
      right: 'ikFromHand',
    };
    this.legs = {
      left: {
        knee: clonePoint(origin),
        foot: clonePoint(origin),
      },
      right: {
        knee: clonePoint(origin),
        foot: clonePoint(origin),
      },
    };
    this.legControl = {
      left: 'ikFromFoot',
      right: 'ikFromFoot',
    };
    this.bendSign = { left: 1, right: -1 };

    this.applyNeutralPose(origin);
  }

  public reset(origin: Point): void {
    this.applyNeutralPose(origin);
  }

  public dragJoint(joint: JointName, target: Point): void {
    switch (joint) {
      case 'hip':
        this.dragHip(target);
        break;
      case 'neck':
        this.dragNeck();
        break;
      case 'head':
        this.dragHead(target);
        break;
      case 'leftElbow':
        this.dragElbow('left', target);
        break;
      case 'rightElbow':
        this.dragElbow('right', target);
        break;
      case 'leftHand':
        this.dragHand('left', target);
        break;
      case 'rightHand':
        this.dragHand('right', target);
        break;
      case 'leftFoot':
        this.dragLegLower('left', target);
        break;
      case 'rightFoot':
        this.dragLegLower('right', target);
        break;
      default:
        break;
    }

    this.stabilize();
  }

  public dragArmLower(side: Side, target: Point): void {
    this.dragHand(side, target);
    this.stabilize();
  }

  public dragArmUpper(side: Side, target: Point): void {
    this.dragElbow(side, target);
    this.stabilize();
  }

  public dragLegLower(side: Side, target: Point): void {
    this.dragFoot(side, target);
    this.stabilize();
  }

  public dragLegUpper(side: Side, target: Point): void {
    this.dragKnee(side, target);
    this.stabilize();
  }

  public getPose(): Pose {
    return {
      hip: clonePoint(this.hip),
      neck: clonePoint(this.neck),
      head: this.getHead(),
      leftElbow: clonePoint(this.arms.left.elbow),
      leftHand: clonePoint(this.arms.left.hand),
      rightElbow: clonePoint(this.arms.right.elbow),
      rightHand: clonePoint(this.arms.right.hand),
      leftFoot: clonePoint(this.legs.left.foot),
      rightFoot: clonePoint(this.legs.right.foot),
    };
  }

  public getNormalizedPose(): NormalizedPose {
    const current = this.getPose();
    const invTorso = 1 / this.settings.torsoLength;

    return {
      hip: { x: 0, y: 0 },
      neck: normalizeJoint(current.neck, current.hip, invTorso),
      head: normalizeJoint(current.head, current.hip, invTorso),
      leftElbow: normalizeJoint(current.leftElbow, current.hip, invTorso),
      leftHand: normalizeJoint(current.leftHand, current.hip, invTorso),
      rightElbow: normalizeJoint(current.rightElbow, current.hip, invTorso),
      rightHand: normalizeJoint(current.rightHand, current.hip, invTorso),
      leftFoot: normalizeJoint(current.leftFoot, current.hip, invTorso),
      rightFoot: normalizeJoint(current.rightFoot, current.hip, invTorso),
    };
  }

  public applyNormalizedPose(pose: NormalizedPose, origin?: Point): void {
    if (origin) {
      this.hip = clonePoint(origin);
    }

    const toWorld = (joint: Point): Point => ({
      x: this.hip.x + joint.x * this.settings.torsoLength,
      y: this.hip.y + joint.y * this.settings.torsoLength,
    });

    this.neck = toWorld(pose.neck);
    this.headDir = normalize(sub(toWorld(pose.head), this.neck));

    this.arms.left.elbow = toWorld(pose.leftElbow);
    this.arms.left.hand = toWorld(pose.leftHand);
    this.arms.right.elbow = toWorld(pose.rightElbow);
    this.arms.right.hand = toWorld(pose.rightHand);

    this.legs.left.foot = toWorld(pose.leftFoot);
    this.legs.right.foot = toWorld(pose.rightFoot);

    this.armControl.left = 'ikFromHand';
    this.armControl.right = 'ikFromHand';
    this.legControl.left = 'ikFromFoot';
    this.legControl.right = 'ikFromFoot';

    this.stabilize();
  }

  public getLimbRenderData(): LimbRenderData {
    const chestHub = this.getChestHub();
    const shoulders = this.getShoulders();

    return {
      chestHub,
      leftShoulder: shoulders.left,
      rightShoulder: shoulders.right,
      leftKnee: clonePoint(this.legs.left.knee),
      rightKnee: clonePoint(this.legs.right.knee),
    };
  }

  private getHead(): Point {
    return add(this.neck, scale(this.headDir, this.settings.headLength));
  }

  private dragHip(target: Point): void {
    const delta = sub(target, this.hip);
    this.hip = add(this.hip, delta);
    this.neck = add(this.neck, delta);
    this.arms.left.elbow = add(this.arms.left.elbow, delta);
    this.arms.left.hand = add(this.arms.left.hand, delta);
    this.arms.right.elbow = add(this.arms.right.elbow, delta);
    this.arms.right.hand = add(this.arms.right.hand, delta);
    this.legs.left.knee = add(this.legs.left.knee, delta);
    this.legs.left.foot = add(this.legs.left.foot, delta);
    this.legs.right.knee = add(this.legs.right.knee, delta);
    this.legs.right.foot = add(this.legs.right.foot, delta);
  }

  private dragNeck(): void {
    this.neck = { x: this.hip.x, y: this.hip.y - this.settings.torsoLength };

    const leftTarget = clonePoint(this.arms.left.hand);
    const rightTarget = clonePoint(this.arms.right.hand);

    this.solveArmFromHand('left', leftTarget);
    this.solveArmFromHand('right', rightTarget);
    this.armControl.left = 'ikFromHand';
    this.armControl.right = 'ikFromHand';
  }

  private dragHead(target: Point): void {
    const fromNeck = sub(target, this.neck);
    this.headDir = normalize(fromNeck);
  }

  private dragElbow(side: Side, target: Point): void {
    const shoulder = this.getShoulders()[side];
    const handOffsetFromElbow = sub(
      this.arms[side].hand,
      this.arms[side].elbow,
    );
    const clamped = add(
      shoulder,
      scale(normalize(sub(target, shoulder)), this.settings.upperArmLength),
    );
    this.arms[side].elbow = clamped;

    const currentHandDir = normalize(handOffsetFromElbow);
    this.arms[side].hand = add(
      clamped,
      scale(currentHandDir, this.settings.lowerArmLength),
    );
    this.armControl[side] = 'elbowAroundShoulder';
  }

  private dragHand(side: Side, target: Point): void {
    const elbow = this.arms[side].elbow;
    const handDir = normalize(sub(target, elbow));
    this.arms[side].hand = add(
      elbow,
      scale(handDir, this.settings.lowerArmLength),
    );
    this.armControl[side] = 'handAroundElbow';
  }

  private dragFoot(side: Side, target: Point): void {
    const knee = this.legs[side].knee;
    const footDir = normalize(sub(target, knee));
    this.legs[side].foot = add(
      knee,
      scale(footDir, this.settings.lowerLegLength),
    );
    this.legControl[side] = 'footAroundKnee';
  }

  private dragKnee(side: Side, target: Point): void {
    const footOffset = sub(this.legs[side].foot, this.legs[side].knee);
    const kneeDir = normalize(sub(target, this.hip));
    this.legs[side].knee = add(
      this.hip,
      scale(kneeDir, this.settings.upperLegLength),
    );

    const footDir = normalize(footOffset);
    this.legs[side].foot = add(
      this.legs[side].knee,
      scale(footDir, this.settings.lowerLegLength),
    );
    this.legControl[side] = 'kneeAroundHip';
  }

  private solveLegFromFoot(side: Side, footTarget: Point): void {
    const maxReach =
      this.settings.upperLegLength + this.settings.lowerLegLength - 1;
    const clampedFoot = add(
      this.hip,
      clampLength(sub(footTarget, this.hip), maxReach),
    );

    this.legs[side].foot = clampedFoot;
    this.legs[side].knee = solveTwoBoneJoint(
      this.hip,
      clampedFoot,
      this.settings.upperLegLength,
      this.settings.lowerLegLength,
      this.bendSign[side],
    );
  }

  private solveArmFromHand(side: Side, handTarget: Point): void {
    const shoulder = this.getShoulders()[side];
    const maxReach =
      this.settings.upperArmLength + this.settings.lowerArmLength - 1;
    const clampedHand = add(
      shoulder,
      clampLength(sub(handTarget, shoulder), maxReach),
    );

    this.arms[side].hand = clampedHand;
    this.arms[side].elbow = solveTwoBoneJoint(
      shoulder,
      clampedHand,
      this.settings.upperArmLength,
      this.settings.lowerArmLength,
      this.bendSign[side],
    );
  }

  private stabilize(): void {
    this.neck = { x: this.hip.x, y: this.hip.y - this.settings.torsoLength };

    this.headDir = normalize(this.headDir);

    this.stabilizeArm('left');
    this.stabilizeArm('right');
    this.stabilizeLeg('left');
    this.stabilizeLeg('right');
  }

  private stabilizeArm(side: Side): void {
    if (this.armControl[side] === 'handAroundElbow') {
      const elbow = this.arms[side].elbow;
      const handDir = normalize(sub(this.arms[side].hand, elbow));
      this.arms[side].hand = add(
        elbow,
        scale(handDir, this.settings.lowerArmLength),
      );
      return;
    }

    if (this.armControl[side] === 'elbowAroundShoulder') {
      const shoulder = this.getShoulders()[side];
      const elbowDir = normalize(sub(this.arms[side].elbow, shoulder));
      this.arms[side].elbow = add(
        shoulder,
        scale(elbowDir, this.settings.upperArmLength),
      );

      const handDir = normalize(
        sub(this.arms[side].hand, this.arms[side].elbow),
      );
      this.arms[side].hand = add(
        this.arms[side].elbow,
        scale(handDir, this.settings.lowerArmLength),
      );
      return;
    }

    const hand = clonePoint(this.arms[side].hand);
    this.solveArmFromHand(side, hand);
  }

  private stabilizeLeg(side: Side): void {
    if (this.legControl[side] === 'footAroundKnee') {
      const kneeDir = normalize(sub(this.legs[side].knee, this.hip));
      this.legs[side].knee = add(
        this.hip,
        scale(kneeDir, this.settings.upperLegLength),
      );

      const footDir = normalize(
        sub(this.legs[side].foot, this.legs[side].knee),
      );
      this.legs[side].foot = add(
        this.legs[side].knee,
        scale(footDir, this.settings.lowerLegLength),
      );
      return;
    }

    if (this.legControl[side] === 'kneeAroundHip') {
      const kneeDir = normalize(sub(this.legs[side].knee, this.hip));
      this.legs[side].knee = add(
        this.hip,
        scale(kneeDir, this.settings.upperLegLength),
      );

      const footDir = normalize(
        sub(this.legs[side].foot, this.legs[side].knee),
      );
      this.legs[side].foot = add(
        this.legs[side].knee,
        scale(footDir, this.settings.lowerLegLength),
      );
      return;
    }

    const foot = clonePoint(this.legs[side].foot);
    this.solveLegFromFoot(side, foot);
  }

  private applyNeutralPose(origin: Point): void {
    this.hip = clonePoint(origin);
    this.neck = { x: origin.x, y: origin.y - this.settings.torsoLength };
    this.headDir = { x: 0, y: -1 };

    const shoulders = this.getShoulders();
    const armReach =
      this.settings.upperArmLength + this.settings.lowerArmLength - 1;
    const armSideOffset = this.settings.upperArmLength * 0.22;
    const armDownOffset = armReach * 0.92;

    this.solveArmFromHand('left', {
      x: shoulders.left.x - armSideOffset,
      y: shoulders.left.y + armDownOffset,
    });
    this.solveArmFromHand('right', {
      x: shoulders.right.x + armSideOffset,
      y: shoulders.right.y + armDownOffset,
    });
    this.armControl.left = 'ikFromHand';
    this.armControl.right = 'ikFromHand';

    this.legs.left.knee = {
      x: this.hip.x - this.settings.upperLegLength * 0.2,
      y: this.hip.y + this.settings.upperLegLength * 0.97,
    };
    this.legs.right.knee = {
      x: this.hip.x + this.settings.upperLegLength * 0.2,
      y: this.hip.y + this.settings.upperLegLength * 0.97,
    };

    this.legs.left.foot = {
      x: this.legs.left.knee.x - this.settings.lowerLegLength * 0.1,
      y: this.legs.left.knee.y + this.settings.lowerLegLength * 0.98,
    };
    this.legs.right.foot = {
      x: this.legs.right.knee.x + this.settings.lowerLegLength * 0.1,
      y: this.legs.right.knee.y + this.settings.lowerLegLength * 0.98,
    };

    this.legControl.left = 'kneeAroundHip';
    this.legControl.right = 'kneeAroundHip';

    this.stabilize();
  }

  private getChestHub(): Point {
    const torsoDir = normalize(sub(this.hip, this.neck));
    return add(this.neck, scale(torsoDir, this.settings.shoulderOffset));
  }

  private getShoulders(): Record<Side, Point> {
    const hub = this.getChestHub();

    return {
      left: clonePoint(hub),
      right: clonePoint(hub),
    };
  }
}

function normalizeJoint(joint: Point, hip: Point, invTorso: number): Point {
  const offset = sub(joint, hip);
  return { x: offset.x * invTorso, y: offset.y * invTorso };
}
