import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { JsonStore } from '../src/storage/store.ts';

const TEST_DATA_DIR = path.resolve('projects/LifeCompass/data_test');

describe('JsonStore Persistent Engine', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  test('should initialize directory and write/read item correctly', async () => {
    const store = new JsonStore(TEST_DATA_DIR);
    await store.set('users', 'user_1', { name: 'Alice', age: 28 });

    const user = await store.get<{ name: string; age: number }>('users', 'user_1');
    assert.ok(user);
    assert.strictEqual(user.name, 'Alice');
    assert.strictEqual(user.age, 28);
  });

  test('should return null when reading non-existent item', async () => {
    const store = new JsonStore(TEST_DATA_DIR);
    const nonExistent = await store.get('users', 'user_none');
    assert.strictEqual(nonExistent, null);
  });

  test('should list all items in a collection', async () => {
    const store = new JsonStore(TEST_DATA_DIR);
    await store.set('goals', 'g1', { title: 'Goal 1' });
    await store.set('goals', 'g2', { title: 'Goal 2' });

    const list = await store.list<{ title: string }>('goals');
    assert.strictEqual(list.length, 2);
    const titles = list.map((g) => g.title).sort();
    assert.deepStrictEqual(titles, ['Goal 1', 'Goal 2']);
  });

  test('should delete item correctly', async () => {
    const store = new JsonStore(TEST_DATA_DIR);
    await store.set('goals', 'g1', { title: 'Goal 1' });
    const deleted = await store.delete('goals', 'g1');
    assert.strictEqual(deleted, true);

    const check = await store.get('goals', 'g1');
    assert.strictEqual(check, null);
  });
});
