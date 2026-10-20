/**
 * ToneRelay - 专属滤镜库管理器
 */

class PresetStore {
  constructor(storageKey = 'tonerelay_presets') {
    this.storageKey = storageKey;
    this.memoryStorage = new Map();
  }

  _isBrowserStorageAvailable() {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  }

  _loadAll() {
    if (this._isBrowserStorageAvailable()) {
      try {
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return Array.from(this.memoryStorage.values());
  }

  _saveAll(list) {
    if (this._isBrowserStorageAvailable()) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(list));
      } catch (e) {
        console.error('LocalStorage 写入失败', e);
      }
    } else {
      this.memoryStorage.clear();
      for (const item of list) {
        this.memoryStorage.set(item.id, item);
      }
    }
  }

  /**
   * 保存当前配方为专属滤镜
   * @param {import('../types').StyleRecipe} recipe 
   * @param {string} [customName] 
   * @returns {Object}
   */
  savePreset(recipe, customName) {
    const list = this._loadAll();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const name = customName && customName.trim()
      ? customName.trim()
      : `专属滤镜_${dateStr}_${list.length + 1}`;

    const presetItem = {
      ...recipe,
      name,
      savedAt: Date.now()
    };

    // 查重更新或头部插入
    const existingIdx = list.findIndex((item) => item.id === presetItem.id);
    if (existingIdx >= 0) {
      list[existingIdx] = presetItem;
    } else {
      list.unshift(presetItem);
    }

    this._saveAll(list);
    return presetItem;
  }

  /**
   * 列出所有已保存滤镜 (按时间倒序)
   */
  listPresets() {
    return this._loadAll().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }

  /**
   * 根据 ID 查询滤镜
   */
  getPresetById(id) {
    const list = this._loadAll();
    return list.find((item) => item.id === id) || null;
  }

  /**
   * 根据 ID 删除滤镜
   */
  deletePreset(id) {
    const list = this._loadAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length !== list.length) {
      this._saveAll(filtered);
      return true;
    }
    return false;
  }
}

module.exports = {
  PresetStore
};
