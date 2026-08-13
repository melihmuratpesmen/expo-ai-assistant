import { Dimensions } from 'react-native';

export const AI_BUTTON_SIZE = 52;
/** Distance from the overlay bottom — high enough to clear home indicator / chrome. */
export const AI_BUTTON_BOTTOM_OFFSET = 148;
export const AI_BUTTON_RIGHT_OFFSET = 20;

export interface AiButtonPoint {
  x: number;
  y: number;
}

export interface AiOverlayLayout {
  width: number;
  height: number;
}

export function getDefaultAiButtonPosition(
  insets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  },
  layout?: AiOverlayLayout | null
): AiButtonPoint {
  const window = Dimensions.get('window');
  const width = layout?.width || window.width;
  const height = layout?.height || window.height;
  const usingOverlayLayout = !!layout && layout.height > 0;

  // Nested overlay already sits above the home indicator; don't subtract it twice.
  const bottomInset = usingOverlayLayout ? 0 : insets.bottom;
  const rightInset = usingOverlayLayout ? 0 : insets.right;

  const x = width - AI_BUTTON_RIGHT_OFFSET - AI_BUTTON_SIZE - rightInset;
  const y = height - AI_BUTTON_BOTTOM_OFFSET - AI_BUTTON_SIZE - bottomInset;

  return clampAiButtonPosition({ x, y }, insets, layout);
}

/** Sürükleme sonrası butonu overlay / ekran sınırları içinde tutar. */
export function clampAiButtonPosition(
  point: AiButtonPoint,
  insets: { top: number; bottom: number; left: number; right: number },
  layout?: AiOverlayLayout | null
): AiButtonPoint {
  const window = Dimensions.get('window');
  const width = layout?.width || window.width;
  const height = layout?.height || window.height;
  const usingOverlayLayout = !!layout && layout.height > 0;

  const minX = (usingOverlayLayout ? 0 : insets.left) + 8;
  const maxX = width - AI_BUTTON_SIZE - (usingOverlayLayout ? 0 : insets.right) - 8;
  const minY = (usingOverlayLayout ? 0 : insets.top) + 8;
  const maxY = height - AI_BUTTON_SIZE - (usingOverlayLayout ? 0 : insets.bottom) - 8;

  return {
    x: Math.min(Math.max(point.x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(point.y, minY), Math.max(minY, maxY)),
  };
}

/** Yatay kenara snap (sağ veya sol). */
export function snapAiButtonToHorizontalEdge(
  point: AiButtonPoint,
  insets: { left: number; right: number }
): AiButtonPoint {
  const { width } = Dimensions.get('window');
  const centerX = point.x + AI_BUTTON_SIZE / 2;
  const snapLeft = insets.left + 16;
  const snapRight = width - AI_BUTTON_SIZE - insets.right - 16;
  return {
    ...point,
    x: centerX < width / 2 ? snapLeft : snapRight,
  };
}
