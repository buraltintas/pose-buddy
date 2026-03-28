import type { LanguageCode } from '../i18n/types';
import type { NormalizedPose } from '../models/pose';
import {
  DEFAULT_PROGRESS,
  type ProgressState,
  type UserSettings,
} from '../models/progress';
import type { StorageAdapter } from '../storage/StorageAdapter';

const STORAGE_KEY = 'pose-buddy-progress-v1';

export class ProgressService {
  private readonly storage: StorageAdapter;
  private state: ProgressState;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
    this.state = this.load();
  }

  public getState(): ProgressState {
    return deepCopy(this.state);
  }

  public getUnlockedLevel(): number {
    return this.state.unlockedLevel;
  }

  public isUnlocked(levelId: number): boolean {
    return levelId <= this.state.unlockedLevel;
  }

  public getBestScore(levelId: number): number {
    return this.state.bestScoreByLevel[String(levelId)] ?? 0;
  }

  public getAttempts(levelId: number): number {
    return this.state.attemptsByLevel[String(levelId)] ?? 0;
  }

  public isCompleted(levelId: number): boolean {
    return this.state.completedLevelIds.includes(levelId);
  }

  public getSavedPose(levelId: number): NormalizedPose | null {
    return this.state.savedPoseByLevel[String(levelId)] ?? null;
  }

  public savePose(levelId: number, pose: NormalizedPose): void {
    this.state.savedPoseByLevel[String(levelId)] = deepCopy(pose);
    this.persist();
  }

  public clearSavedPose(levelId: number): void {
    delete this.state.savedPoseByLevel[String(levelId)];
    this.persist();
  }

  public recordAttempt(levelId: number): void {
    const key = String(levelId);
    this.state.attemptsByLevel[key] =
      (this.state.attemptsByLevel[key] ?? 0) + 1;
    this.persist();
  }

  public recordCompletion(levelId: number, score: number): void {
    if (!this.state.completedLevelIds.includes(levelId)) {
      this.state.completedLevelIds.push(levelId);
      this.state.completionCount += 1;
    }

    const key = String(levelId);
    this.state.bestScoreByLevel[key] = Math.max(
      this.state.bestScoreByLevel[key] ?? 0,
      score,
    );
    this.state.unlockedLevel = Math.max(this.state.unlockedLevel, levelId + 1);

    this.persist();
  }

  public setLanguage(language: LanguageCode): void {
    this.state.lastLanguage = language;
    this.persist();
  }

  public getLanguage(): LanguageCode {
    return this.state.lastLanguage;
  }

  public setSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ): void {
    this.state.settings[key] = value;
    this.persist();
  }

  public getSetting<K extends keyof UserSettings>(key: K): UserSettings[K] {
    return this.state.settings[key];
  }

  public resetProgress(): void {
    const language = this.state.lastLanguage;
    const settings = deepCopy(this.state.settings);
    this.state = deepCopy(DEFAULT_PROGRESS);
    this.state.lastLanguage = language;
    this.state.settings = settings;
    this.persist();
  }

  private load(): ProgressState {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) {
      return deepCopy(DEFAULT_PROGRESS);
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      return {
        ...deepCopy(DEFAULT_PROGRESS),
        ...parsed,
        completedLevelIds: parsed.completedLevelIds ?? [],
        bestScoreByLevel: parsed.bestScoreByLevel ?? {},
        attemptsByLevel: parsed.attemptsByLevel ?? {},
        savedPoseByLevel: parsed.savedPoseByLevel ?? {},
        settings: {
          ...DEFAULT_PROGRESS.settings,
          ...(parsed.settings ?? {}),
        },
      };
    } catch {
      return deepCopy(DEFAULT_PROGRESS);
    }
  }

  private persist(): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
