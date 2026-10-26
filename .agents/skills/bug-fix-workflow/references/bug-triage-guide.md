# Bug 排查与根因分析实用指南 (Bug Triage & Root Cause Guide)

本指南为 `bug-fix-workflow` 技能的补充参考，提供快速复现、编写红灯测试及防止回归的实战策略。

---

## 一、排查五步法 (The 5-Step Triage)

```text
现象捕捉 ──> 隔离实验环境 ──> 捕获真实堆栈 ──> 编写失败测试 ──> 消除根因
```

1. **观察表象**：提取用户描述中的“触发条件”、“输入数据”、“实际结果”与“预期结果”。
2. **剔除干扰**：在最小的上下文环境中独立验证，避免被外部长流程干扰。
3. **真实堆栈优先**：直接查看控制台第一条抛出的底层 Exception（如 `SyntaxError`、`TypeError`、`AssertionError`），不轻信二次包装的笼统提示。
4. **测试固化**：把导致异常的边界输入固化为测试用例中的输入数据（Fixture）。
5. **根除病灶**：在最贴近产生源头的代码层修复，而非在表现层打补丁或捕获吞掉错误。

---

## 二、常见应用场景的复现与红灯测试范式

### 场景 1：前端 UI / 浏览器加载阻塞 Bug
- **典型现象**：界面长时间卡在 Loading / 白屏 / 按钮无响应。
- **复现手段**：
  - 使用 Node.js 的 `node:vm` 模拟无头浏览器上下文，读取打包或伺服的脚本并尝试编译/运行；
  - 检查服务端返回的 HTTP 响应头（`Content-Type` 是否为 `application/javascript`）及文件语法。
- **测试先行编写示例** (`tests/ui_serve.test.ts` / `tests/component.test.ts`)：
  ```typescript
  import test from 'node:test';
  import assert from 'node:assert/strict';

  test('UI: 脚本不得包含浏览器不支持的顶层 export 关键字', async () => {
    const res = await fetch('http://127.0.0.1:8088/App.tsx');
    const content = await res.text();
    // 先行测试：如果包含裸 export，测试必须失败 (Red)
    assert.equal(content.includes('export const App'), false, '经典脚本模式下不得包含顶层 export');
  });
  ```

### 场景 2：算法逻辑 / 边界条件 Bug
- **典型现象**：特定图片或极端参数下计算崩溃、色彩失真或除以零。
- **复现手段**：
  - 构造包含极限值（如全 0、全 255、NaN、极窄色域、超大尺寸）的 Mock 数据。
- **测试先行编写示例** (`tests/extractor.test.ts`)：
  ```typescript
  test('Extractor: 当遇到全白/纯高光图片时，不得出现 NaN 或死循环', () => {
    const whiteImage = createMockPureImage(100, 100, [255, 255, 255, 255]);
    // 先行断言期望行为，当前存在 bug 时会抛出异常或返回 NaN
    const recipe = extractRecipe(whiteImage);
    assert.ok(!Number.isNaN(recipe.contrast), '对比度不应为 NaN');
  });
  ```

### 场景 3：异步时序与并发竞争 Bug
- **典型现象**：多次快速点击产生竞态、批处理队列卡死、资源未释放。
- **复现手段**：
  - 在测试中快速并发触发目标方法，模拟网络延迟波动与乱序返回。
- **测试先行编写示例** (`tests/batch_pipeline.test.ts`)：
  ```typescript
  test('Pipeline: 某个中间任务异常时不应挂起整个队列', async () => {
    const pipeline = new BatchPipeline([validItem, brokenItem, validItem]);
    const result = await pipeline.run();
    assert.equal(result.finishedCount, 2, '正常任务应完成');
    assert.equal(result.failedCount, 1, '异常任务应被记录而不阻断整体');
  });
  ```

---

## 三、修复完成度检查清单 (Done Checklist)

- [ ] 是否在修复前获得了**明确的红灯（Red）失败测试**？
- [ ] 修复代码是否**仅改动必要部分**，无多余冗余改动？
- [ ] 新测试用例是否顺利转为**绿灯（Green）**？
- [ ] 是否执行了全量测试套件（`node --test projects/.../tests/*.test.ts`）并达到 **100% Pass**？
- [ ] 代码中是否严格遵循了 TypeScript 规约（`.ts` / `.tsx`），无旧 `.js` 引入？
