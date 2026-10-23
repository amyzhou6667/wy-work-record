/**
 * ToneRelay - 数据契约与核心类型定义 (TypeScript)
 */

export interface HighlightShadowColor {
  hue: number;
  saturation: number;
  weight?: number;
}

export interface ToneCurve {
  p10?: number;
  p30?: number;
  p50?: number;
  p70?: number;
  p90?: number;
  contrastSlope?: number;
  fadeBlack?: number;
  isHighKey?: boolean;
}

export interface CinemaSplit {
  isCinemaTealOrange?: boolean;
  contrastBonus?: number;
}

export interface GreenChannel {
  targetHue: number;
  targetSat: number;
  targetVal?: number;
  shadowHue?: number;
  highlightHue?: number;
  isDesaturatedGreen?: boolean;
}

export interface StyleRecipe {
  id: string;
  exposureOffset: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: HighlightShadowColor;
  shadows: HighlightShadowColor;
  filmGrain: number;
  vignette: number;
  tags: string[];
  dominantPalette: string[];
  toneCurve?: ToneCurve;
  cinemaSplit?: CinemaSplit;
  greenChannel?: GreenChannel;
  extractedAt?: number;
}

export interface PresetItem extends StyleRecipe {
  name: string;
  savedAt: number;
}

export interface GradingOptions {
  intensity?: number;
  protectSkin?: boolean;
  referenceImageData?: any;
  usePitieTransfer?: boolean;
}

export interface NormalizedGradingOptions {
  intensity: number;
  protectSkin: boolean;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * 校验 StyleRecipe 结构完整性
 */
export function isValidStyleRecipe(recipe: any): boolean {
  if (!recipe || typeof recipe !== 'object') return false;
  if (!recipe.id || typeof recipe.id !== 'string') return false;
  if (typeof recipe.exposureOffset !== 'number') return false;
  if (typeof recipe.contrast !== 'number') return false;
  if (typeof recipe.saturation !== 'number') return false;
  if (typeof recipe.temperature !== 'number') return false;
  if (typeof recipe.tint !== 'number') return false;
  if (!recipe.highlights || typeof recipe.highlights.hue !== 'number') return false;
  if (!recipe.shadows || typeof recipe.shadows.hue !== 'number') return false;
  if (typeof recipe.filmGrain !== 'number') return false;
  if (typeof recipe.vignette !== 'number') return false;
  if (!Array.isArray(recipe.tags)) return false;
  if (!Array.isArray(recipe.dominantPalette)) return false;
  return true;
}

/**
 * 默认调色控制选项
 */
export const DEFAULT_GRADING_OPTIONS: NormalizedGradingOptions = {
  intensity: 1.0,      // 100% 迁移强度
  protectSkin: true    // 开启人像肤色保护
};

/**
 * 规范化调色控制选项
 */
export function normalizeGradingOptions(options: GradingOptions = {}): NormalizedGradingOptions {
  const intensity = typeof options.intensity === 'number' 
    ? Math.max(0.0, Math.min(1.0, options.intensity))
    : DEFAULT_GRADING_OPTIONS.intensity;
  
  const protectSkin = typeof options.protectSkin === 'boolean'
    ? options.protectSkin
    : DEFAULT_GRADING_OPTIONS.protectSkin;

  return { intensity, protectSkin };
}
