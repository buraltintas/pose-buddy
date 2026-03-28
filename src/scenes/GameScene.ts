import Phaser from 'phaser';
import { Theme } from '../config/theme';
import { SCENES } from '../core/sceneKeys';
import { DragController } from '../input/dragController';
import type { LevelDefinition } from '../levels/types';
import type { JointName, Pose } from '../models/pose';
import type { RigSettings } from '../models/pose';
import { PoseRig } from '../rig/poseRig';
import { scorePose } from '../scoring/poseScorer';
import {
  LayoutService,
  type PortraitLayout,
  type Rect,
} from '../services/LayoutService';
import { ArticulatedFigureRenderer } from '../ui/ArticulatedFigureRenderer';
import { createButton } from '../ui/button';
import { fitContentIntoRect, type RectLike } from '../ui/fitContent';
import { PoseCard } from '../ui/poseCard';
import { BaseScene } from './BaseScene';

interface GameSceneData {
  levelId?: number;
  source?: 'history' | 'default';
}

const PROGRESSION_THRESHOLD = 82;
const STRONG_SUCCESS_THRESHOLD = 90;
const PREVIEW_HIT_DEBUG_GLOBAL_KEY = '__POSE_BUDDY_DEBUG_TARGET_PREVIEW_HIT__';
const PREVIEW_HIT_DEBUG_STORAGE_KEY = 'POSE_BUDDY_DEBUG_TARGET_PREVIEW_HIT';
const PREVIEW_DEBUG_LOG_GLOBAL_KEY = '__POSE_BUDDY_DEBUG_TARGET_PREVIEW_LOG__';
const PREVIEW_DEBUG_LOG_STORAGE_KEY = 'POSE_BUDDY_DEBUG_TARGET_PREVIEW_LOG';

export class GameScene extends BaseScene {
  private layout!: PortraitLayout;
  private startLevelId?: number;
  private startSource: 'history' | 'default';
  private level!: LevelDefinition;

  private rig!: PoseRig;
  private rigSettings!: RigSettings;
  private dragController!: DragController;

  private backgroundGraphics!: Phaser.GameObjects.Graphics;
  private rigGraphics!: Phaser.GameObjects.Graphics;
  private figureRenderer: ArticulatedFigureRenderer;

  private poseCard!: PoseCard;
  private zoomPoseCard!: PoseCard;
  private previewHitProxy!: Phaser.GameObjects.Rectangle;
  private previewCardBoundsDebug?: Phaser.GameObjects.Rectangle;
  private previewDebugLabel?: Phaser.GameObjects.Text;

  private levelText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private successText!: Phaser.GameObjects.Text;
  private adToastText!: Phaser.GameObjects.Text;

  private progressBarBg!: Phaser.GameObjects.Rectangle;
  private progressBarFill!: Phaser.GameObjects.Rectangle;

  private backButton!: Phaser.GameObjects.Container;
  private nextButton!: Phaser.GameObjects.Container;
  private zoomBackdrop!: Phaser.GameObjects.Rectangle;
  private zoomCloseButton!: Phaser.GameObjects.Container;

  private mainBoardBounds!: Rect;
  private infoLeftBounds!: Rect;
  private infoRightBounds!: Rect;
  private targetCardBounds!: Rect;
  private headerBottomY: number;

  private isLevelComplete: boolean;
  private completionRecorded: boolean;
  private hasInteracted: boolean;
  private activeJoint: JointName | null;
  private isTargetZoomOpen: boolean;
  private currentPercent: number;
  private previewDebugEnabled: boolean;
  private previewDebugLogsEnabled: boolean;

  constructor(key: string) {
    super(key);
    this.startSource = 'default';
    this.isLevelComplete = false;
    this.completionRecorded = false;
    this.hasInteracted = false;
    this.activeJoint = null;
    this.isTargetZoomOpen = false;
    this.currentPercent = 0;
    this.headerBottomY = 0;
    this.previewDebugEnabled = false;
    this.previewDebugLogsEnabled = false;
    this.figureRenderer = new ArticulatedFigureRenderer();
  }

  init(data: GameSceneData): void {
    this.startLevelId = data.levelId;
    this.startSource = data.source ?? 'default';
    this.isLevelComplete = false;
    this.completionRecorded = false;
    this.hasInteracted = false;
    this.activeJoint = null;
    this.isTargetZoomOpen = false;
    this.currentPercent = 0;
    this.headerBottomY = 0;
  }

  create(): void {
    this.layout = LayoutService.createPortraitLayout(
      this.scale.gameSize.width,
      this.scale.gameSize.height,
    );
    this.level = this.resolveLevel();

    this.backgroundGraphics = this.add.graphics();
    this.rigGraphics = this.add.graphics();

    this.computeGameAreas();

    this.drawSceneBackground();

    this.levelText = this.add
      .text(0, 0, '', {
        fontFamily: Theme.font,
        fontSize: '23px',
        color: '#2d4f65',
        fontStyle: '700',
      })
      .setOrigin(1, 0.5);

    this.statusText = this.add
      .text(0, 0, '', {
        fontFamily: Theme.font,
        fontSize: '20px',
        color: '#4f6f82',
      })
      .setOrigin(0, 0.5);

    this.progressBarBg = this.add
      .rectangle(0, 0, 200, 14, 0xd6dbe1)
      .setOrigin(0, 0.5);
    this.progressBarFill = this.add
      .rectangle(0, 0, 200, 14, Theme.palette.accent)
      .setOrigin(0, 0.5);

    this.poseCard = new PoseCard(this, this.level.targetPose, '', {
      drawFrame: false,
      innerPadding: 3,
      interactive: false,
    });
    this.poseCard.setDepth(16);

    this.previewDebugEnabled = this.isPreviewHitDebugEnabled();
    this.previewDebugLogsEnabled = this.isPreviewDebugLogEnabled();

    this.previewHitProxy = this.add
      .rectangle(0, 0, 1, 1, 0xffffff, this.previewDebugEnabled ? 0.22 : 0.001)
      .setOrigin(0, 0)
      .setDepth(40);
    if (this.previewDebugEnabled) {
      this.previewHitProxy.setStrokeStyle(2, 0xef4444, 0.95);
    }
    this.previewHitProxy.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 1, 1),
      Phaser.Geom.Rectangle.Contains,
    );
    this.previewHitProxy.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        this.logPreviewDebug('previewHit pointerdown', {
          id: pointer.id,
          x: Math.round(pointer.x),
          y: Math.round(pointer.y),
        });
        event.stopPropagation();
        this.updatePreviewDebugLabel('PREVIEW TAP OK');
        this.logPreviewDebug('PREVIEW TAP OK');
        this.openTargetPreviewModal();
      },
    );

    if (this.previewDebugEnabled) {
      this.previewCardBoundsDebug = this.add
        .rectangle(0, 0, 1, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x0ea5e9, 0.95)
        .setFillStyle(0x0ea5e9, 0.05)
        .setDepth(41);

      this.previewDebugLabel = this.add
        .text(0, 0, 'PREVIEW HIT READY', {
          fontFamily: Theme.font,
          fontSize: '12px',
          color: '#0f172a',
          fontStyle: '700',
          backgroundColor: '#dcfce7',
          padding: { x: 4, y: 2 },
        })
        .setDepth(42)
        .setVisible(true);
    }

    this.zoomBackdrop = this.add
      .rectangle(0, 0, this.layout.width, this.layout.height, 0x1a1f24, 0.52)
      .setOrigin(0)
      .setDepth(90)
      .setVisible(false);
    this.zoomBackdrop.disableInteractive();
    this.zoomBackdrop.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
      this.logPreviewDebug('backdrop pointerdown');
      this.updatePreviewDebugLabel('BACKDROP DOWN');
      this.closeTargetPreviewModal();
    });

    this.zoomPoseCard = new PoseCard(this, this.level.targetPose, '', {
      drawFrame: true,
      innerPadding: 8,
      interactive: false,
    });
    this.zoomPoseCard.setDepth(92);
    this.zoomPoseCard.setVisible(false);

    const closeBg = this.add
      .circle(0, 0, 20, 0xffffff, 0.96)
      .setStrokeStyle(2, 0x87a0b3, 1)
      .setInteractive({ useHandCursor: true });
    const closeText = this.add
      .text(0, -1, '×', {
        fontFamily: Theme.font,
        fontSize: '26px',
        fontStyle: '700',
        color: '#315169',
      })
      .setOrigin(0.5);
    this.zoomCloseButton = this.add
      .container(0, 0, [closeBg, closeText])
      .setDepth(93)
      .setVisible(false);

    closeBg.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.closeTargetPreviewModal();
      },
    );

    this.backButton = this.createHeaderBackButton(() =>
      this.scene.start(SCENES.home),
    );

    this.nextButton = createButton(this, 0, 0, {
      width: 186,
      height: 52,
      label: this.ctx.i18n.t('common.nextLevel'),
      background: Theme.palette.accent,
      onPress: () => this.goToNextLevel(),
    }).setVisible(false);

    this.successText = this.add
      .text(0, 0, this.ctx.i18n.t('game.success'), {
        fontFamily: Theme.font,
        fontSize: '38px',
        color: '#1f6f53',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.adToastText = this.add
      .text(0, 0, '', {
        fontFamily: Theme.font,
        fontSize: '18px',
        color: '#8e5d3b',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.rigSettings = this.createRigSettings();
    this.rig = new PoseRig(
      this.getRigOrigin(this.rigSettings),
      this.rigSettings,
    );
    this.dragController = new DragController(this, this.rig, {
      onDragStart: (joint) => {
        this.hasInteracted = true;
        this.activeJoint = joint;
      },
      onDragEnd: () => {
        this.activeJoint = null;
        this.persistPoseSnapshot();
      },
    });

    this.restoreHistoryPoseIfAvailable();

    this.createOrientationOverlay(this.layout);
    this.refreshHeaderText();
    this.applyLayout();
    this.updateProgressText(this.currentPercent);

    this.events.on(
      Phaser.Scenes.Events.SHUTDOWN,
      this.persistPoseSnapshot,
      this,
    );

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);

    this.exposePreviewModalDebugHook();
    this.input.on('pointerdown', this.handleScenePointerDown, this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removePreviewModalDebugHook();
      this.input.off('pointerdown', this.handleScenePointerDown, this);
    });
  }

  update(): void {
    this.drawRig(this.rig.getPose());

    if (!this.layout.isPortrait || this.isLevelComplete) {
      return;
    }

    if (!this.hasInteracted) {
      return;
    }

    const currentScore = scorePose(
      this.rig.getNormalizedPose(),
      this.level.targetPose,
    );
    this.currentPercent = currentScore.percentage;
    this.updateProgressText(currentScore.percentage);

    this.updateProgressionState(currentScore.score, currentScore.percentage);

    if (currentScore.percentage >= STRONG_SUCCESS_THRESHOLD) {
      this.showStrongSuccessFeedback();
    } else {
      this.successText.setVisible(false);
    }
  }

  private updateProgressionState(score: number, percentage: number): void {
    const qualifies = percentage >= PROGRESSION_THRESHOLD;
    this.setNextButtonVisibility(qualifies && !this.isTargetZoomOpen);

    if (!qualifies) {
      return;
    }

    const best = this.ctx.progress.getBestScore(this.level.id);
    if (!this.completionRecorded) {
      this.completionRecorded = true;
      this.ctx.progress.recordCompletion(this.level.id, score);
      void this.showInterstitialToast();
      return;
    }

    if (score > best + 1e-4) {
      this.completionRecorded = true;
      this.ctx.progress.recordCompletion(this.level.id, score);
    }
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    const savedBeforeResize = this.hasInteracted
      ? this.rig.getNormalizedPose()
      : null;

    this.layout = LayoutService.createPortraitLayout(
      gameSize.width,
      gameSize.height,
    );
    this.rigSettings = this.createRigSettings();
    this.rig = new PoseRig(
      this.getRigOrigin(this.rigSettings),
      this.rigSettings,
    );
    if (savedBeforeResize) {
      this.rig.applyNormalizedPose(
        savedBeforeResize,
        this.getRigOrigin(this.rigSettings),
      );
    }
    this.dragController.setRig(this.rig);
    this.hasInteracted = Boolean(savedBeforeResize);
    this.activeJoint = null;
    if (savedBeforeResize) {
      const restored = scorePose(
        this.rig.getNormalizedPose(),
        this.level.targetPose,
      );
      this.currentPercent = restored.percentage;
    } else {
      this.currentPercent = 0;
    }
    this.applyLayout();
    this.updateProgressText(this.currentPercent);
  }

  private resolveLevel(): LevelDefinition {
    const fallback = Math.min(
      this.ctx.progress.getUnlockedLevel(),
      this.ctx.levels.getTotalLevels(),
    );
    const requested = this.startLevelId ?? fallback;
    const levelId = this.ctx.levels.getResumeLevel(requested);
    return (
      this.ctx.levels.getById(levelId) ??
      this.ctx.levels.getById(this.ctx.levels.getFirstLevelId())!
    );
  }

  private getRigOrigin(settings: RigSettings): { x: number; y: number } {
    const innerBoard = this.getMainBoardInnerRect();
    const boardTop = innerBoard.y;
    const boardBottom = innerBoard.y + innerBoard.height;
    const topPadding = Math.max(10, innerBoard.height * 0.05);
    const bottomPadding = Math.max(12, innerBoard.height * 0.06);

    const topReach = settings.headLength + settings.torsoLength + 8;
    const bottomReach = settings.upperLegLength + settings.lowerLegLength + 22;

    const minHipY = boardTop + topPadding + topReach;
    const maxHipY = boardBottom - bottomPadding - bottomReach;
    const hipY =
      minHipY <= maxHipY
        ? (minHipY + maxHipY) * 0.5
        : boardTop + innerBoard.height * 0.56;

    return {
      x: innerBoard.x + innerBoard.width * 0.5,
      y: hipY,
    };
  }

  private createRigSettings(): RigSettings {
    const innerBoard = this.getMainBoardInnerRect();

    const baseHeight = 148 + 60 + 92 + 92 + 24;
    const baseWidth = 2 * (66 + 66) + 44;

    const fit = fitContentIntoRect(
      baseWidth,
      baseHeight,
      innerBoard,
      Math.max(8, Math.min(innerBoard.width, innerBoard.height) * 0.04),
    );

    const scaleByHeight = fit.scale;
    const scaleByWidth = fit.scale;
    const scale = Phaser.Math.Clamp(
      Math.min(scaleByHeight, scaleByWidth),
      0.56,
      1.03,
    );

    return {
      torsoLength: Math.round(148 * scale),
      headLength: Math.round(60 * scale),
      shoulderOffset: Math.round(22 * scale),
      upperArmLength: Math.round(66 * scale),
      lowerArmLength: Math.round(66 * scale),
      upperLegLength: Math.round(92 * scale),
      lowerLegLength: Math.round(92 * scale),
    };
  }

  private applyLayout(): void {
    const header = this.resolveHeaderLayout();
    this.headerBottomY = header.bottomY;
    this.computeGameAreas();
    this.drawSceneBackground();

    const panelInnerPadding = Math.max(12, this.infoLeftBounds.width * 0.06);
    const progressWidth = this.infoLeftBounds.width - panelInnerPadding * 2;

    this.backButton.setPosition(header.backX, header.row1Y);
    this.levelText.setPosition(header.levelX, header.row1Y);
    this.nextButton.setScale(header.nextScale);
    this.nextButton.setPosition(header.nextX, header.nextY);

    this.poseCard.layout({
      x: this.targetCardBounds.x,
      y: this.targetCardBounds.y,
      width: this.targetCardBounds.width,
      height: this.targetCardBounds.height,
    });
    this.updatePreviewHitArea();

    this.zoomBackdrop.setPosition(0, 0);
    this.zoomBackdrop.setSize(this.layout.width, this.layout.height);

    const zoomWidth = Phaser.Math.Clamp(this.layout.width * 0.86, 250, 420);
    const zoomHeight = Phaser.Math.Clamp(this.layout.height * 0.72, 320, 620);
    const zoomX = (this.layout.width - zoomWidth) * 0.5;
    const zoomY = (this.layout.height - zoomHeight) * 0.5;
    this.zoomPoseCard.layout({
      x: zoomX,
      y: zoomY,
      width: zoomWidth,
      height: zoomHeight,
    });
    this.zoomCloseButton.setPosition(zoomX + zoomWidth - 16, zoomY + 16);

    this.progressBarBg.width = progressWidth;
    this.progressBarFill.width = progressWidth;
    this.statusText.setPosition(
      this.infoLeftBounds.x + panelInnerPadding,
      this.infoLeftBounds.y + this.infoLeftBounds.height * 0.36,
    );
    this.progressBarBg.setPosition(
      this.infoLeftBounds.x + panelInnerPadding,
      this.infoLeftBounds.y + this.infoLeftBounds.height * 0.64,
    );
    this.progressBarFill.setPosition(
      this.infoLeftBounds.x + panelInnerPadding,
      this.infoLeftBounds.y + this.infoLeftBounds.height * 0.64,
    );

    this.successText.setPosition(
      this.mainBoardBounds.x + this.mainBoardBounds.width * 0.5,
      this.mainBoardBounds.y + this.mainBoardBounds.height * 0.24,
    );
    this.adToastText.setPosition(
      this.mainBoardBounds.x + this.mainBoardBounds.width * 0.5,
      this.mainBoardBounds.y + this.mainBoardBounds.height * 0.61,
    );

    this.setOrientationOverlay(this.layout);
    this.dragController.setEnabled(
      this.layout.isPortrait && !this.isLevelComplete && !this.isTargetZoomOpen,
    );
  }

  private computeGameAreas(): void {
    const fullX = this.layout.safePadding;
    const fullWidth = this.layout.width - this.layout.safePadding * 2;
    const infoGap = Math.max(8, fullWidth * 0.018);
    const infoRowHeight = Phaser.Math.Clamp(this.layout.height * 0.2, 124, 180);
    const infoRowY =
      this.layout.height - this.layout.safePadding - infoRowHeight;

    const headerAnchor =
      this.headerBottomY > 0
        ? this.headerBottomY
        : this.layout.safeTop + Math.max(22, this.layout.height * 0.035);
    const boardTop = headerAnchor + Math.max(22, this.layout.height * 0.036);
    const boardHeight = Math.max(180, infoRowY - boardTop - infoGap);

    const rightWidth = Phaser.Math.Clamp(fullWidth * 0.35, 118, 172);
    const leftWidth = fullWidth - rightWidth - infoGap;

    this.mainBoardBounds = {
      x: fullX,
      y: boardTop,
      width: fullWidth,
      height: boardHeight,
    };

    this.infoLeftBounds = {
      x: fullX,
      y: infoRowY,
      width: leftWidth,
      height: infoRowHeight,
    };

    this.infoRightBounds = {
      x: fullX + leftWidth + infoGap,
      y: infoRowY,
      width: rightWidth,
      height: infoRowHeight,
    };

    const cardPaddingX = Math.max(2, rightWidth * 0.018);
    const cardTop = this.infoRightBounds.y + Math.max(2, infoRowHeight * 0.016);
    this.targetCardBounds = {
      x: this.infoRightBounds.x + cardPaddingX,
      y: cardTop,
      width: Math.max(90, this.infoRightBounds.width - cardPaddingX * 2),
      height: Math.max(
        96,
        this.infoRightBounds.height - (cardTop - this.infoRightBounds.y) - 3,
      ),
    };
  }

  private getMainBoardInnerRect(): RectLike {
    const p = Math.max(
      10,
      Math.min(this.mainBoardBounds.width, this.mainBoardBounds.height) * 0.045,
    );
    return {
      x: this.mainBoardBounds.x + p,
      y: this.mainBoardBounds.y + p,
      width: Math.max(1, this.mainBoardBounds.width - p * 2),
      height: Math.max(1, this.mainBoardBounds.height - p * 2),
    };
  }

  private openTargetPreviewModal(): void {
    if (this.isTargetZoomOpen) {
      return;
    }

    this.logPreviewDebug('openTargetPreviewModal called', {
      now: Math.round(this.time.now),
    });
    this.updatePreviewDebugLabel('OPEN CALLED');

    this.isTargetZoomOpen = true;
    this.previewHitProxy.disableInteractive();
    this.logPreviewDebug('previewHit disabled');
    this.zoomBackdrop.setVisible(true);
    this.zoomBackdrop.disableInteractive();
    this.zoomPoseCard.setVisible(true);
    this.zoomCloseButton.setVisible(true);
    this.logPreviewDebug('modal shown');
    this.updatePreviewDebugLabel('MODAL OPEN');

    this.time.delayedCall(150, () => {
      if (!this.isTargetZoomOpen) {
        return;
      }

      this.zoomBackdrop.setInteractive();
      this.logPreviewDebug('backdrop interactive enabled (deferred)');
    });

    this.dragController.setEnabled(false);
    this.setNextButtonVisibility(false);
  }

  private closeTargetPreviewModal(): void {
    if (!this.isTargetZoomOpen) {
      return;
    }

    this.logPreviewDebug('closeTargetPreviewModal called', {
      now: Math.round(this.time.now),
    });
    this.updatePreviewDebugLabel('MODAL CLOSE');

    this.isTargetZoomOpen = false;
    this.logPreviewDebug('modal hidden');
    this.zoomBackdrop.setVisible(false);
    this.zoomBackdrop.disableInteractive();
    this.zoomPoseCard.setVisible(false);
    this.zoomCloseButton.setVisible(false);
    this.previewHitProxy.setInteractive(
      new Phaser.Geom.Rectangle(
        0,
        0,
        this.targetCardBounds.width,
        this.targetCardBounds.height,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    this.logPreviewDebug('previewHit enabled', {
      x: Math.round(this.targetCardBounds.x),
      y: Math.round(this.targetCardBounds.y),
      width: Math.round(this.targetCardBounds.width),
      height: Math.round(this.targetCardBounds.height),
    });
    this.dragController.setEnabled(
      this.layout.isPortrait && !this.isLevelComplete,
    );
    this.setNextButtonVisibility(this.currentPercent >= PROGRESSION_THRESHOLD);
  }

  private refreshHeaderText(): void {
    this.levelText.setText(
      this.ctx.i18n.t('common.level', { id: this.level.id }),
    );
  }

  private updateProgressText(percent: number): void {
    const clamped = Phaser.Math.Clamp(percent, 0, 100);
    this.progressBarFill.width = this.progressBarBg.width * (clamped / 100);

    if (!this.hasInteracted) {
      this.statusText.setText(this.ctx.i18n.t('game.match', { value: 0 }));
      return;
    }

    if (clamped >= STRONG_SUCCESS_THRESHOLD) {
      this.statusText.setText(
        this.ctx.i18n.t('game.great', { value: clamped }),
      );
    } else if (clamped >= PROGRESSION_THRESHOLD) {
      this.statusText.setText(
        this.ctx.i18n.t('game.success', { value: clamped }),
      );
    } else if (clamped > 70) {
      this.statusText.setText(
        this.ctx.i18n.t('game.close', { value: clamped }),
      );
    } else {
      this.statusText.setText(
        this.ctx.i18n.t('game.match', { value: clamped }),
      );
    }
  }

  private showStrongSuccessFeedback(): void {
    this.successText.setVisible(true);

    this.tweens.add({
      targets: [this.successText],
      scaleX: { from: 0.92, to: 1 },
      scaleY: { from: 0.92, to: 1 },
      alpha: { from: 0.45, to: 1 },
      duration: 260,
      ease: 'Quad.Out',
    });
  }

  private async showInterstitialToast(): Promise<void> {
    const shown = await this.ctx.ads.showInterstitialIfEligible({
      levelId: this.level.id,
      completionCount: this.ctx.progress.getState().completionCount,
    });
    if (!shown) {
      return;
    }

    this.adToastText.setText(this.ctx.i18n.t('ads.mockInterstitial'));
    this.adToastText.setVisible(true);

    this.tweens.add({
      targets: this.adToastText,
      alpha: { from: 1, to: 0 },
      duration: 850,
      yoyo: false,
      onComplete: () => {
        this.adToastText.setVisible(false);
        this.adToastText.setAlpha(1);
      },
    });
  }

  private goToNextLevel(): void {
    if (this.currentPercent >= PROGRESSION_THRESHOLD) {
      const normalized = this.currentPercent / 100;
      this.ctx.progress.recordCompletion(this.level.id, normalized);
    }

    const nextLevelId = this.ctx.levels.getNextLevelFromCurrent(this.level.id);
    this.scene.start(SCENES.game, { levelId: nextLevelId });
  }

  private drawSceneBackground(): void {
    this.backgroundGraphics.clear();

    this.backgroundGraphics.fillStyle(Theme.palette.background, 1);
    this.backgroundGraphics.fillRect(
      0,
      0,
      this.layout.width,
      this.layout.height,
    );

    this.backgroundGraphics.fillStyle(0xe7e2d3, 0.8);
    this.backgroundGraphics.fillCircle(
      this.layout.width * 0.18,
      this.layout.height * 0.72,
      Math.min(this.layout.width, this.layout.height) * 0.22,
    );

    this.backgroundGraphics.fillStyle(0xf5dfd1, 0.68);
    this.backgroundGraphics.fillCircle(
      this.layout.width * 0.92,
      this.layout.height * 0.18,
      Math.min(this.layout.width, this.layout.height) * 0.2,
    );

    this.backgroundGraphics.fillStyle(Theme.palette.board, 0.9);
    this.backgroundGraphics.lineStyle(2, Theme.palette.boardStroke, 1);
    this.backgroundGraphics.fillRoundedRect(
      this.mainBoardBounds.x,
      this.mainBoardBounds.y,
      this.mainBoardBounds.width,
      this.mainBoardBounds.height,
      28,
    );
    this.backgroundGraphics.strokeRoundedRect(
      this.mainBoardBounds.x,
      this.mainBoardBounds.y,
      this.mainBoardBounds.width,
      this.mainBoardBounds.height,
      28,
    );

    this.backgroundGraphics.fillStyle(Theme.palette.panel, 0.94);
    this.backgroundGraphics.lineStyle(2, Theme.palette.panelStroke, 1);
    this.backgroundGraphics.fillRoundedRect(
      this.infoLeftBounds.x,
      this.infoLeftBounds.y,
      this.infoLeftBounds.width,
      this.infoLeftBounds.height,
      24,
    );
    this.backgroundGraphics.strokeRoundedRect(
      this.infoLeftBounds.x,
      this.infoLeftBounds.y,
      this.infoLeftBounds.width,
      this.infoLeftBounds.height,
      24,
    );

    this.backgroundGraphics.fillStyle(0xf7f0e2, 0.9);
    this.backgroundGraphics.lineStyle(2, 0xd9c9a7, 1);
    this.backgroundGraphics.fillRoundedRect(
      this.infoRightBounds.x,
      this.infoRightBounds.y,
      this.infoRightBounds.width,
      this.infoRightBounds.height,
      24,
    );
    this.backgroundGraphics.strokeRoundedRect(
      this.infoRightBounds.x,
      this.infoRightBounds.y,
      this.infoRightBounds.width,
      this.infoRightBounds.height,
      24,
    );
  }

  private drawRig(pose: Pose): void {
    const limbData = this.rig.getLimbRenderData();
    this.figureRenderer.draw(this.rigGraphics, pose, limbData, {
      isTargetSilhouette: false,
      activeJoint: this.activeJoint,
    });
  }

  private restoreHistoryPoseIfAvailable(): void {
    if (this.startSource !== 'history') {
      this.currentPercent = 0;
      return;
    }

    const savedPose = this.ctx.progress.getSavedPose(this.level.id);
    if (!savedPose) {
      this.currentPercent = 0;
      return;
    }

    this.rig.applyNormalizedPose(
      savedPose,
      this.getRigOrigin(this.rigSettings),
    );
    this.hasInteracted = true;

    const score = scorePose(
      this.rig.getNormalizedPose(),
      this.level.targetPose,
    );
    this.currentPercent = score.percentage;
    this.nextButton?.setVisible(this.currentPercent >= PROGRESSION_THRESHOLD);

    if (this.currentPercent >= STRONG_SUCCESS_THRESHOLD) {
      this.successText?.setVisible(true);
    }
  }

  private persistPoseSnapshot(): void {
    if (!this.rig || !this.hasInteracted) {
      return;
    }

    this.ctx.progress.savePose(this.level.id, this.rig.getNormalizedPose());
  }

  private updatePreviewHitArea(): void {
    this.previewHitProxy
      .setPosition(this.targetCardBounds.x, this.targetCardBounds.y)
      .setSize(this.targetCardBounds.width, this.targetCardBounds.height)
      .setDisplaySize(
        this.targetCardBounds.width,
        this.targetCardBounds.height,
      );

    if (this.previewCardBoundsDebug) {
      const cardBounds = this.poseCard.getBoundsRect();
      this.previewCardBoundsDebug
        .setPosition(cardBounds.x, cardBounds.y)
        .setSize(cardBounds.width, cardBounds.height);
    }

    if (this.previewDebugLabel) {
      this.previewDebugLabel.setPosition(
        this.targetCardBounds.x,
        Math.max(0, this.targetCardBounds.y - 18),
      );
    }

    if (!this.isTargetZoomOpen) {
      this.previewHitProxy.setInteractive(
        new Phaser.Geom.Rectangle(
          0,
          0,
          this.targetCardBounds.width,
          this.targetCardBounds.height,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
      this.logPreviewDebug('previewHit layout refreshed', {
        hitX: Math.round(this.targetCardBounds.x),
        hitY: Math.round(this.targetCardBounds.y),
        hitW: Math.round(this.targetCardBounds.width),
        hitH: Math.round(this.targetCardBounds.height),
      });
    }
  }

  private setNextButtonVisibility(visible: boolean): void {
    const changed = this.nextButton.visible !== visible;
    this.nextButton.setVisible(visible);
    if (changed) {
      this.applyLayout();
    }
  }

  private resolveHeaderLayout(): {
    row1Y: number;
    backX: number;
    levelX: number;
    nextX: number;
    nextY: number;
    nextScale: number;
    bottomY: number;
  } {
    const row1Y = this.layout.safeTop + 2;
    const leftEdge = this.layout.safePadding;
    const rightEdge = this.layout.width - this.layout.safePadding;

    const backWidth = Math.max(44, this.backButton.displayWidth || 44);
    const backHeight = Math.max(44, this.backButton.displayHeight || 44);
    const levelWidth = Math.max(1, this.levelText.width);
    const levelHeight = Math.max(22, this.levelText.height);

    const nextBaseWidth = 186;
    const nextBaseHeight = 52;
    const nextMinScale = 0.82;
    const nextMaxScale = 1;

    const oneRowGap = 10;
    const leftOccupied = leftEdge + backWidth;
    const rightOccupied = rightEdge - levelWidth;
    const middleAvailable = rightOccupied - leftOccupied - oneRowGap * 2;

    const nextVisible = this.nextButton.visible;
    const oneRowPossible =
      !nextVisible || middleAvailable >= nextBaseWidth * nextMinScale;

    if (oneRowPossible) {
      const nextScale = nextVisible
        ? Phaser.Math.Clamp(
            middleAvailable / nextBaseWidth,
            nextMinScale,
            nextMaxScale,
          )
        : nextMaxScale;

      const nextX = (leftOccupied + rightOccupied) * 0.5;
      const nextY = row1Y;
      const bottomY =
        row1Y +
        Math.max(
          backHeight,
          levelHeight,
          nextVisible ? nextBaseHeight * nextScale : 0,
        ) *
          0.5;

      return {
        row1Y,
        backX: leftEdge + backWidth * 0.5,
        levelX: rightEdge,
        nextX,
        nextY,
        nextScale,
        bottomY,
      };
    }

    const rowGap = Math.max(8, this.layout.height * 0.012);
    const row1Bottom = row1Y + Math.max(backHeight, levelHeight) * 0.5;

    const nextScale = nextVisible
      ? Phaser.Math.Clamp(
          (this.layout.width - this.layout.safePadding * 2 - 24) /
            nextBaseWidth,
          nextMinScale,
          nextMaxScale,
        )
      : nextMaxScale;
    const nextY = row1Bottom + rowGap + nextBaseHeight * nextScale * 0.5;
    const bottomY = nextVisible
      ? nextY + nextBaseHeight * nextScale * 0.5
      : row1Bottom;

    return {
      row1Y,
      backX: leftEdge + backWidth * 0.5,
      levelX: rightEdge,
      nextX: this.layout.width * 0.5,
      nextY,
      nextScale,
      bottomY,
    };
  }

  private isPreviewHitDebugEnabled(): boolean {
    const fromGlobal = this.readPreviewDebugGlobalFlag();
    if (fromGlobal !== null) {
      return fromGlobal;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem(PREVIEW_HIT_DEBUG_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private isPreviewDebugLogEnabled(): boolean {
    const fromGlobal = this.readPreviewDebugLogGlobalFlag();
    if (fromGlobal !== null) {
      return fromGlobal;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem(PREVIEW_DEBUG_LOG_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private readPreviewDebugGlobalFlag(): boolean | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = (window as unknown as Record<string, unknown>)[
      PREVIEW_HIT_DEBUG_GLOBAL_KEY
    ];
    if (typeof raw === 'boolean') {
      return raw;
    }

    return null;
  }

  private readPreviewDebugLogGlobalFlag(): boolean | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = (window as unknown as Record<string, unknown>)[
      PREVIEW_DEBUG_LOG_GLOBAL_KEY
    ];
    if (typeof raw === 'boolean') {
      return raw;
    }

    return null;
  }

  private handleScenePointerDown(
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
  ): void {
    if (!this.isTargetZoomOpen && this.isPointerInsidePreview(pointer)) {
      this.logPreviewDebug('scene fallback preview pointerdown', {
        id: pointer.id,
        x: Math.round(pointer.x),
        y: Math.round(pointer.y),
      });
      this.openTargetPreviewModal();
      return;
    }

    if (!this.previewDebugLogsEnabled) {
      return;
    }

    const insidePreview = Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(
        this.targetCardBounds.x,
        this.targetCardBounds.y,
        this.targetCardBounds.width,
        this.targetCardBounds.height,
      ),
      pointer.x,
      pointer.y,
    );

    if (!insidePreview) {
      return;
    }

    const over = currentlyOver
      .map((obj) => {
        const anyObj = obj as unknown as {
          name?: string;
          type?: string;
          depth?: number;
        };
        const type = anyObj.type ?? 'Unknown';
        const depth = anyObj.depth ?? 0;
        const name = anyObj.name ? `:${anyObj.name}` : '';
        return `${type}${name}@${depth}`;
      })
      .join(', ');

    this.logPreviewDebug('pointerdown currentlyOver at preview', {
      x: Math.round(pointer.x),
      y: Math.round(pointer.y),
      over,
    });
  }

  private isPointerInsidePreview(pointer: Phaser.Input.Pointer): boolean {
    return Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(
        this.targetCardBounds.x,
        this.targetCardBounds.y,
        this.targetCardBounds.width,
        this.targetCardBounds.height,
      ),
      pointer.x,
      pointer.y,
    );
  }

  private logPreviewDebug(
    message: string,
    data?: Record<string, unknown>,
  ): void {
    if (!this.previewDebugLogsEnabled) {
      return;
    }

    if (data) {
      console.log('[PreviewDebug]', message, data);
      return;
    }

    console.log('[PreviewDebug]', message);
  }

  private updatePreviewDebugLabel(text: string): void {
    if (!this.previewDebugLabel) {
      return;
    }

    this.previewDebugLabel.setText(text);

    this.time.delayedCall(700, () => {
      if (!this.previewDebugLabel || text === 'PREVIEW HIT READY') {
        return;
      }

      this.previewDebugLabel.setText('PREVIEW HIT READY');
    });
  }

  private exposePreviewModalDebugHook(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const api = window as unknown as Record<string, unknown>;
    api.poseBuddyOpenTargetPreviewModal = () => {
      this.logPreviewDebug('window.poseBuddyOpenTargetPreviewModal called');
      this.openTargetPreviewModal();
    };
  }

  private removePreviewModalDebugHook(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const api = window as unknown as Record<string, unknown>;
    delete api.poseBuddyOpenTargetPreviewModal;
  }
}
