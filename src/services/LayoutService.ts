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
    const minSide = Math.min(width, height);
    const safePadding = clamp(minSide * 0.042, 12, 24);
    const safeTop = safePadding + clamp(height * 0.025, 14, 30);
    const isPortrait = height >= width;

    const usableHeight = height - safeTop - safePadding;
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
    const bottomY = height - bottomHeight - safePadding;
    const boardHeight = Math.max(88, bottomY - boardY - verticalGap);

    return {
      width,
      height,
      safePadding,
      safeTop,
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
    const contentBottom = layout.height - layout.safePadding;

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
