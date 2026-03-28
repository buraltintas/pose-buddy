import Phaser from 'phaser';

interface CreateHitAreaOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  centered?: boolean;
  cursor?: string;
}

export interface ControlHitArea {
  zone: Phaser.GameObjects.Zone;
  outline?: Phaser.GameObjects.Rectangle;
  centered: boolean;
}

const DEBUG_GLOBAL_KEY = '__POSE_BUDDY_DEBUG_HIT_AREAS__';
const DEBUG_STORAGE_KEY = 'POSE_BUDDY_DEBUG_HIT_AREAS';

export function createControlHitArea(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  options: CreateHitAreaOptions,
): ControlHitArea {
  const centered = options.centered ?? true;
  const topLeftX = centered ? options.x - options.width * 0.5 : options.x;
  const topLeftY = centered ? options.y - options.height * 0.5 : options.y;
  const zone = scene.add.zone(
    topLeftX,
    topLeftY,
    options.width,
    options.height,
  );
  zone.setOrigin(0, 0);
  zone.setDepth(1);
  setZoneInteractive(zone, options.width, options.height, centered);
  zone.input!.cursor = options.cursor ?? 'pointer';
  parent.add(zone);

  let outline: Phaser.GameObjects.Rectangle | undefined;
  if (isHitAreaDebugEnabled()) {
    outline = scene.add
      .rectangle(topLeftX, topLeftY, options.width, options.height)
      .setStrokeStyle(2, 0xff4d4f, 0.95)
      .setFillStyle(0xff4d4f, 0.08)
      .setDepth(2);
    outline.setOrigin(0, 0);
    parent.add(outline);
  }

  return { zone, outline, centered };
}

export function resizeControlHitArea(
  hitArea: ControlHitArea,
  options: Omit<CreateHitAreaOptions, 'cursor'>,
): void {
  const centered = options.centered ?? hitArea.centered;
  const topLeftX = centered ? options.x - options.width * 0.5 : options.x;
  const topLeftY = centered ? options.y - options.height * 0.5 : options.y;

  hitArea.zone.setPosition(topLeftX, topLeftY);
  hitArea.zone.setSize(options.width, options.height);
  hitArea.zone.setOrigin(0, 0);
  setZoneInteractive(hitArea.zone, options.width, options.height, centered);

  if (hitArea.outline) {
    hitArea.outline
      .setPosition(topLeftX, topLeftY)
      .setSize(options.width, options.height)
      .setOrigin(0, 0);
  }
}

function setZoneInteractive(
  zone: Phaser.GameObjects.Zone,
  width: number,
  height: number,
  _centered: boolean,
): void {
  zone.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
}

function isHitAreaDebugEnabled(): boolean {
  const globalFlag = readGlobalDebugFlag();
  if (globalFlag !== null) {
    return globalFlag;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function readGlobalDebugFlag(): boolean | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = (window as unknown as Record<string, unknown>)[DEBUG_GLOBAL_KEY];
  if (typeof raw === 'boolean') {
    return raw;
  }

  return null;
}
