import type { NormalizedPose } from '../models/pose';
import type { TranslationKey } from '../i18n/types';

export type LevelDifficulty = 'easy' | 'medium' | 'hard';

export interface LevelDefinition {
  id: number;
  order: number;
  difficulty: LevelDifficulty;
  tag?: string;
  titleKey: TranslationKey;
  successThreshold: number;
  targetPose: NormalizedPose;
}
