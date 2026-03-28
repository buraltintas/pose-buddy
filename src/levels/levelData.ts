import type { NormalizedPose } from '../models/pose';
import type { LevelDefinition } from './types';

const LEVEL_COUNT = 100;

type Template = {
  pose: NormalizedPose;
};

const DIFFICULTY_CYCLE: Array<LevelDefinition['difficulty']> = [
  'easy',
  'medium',
  'hard',
];

const TITLE_KEY_CYCLE: Array<LevelDefinition['titleKey']> = [
  'level.warmup',
  'level.rocket',
  'level.crane',
];

const SUCCESS_BY_DIFFICULTY: Record<LevelDefinition['difficulty'], number> = {
  easy: 0.88,
  medium: 0.89,
  hard: 0.9,
};

const POSE_TEMPLATES: Template[] = [
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: 0.02, y: -1.0 },
      head: { x: 0.05, y: -1.42 },
      leftElbow: { x: -0.42, y: -0.84 },
      leftHand: { x: -0.72, y: -0.62 },
      rightElbow: { x: 0.34, y: -1.04 },
      rightHand: { x: 0.26, y: -1.44 },
      leftFoot: { x: -0.47, y: 1.08 },
      rightFoot: { x: 0.48, y: 1.08 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: 0, y: -0.98 },
      head: { x: 0, y: -1.38 },
      leftElbow: { x: -0.56, y: -0.92 },
      leftHand: { x: -0.92, y: -0.9 },
      rightElbow: { x: 0.56, y: -0.92 },
      rightHand: { x: 0.92, y: -0.9 },
      leftFoot: { x: -0.52, y: 1.1 },
      rightFoot: { x: 0.52, y: 1.1 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: 0, y: -1.02 },
      head: { x: 0.02, y: -1.44 },
      leftElbow: { x: -0.34, y: -1.2 },
      leftHand: { x: -0.2, y: -1.56 },
      rightElbow: { x: 0.34, y: -1.2 },
      rightHand: { x: 0.2, y: -1.56 },
      leftFoot: { x: -0.52, y: 1.12 },
      rightFoot: { x: 0.52, y: 1.12 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: 0, y: -0.98 },
      head: { x: -0.04, y: -1.39 },
      leftElbow: { x: -0.38, y: -1.06 },
      leftHand: { x: -0.28, y: -1.46 },
      rightElbow: { x: 0.34, y: -0.76 },
      rightHand: { x: 0.62, y: -0.5 },
      leftFoot: { x: -0.46, y: 1.07 },
      rightFoot: { x: 0.5, y: 1.09 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: 0, y: -0.92 },
      head: { x: 0, y: -1.3 },
      leftElbow: { x: -0.52, y: -0.68 },
      leftHand: { x: -0.86, y: -0.48 },
      rightElbow: { x: 0.52, y: -0.68 },
      rightHand: { x: 0.86, y: -0.48 },
      leftFoot: { x: -0.69, y: 1.18 },
      rightFoot: { x: 0.69, y: 1.18 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: -0.08, y: -0.99 },
      head: { x: -0.12, y: -1.4 },
      leftElbow: { x: -0.72, y: -0.86 },
      leftHand: { x: -1.02, y: -0.9 },
      rightElbow: { x: 0.26, y: -0.74 },
      rightHand: { x: 0.62, y: -0.68 },
      leftFoot: { x: -0.79, y: 1.2 },
      rightFoot: { x: 0.4, y: 1.02 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: 0.08, y: -0.99 },
      head: { x: 0.12, y: -1.4 },
      leftElbow: { x: -0.26, y: -0.74 },
      leftHand: { x: -0.62, y: -0.68 },
      rightElbow: { x: 0.72, y: -0.86 },
      rightHand: { x: 1.02, y: -0.9 },
      leftFoot: { x: -0.4, y: 1.02 },
      rightFoot: { x: 0.79, y: 1.2 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: 0.08, y: -0.98 },
      head: { x: 0.12, y: -1.38 },
      leftElbow: { x: -0.18, y: -0.76 },
      leftHand: { x: -0.34, y: -0.5 },
      rightElbow: { x: 0.54, y: -0.98 },
      rightHand: { x: 0.86, y: -0.7 },
      leftFoot: { x: -0.2, y: 0.32 },
      rightFoot: { x: 0.53, y: 1.15 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: -0.08, y: -0.98 },
      head: { x: -0.12, y: -1.38 },
      leftElbow: { x: -0.54, y: -0.98 },
      leftHand: { x: -0.86, y: -0.7 },
      rightElbow: { x: 0.18, y: -0.76 },
      rightHand: { x: 0.34, y: -0.5 },
      leftFoot: { x: -0.53, y: 1.15 },
      rightFoot: { x: 0.2, y: 0.32 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: -0.13, y: -1.0 },
      head: { x: -0.22, y: -1.42 },
      leftElbow: { x: -0.66, y: -0.98 },
      leftHand: { x: -0.84, y: -1.28 },
      rightElbow: { x: 0.28, y: -0.78 },
      rightHand: { x: 0.56, y: -0.56 },
      leftFoot: { x: -0.47, y: 1.06 },
      rightFoot: { x: 0.54, y: 1.12 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: 0.13, y: -1.0 },
      head: { x: 0.22, y: -1.42 },
      leftElbow: { x: -0.28, y: -0.78 },
      leftHand: { x: -0.56, y: -0.56 },
      rightElbow: { x: 0.66, y: -0.98 },
      rightHand: { x: 0.84, y: -1.28 },
      leftFoot: { x: -0.54, y: 1.12 },
      rightFoot: { x: 0.47, y: 1.06 },
    },
  },
  {
    pose: {
      hip: { x: 0, y: 0 },
      neck: { x: 0, y: -1.0 },
      head: { x: 0.01, y: -1.42 },
      leftElbow: { x: -0.5, y: -1.12 },
      leftHand: { x: -0.76, y: -1.42 },
      rightElbow: { x: 0.5, y: -1.12 },
      rightHand: { x: 0.76, y: -1.42 },
      leftFoot: { x: -0.74, y: 1.18 },
      rightFoot: { x: 0.74, y: 1.18 },
    },
  },
];

export const LEVEL_DATA: LevelDefinition[] = Array.from(
  { length: LEVEL_COUNT },
  (_, index) => {
    const id = index + 1;
    const templateIndex = index % POSE_TEMPLATES.length;
    const template = POSE_TEMPLATES[templateIndex];
    const mirrorPhase = Math.floor(index / POSE_TEMPLATES.length);
    const shouldMirror = mirrorPhase % 2 === 1;
    const variationTier = Math.floor(mirrorPhase / 2);
    const difficulty = DIFFICULTY_CYCLE[index % DIFFICULTY_CYCLE.length];

    const basePose = shouldMirror ? mirrorPose(template.pose) : template.pose;

    return {
      id,
      order: id,
      difficulty,
      tag: `pose-${templateIndex + 1}-v${variationTier + 1}`,
      titleKey: TITLE_KEY_CYCLE[index % TITLE_KEY_CYCLE.length],
      successThreshold: SUCCESS_BY_DIFFICULTY[difficulty],
      targetPose: applyStaticVariation(basePose, id, variationTier),
    };
  },
);

function applyStaticVariation(
  pose: NormalizedPose,
  levelId: number,
  variationTier: number,
): NormalizedPose {
  const amp = Math.min(0.055, 0.018 + variationTier * 0.006);
  const globalLean = (rand(levelId * 19 + 7) - 0.5) * amp * 0.8;

  return {
    hip: { x: 0, y: 0 },
    neck: jitterPoint(pose.neck, levelId, 1, amp * 0.45, amp * 0.35, globalLean),
    head: jitterPoint(pose.head, levelId, 2, amp * 0.5, amp * 0.4, globalLean),
    leftElbow: jitterPoint(
      pose.leftElbow,
      levelId,
      3,
      amp * 0.85,
      amp * 0.75,
      globalLean,
    ),
    leftHand: jitterPoint(
      pose.leftHand,
      levelId,
      4,
      amp,
      amp * 0.85,
      globalLean,
    ),
    rightElbow: jitterPoint(
      pose.rightElbow,
      levelId,
      5,
      amp * 0.85,
      amp * 0.75,
      globalLean,
    ),
    rightHand: jitterPoint(
      pose.rightHand,
      levelId,
      6,
      amp,
      amp * 0.85,
      globalLean,
    ),
    leftFoot: jitterPoint(
      pose.leftFoot,
      levelId,
      7,
      amp * 0.8,
      amp * 0.55,
      globalLean * 0.5,
    ),
    rightFoot: jitterPoint(
      pose.rightFoot,
      levelId,
      8,
      amp * 0.8,
      amp * 0.55,
      globalLean * 0.5,
    ),
  };
}

function jitterPoint(
  point: { x: number; y: number },
  levelId: number,
  channel: number,
  ampX: number,
  ampY: number,
  globalLean: number,
): { x: number; y: number } {
  const dx = (rand(levelId * 101 + channel * 17) - 0.5) * 2 * ampX;
  const dy = (rand(levelId * 131 + channel * 29) - 0.5) * 2 * ampY;

  return {
    x: clamp(point.x + dx + globalLean, -1.2, 1.2),
    y: clamp(point.y + dy, -1.7, 1.7),
  };
}

function mirrorPose(pose: NormalizedPose): NormalizedPose {
  return {
    hip: { x: -pose.hip.x, y: pose.hip.y },
    neck: { x: -pose.neck.x, y: pose.neck.y },
    head: { x: -pose.head.x, y: pose.head.y },
    leftElbow: { x: -pose.rightElbow.x, y: pose.rightElbow.y },
    leftHand: { x: -pose.rightHand.x, y: pose.rightHand.y },
    rightElbow: { x: -pose.leftElbow.x, y: pose.leftElbow.y },
    rightHand: { x: -pose.leftHand.x, y: pose.leftHand.y },
    leftFoot: { x: -pose.rightFoot.x, y: pose.rightFoot.y },
    rightFoot: { x: -pose.leftFoot.x, y: pose.leftFoot.y },
  };
}

function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
