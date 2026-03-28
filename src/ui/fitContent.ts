export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FitResult {
  rect: RectLike;
  scale: number;
}

export function fitContentIntoRect(
  contentWidth: number,
  contentHeight: number,
  targetRect: RectLike,
  padding: number,
): FitResult {
  const safePadding = Math.max(0, padding);
  const innerWidth = Math.max(1, targetRect.width - safePadding * 2);
  const innerHeight = Math.max(1, targetRect.height - safePadding * 2);

  const scale = Math.min(
    innerWidth / Math.max(1e-6, contentWidth),
    innerHeight / Math.max(1e-6, contentHeight),
  );
  const fittedWidth = contentWidth * scale;
  const fittedHeight = contentHeight * scale;

  return {
    scale,
    rect: {
      x: targetRect.x + (targetRect.width - fittedWidth) * 0.5,
      y: targetRect.y + (targetRect.height - fittedHeight) * 0.5,
      width: fittedWidth,
      height: fittedHeight,
    },
  };
}
