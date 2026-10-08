import test from 'node:test';
import assert from 'node:assert/strict';
import { SleepBlocker } from '../src/platform/sleep_blocker.js';

test('SleepBlocker: 应当能正确启动保活并在结束时释放', () => {
  const blocker = new SleepBlocker();
  
  assert.equal(blocker.isActive(), false);
  
  blocker.enable();
  assert.equal(blocker.isActive(), true);

  blocker.disable();
  assert.equal(blocker.isActive(), false);
});
