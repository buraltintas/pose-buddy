import { LEVEL_DATA } from '../levels/levelData';
import type { LevelDefinition } from '../levels/types';

export class LevelService {
  private readonly levels: LevelDefinition[];

  constructor() {
    this.levels = [...LEVEL_DATA].sort((a, b) => a.order - b.order);
  }

  public getAll(): LevelDefinition[] {
    return this.levels.map((level) => ({
      ...level,
      targetPose: clonePose(level.targetPose),
    }));
  }

  public getById(id: number): LevelDefinition | null {
    const found = this.levels.find((level) => level.id === id);
    return found ? { ...found, targetPose: clonePose(found.targetPose) } : null;
  }

  public getNextLevelFromCurrent(currentId: number): number {
    const currentIndex = this.levels.findIndex(
      (level) => level.id === currentId,
    );
    if (currentIndex < 0) {
      return this.levels[0].id;
    }

    if (currentIndex >= this.levels.length - 1) {
      return this.levels[this.levels.length - 1].id;
    }

    return this.levels[currentIndex + 1].id;
  }

  public getNextProgressionLevel(options: {
    unlockedLevel: number;
    isCompleted: (levelId: number) => boolean;
  }): number {
    const total = this.levels.length;
    if (total === 0) {
      return 1;
    }

    const availableCount = Math.max(1, Math.min(options.unlockedLevel, total));
    const availableLevels = this.levels.slice(0, availableCount);

    const firstUnfinished = availableLevels.find(
      (level) => !options.isCompleted(level.id),
    );
    if (firstUnfinished) {
      return firstUnfinished.id;
    }

    return availableLevels[availableLevels.length - 1].id;
  }

  public getResumeLevel(levelId: number): number {
    const found = this.levels.find((level) => level.id === levelId);
    return found?.id ?? this.getFirstLevelId();
  }

  public getNextLevelId(currentId: number): number {
    return this.getNextLevelFromCurrent(currentId);
  }

  public getFirstLevelId(): number {
    return this.levels[0]?.id ?? 1;
  }

  public getTotalLevels(): number {
    return this.levels.length;
  }
}

function clonePose(
  pose: LevelDefinition['targetPose'],
): LevelDefinition['targetPose'] {
  return {
    hip: { ...pose.hip },
    neck: { ...pose.neck },
    head: { ...pose.head },
    leftElbow: { ...pose.leftElbow },
    leftHand: { ...pose.leftHand },
    rightElbow: { ...pose.rightElbow },
    rightHand: { ...pose.rightHand },
    leftFoot: { ...pose.leftFoot },
    rightFoot: { ...pose.rightFoot },
  };
}
