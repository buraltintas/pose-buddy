export type JointName =
  | 'head'
  | 'neck'
  | 'leftHand'
  | 'rightHand'
  | 'leftElbow'
  | 'rightElbow'
  | 'hip'
  | 'leftFoot'
  | 'rightFoot';

export type Side = 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export type Pose = Record<JointName, Point>;
export type NormalizedPose = Pose;

export interface RigSettings {
  torsoLength: number;
  headLength: number;
  shoulderOffset: number;
  upperArmLength: number;
  lowerArmLength: number;
  upperLegLength: number;
  lowerLegLength: number;
}

export interface PoseLevel {
  id: number;
  name: string;
  target: NormalizedPose;
  successThreshold: number;
}

export const VISIBLE_JOINTS: JointName[] = [
  'head',
  'neck',
  'leftHand',
  'rightHand',
  'leftElbow',
  'rightElbow',
  'hip',
  'leftFoot',
  'rightFoot',
];

export const SCORE_JOINTS: JointName[] = [
  'head',
  'neck',
  'leftHand',
  'rightHand',
  'leftElbow',
  'rightElbow',
  'leftFoot',
  'rightFoot',
];
