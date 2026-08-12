import { Dimensions } from 'react-native';

export const AI_BUTTON_SIZE = 52;
/** GlobalFAB'ın üstünde kalması için ekstra boşluk (FAB ~56px + margin). */
export const AI_BUTTON_BOTTOM_OFFSET = 96;
export const AI_BUTTON_RIGHT_OFFSET = 24;

export interface AiButtonPoint {
  x: number;
  y: number;
}

export function getDefaultAiButtonPosition(insets: {
  top: number;
  bottom: number;
  left: number;
  right: number;
}): AiButtonPoint {
  const { width, height } = Dimensions.get('window');
  return {
    x: width - AI_BUTTON_RIGHT_OFFSET - AI_BUTTON_SIZE - insets.right,
    y: height - AI_BUTTON_BOTTOM_OFFSET - AI_BUTTON_SIZE - insets.bottom,
  };
}

/** Sürükleme sonrası butonu ekran sınırları içinde tutar. */
export function clampAiButtonPosition(
  point: AiButtonPoint,
  insets: { top: number; bottom: number; left: number; right: number }
): AiButtonPoint {
  const { width, height } = Dimensions.get('window');
  const minX = insets.left + 8;
  const maxX = width - AI_BUTTON_SIZE - insets.right - 8;
  const minY = insets.top + 8;
  const maxY = height - AI_BUTTON_SIZE - insets.bottom - 8;

  return {
    x: Math.min(Math.max(point.x, minX), maxX),
    y: Math.min(Math.max(point.y, minY), maxY),
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
