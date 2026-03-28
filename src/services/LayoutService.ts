export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PortraitLayout {
  width: number;
  height: number;
  safePadding: number;
  safeTop: number;
  safeBottom: number;
  safeInsetTop: number;
  safeInsetRight: number;
  safeInsetBottom: number;
  safeInsetLeft: number;
  headerRow1Y: number;
  headerRow2Y: number;
  topArea: Rect;
  boardArea: Rect;
  bottomArea: Rect;
  isPortrait: boolean;
}

export interface PaddedPageLayout {
  titleY: number;
  content: Rect;
}

export class LayoutService {
  public static createPortraitLayout(
    width: number,
    height: number,
  ): PortraitLayout {
    const insets = getSafeAreaInsets();
    const minSide = Math.min(width, height);
    const edgePadding = clamp(minSide * 0.042, 12, 24);
    const horizontalInset = Math.max(insets.left, insets.right);
    const safePadding = edgePadding + horizontalInset;
    const safeTop = insets.top + edgePadding + clamp(height * 0.012, 8, 16);
    const safeBottom = insets.bottom + edgePadding;
    const isPortrait = height >= width;

    const usableHeight = height - safeTop - safeBottom;
    const compactness = clamp((height / Math.max(width, 1) - 1.6) / 1.2, 0, 1);

    const headerRatio = 0.12 - compactness * 0.01;
    const topRatio = 0.23 - compactness * 0.02;
    const bottomRatio = 0.17 - compactness * 0.02;

    const headerHeight = clamp(usableHeight * headerRatio, 76, 124);
    const topHeight = clamp(usableHeight * topRatio, 108, 192);
    const bottomHeight = clamp(usableHeight * bottomRatio, 86, 152);
    const verticalGap = clamp(usableHeight * 0.014, 6, 12);

    const topAreaY = safeTop + headerHeight;
    const boardY = topAreaY + topHeight + verticalGap;
    const bottomY = height - bottomHeight - safeBottom;
    const boardHeight = Math.max(88, bottomY - boardY - verticalGap);

    return {
      width,
      height,
      safePadding,
      safeTop,
      safeBottom,
      safeInsetTop: insets.top,
      safeInsetRight: insets.right,
      safeInsetBottom: insets.bottom,
      safeInsetLeft: insets.left,
      isPortrait,
      headerRow1Y: safeTop,
      headerRow2Y: safeTop + clamp(headerHeight * 0.48, 34, 48),
      topArea: {
        x: safePadding,
        y: topAreaY,
        width: width - safePadding * 2,
        height: topHeight,
      },
      boardArea: {
        x: safePadding,
        y: boardY,
        width: width - safePadding * 2,
        height: boardHeight,
      },
      bottomArea: {
        x: safePadding,
        y: bottomY,
        width: width - safePadding * 2,
        height: bottomHeight,
      },
    };
  }

  public static createPaddedPageLayout(
    layout: PortraitLayout,
  ): PaddedPageLayout {
    const horizontalPadding = clamp(layout.width * 0.082, 20, 38);
    const maxContentWidth = clamp(
      layout.width - horizontalPadding * 2,
      280,
      460,
    );
    const contentX = (layout.width - maxContentWidth) * 0.5;

    const titleY = layout.safeTop + clamp(layout.height * 0.018, 18, 26);
    const contentTop = titleY + clamp(layout.height * 0.092, 76, 108);
    const contentBottom = layout.height - layout.safeBottom;

    return {
      titleY,
      content: {
        x: contentX,
        y: contentTop,
        width: maxContentWidth,
        height: Math.max(120, contentBottom - contentTop),
      },
    };
  }
}

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = window.getComputedStyle(document.documentElement);

  return {
    top: parsePx(style.getPropertyValue('--safe-area-inset-top')),
    right: parsePx(style.getPropertyValue('--safe-area-inset-right')),
    bottom: parsePx(style.getPropertyValue('--safe-area-inset-bottom')),
    left: parsePx(style.getPropertyValue('--safe-area-inset-left')),
  };
}

function parsePx(raw: string): number {
  const normalized = raw.trim().replace('px', '');
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
