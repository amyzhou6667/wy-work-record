/**
 * ToneRelay - 数据契约与核心类型定义
 */

/**
 * 校验 StyleRecipe 结构完整性
 * @param {Object} recipe
 * @returns {boolean}
 */
function isValidStyleRecipe(recipe) {
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
const DEFAULT_GRADING_OPTIONS = {
  intensity: 1.0,      // 100% 迁移强度
  protectSkin: true    // 开启人像肤色保护
};

/**
 * 规范化调色控制选项
 * @param {Object} options
 * @returns {{intensity: number, protectSkin: boolean}}
 */
function normalizeGradingOptions(options = {}) {
  const intensity = typeof options.intensity === 'number' 
    ? Math.max(0.0, Math.min(1.0, options.intensity))
    : DEFAULT_GRADING_OPTIONS.intensity;
  
  const protectSkin = typeof options.protectSkin === 'boolean'
    ? options.protectSkin
    : DEFAULT_GRADING_OPTIONS.protectSkin;

  return { intensity, protectSkin };
}

module.exports = {
  isValidStyleRecipe,
  DEFAULT_GRADING_OPTIONS,
  normalizeGradingOptions
};
