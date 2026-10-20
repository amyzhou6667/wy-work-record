const test = require('node:test');
const assert = require('node:assert/strict');
const { PresetStore } = require('../src/pipeline/preset_store');
const { extractRecipe } = require('../src/core/extractor');
const { createGradientImage } = require('./helpers/image_mock');

test('PresetStore: 成功保存专属滤镜并持久化', () => {
  const store = new PresetStore();
  const recipe = extractRecipe(createGradientImage(20, 20));

  const saved = store.savePreset(recipe, '日落橘调_20261020');
  assert.equal(saved.name, '日落橘调_20261020');
  assert.equal(store.listPresets().length, 1);
});

test('PresetStore: 未提供名称时应自动生成默认中文命名', () => {
  const store = new PresetStore();
  const recipe = extractRecipe(createGradientImage(20, 20));

  const saved = store.savePreset(recipe);
  assert.match(saved.name, /专属滤镜_/);
});

test('PresetStore: 支持根据 ID 查询和删除滤镜', () => {
  const store = new PresetStore();
  const recipe = extractRecipe(createGradientImage(20, 20));
  const saved = store.savePreset(recipe, '待删除滤镜');

  assert.ok(store.getPresetById(saved.id));
  const success = store.deletePreset(saved.id);
  assert.equal(success, true);
  assert.equal(store.listPresets().length, 0);
  assert.equal(store.getPresetById(saved.id), null);
});
