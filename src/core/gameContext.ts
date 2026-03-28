import { LevelService } from '../services/LevelService';
import { ProgressService } from '../services/ProgressService';
import { LocalizationService } from '../services/LocalizationService';
import type { AdService } from '../services/AdService';
import { MusicService } from '../services/MusicService';
import type { NotificationService } from '../services/NotificationService';

export interface GameContext {
  levels: LevelService;
  progress: ProgressService;
  i18n: LocalizationService;
  ads: AdService;
  music: MusicService;
  notifications: NotificationService;
}

let context: GameContext | null = null;

export function setGameContext(value: GameContext): void {
  context = value;
}

export function getGameContext(): GameContext {
  if (!context) {
    throw new Error('Game context is not initialized.');
  }

  return context;
}
