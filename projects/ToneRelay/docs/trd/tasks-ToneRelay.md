# 【研发实施任务拆解与测试计划】ToneRelay

| 责任人 | 关联 PRD | 关联 TRD | 计划周期 |
| :--- | :--- | :--- | :--- |
| 研发架构与核心工程团队 | [PRD 链接](../prd/PRD-ToneRelay-智能影调迁移与批量修图伴侣.md) | [TRD 链接](./TRD-ToneRelay-技术架构方案.md) | 迭代周期 (MVP) |

---

## 🎯 拆解原则
- **微任务化**：单个微任务粒度聚焦，代码实现可在独立单元完成并独立验证。
- **严格 TDD (红-绿-重构)**：基于接口签名契约先行编写测试用例 (Red)，再实现业务功能使其通过 (Green)，杜绝“先写代码后补测试”。
- **0 失败门禁**：每个任务完成后单测通过率必须为 100%。

---

## 📝 任务清单 (Task Checklist)

### 阶段一：数据契约与测试基线准备
- [x] **Task 1.1: 数据模型与契约定义**
  - **改动范围**：`projects/ToneRelay/src/types/index.ts`
  - **目标**：实现 `StyleRecipe`、`GradingOptions`、`BatchTaskItem` 等核心实体与验证方法。
  - **验收命令**：`node -e "require('./projects/ToneRelay/src/types')"`
- [x] **Task 1.2: 测试脚手架与 Mock 图像生成工具**
  - **改动范围**：`projects/ToneRelay/tests/helpers/image_mock.ts`
  - **目标**：构造纯色图、渐变图、含模拟肤色像素的 ImageData 辅助生成器。
  - **验收命令**：`node -e "require('./projects/ToneRelay/tests/helpers/image_mock')"`

### 阶段二：算法核心引擎 (TDD 闭环)
- [x] **Task 2.1: 前置参考图特征门控 (Feature Validator)**
  - **测试用例**：`projects/ToneRelay/tests/validator.test.ts`
  - **实现文件**：`projects/ToneRelay/src/core/validator.ts`
  - **验证命令**：`node --test projects/ToneRelay/tests/validator.test.ts`
- [x] **Task 2.2: 色彩与影调配方解构提取器 (Feature Extractor)**
  - **测试用例**：`projects/ToneRelay/tests/extractor.test.ts`
  - **实现文件**：`projects/ToneRelay/src/core/extractor.ts`
  - **验证命令**：`node --test projects/ToneRelay/tests/extractor.test.ts`
- [x] **Task 2.3: 智能人像肤色保护软蒙版 (Skin Guard)**
  - **测试用例**：`projects/ToneRelay/tests/skin_guard.test.ts`
  - **实现文件**：`projects/ToneRelay/src/core/skin_guard.ts`
  - **验证命令**：`node --test projects/ToneRelay/tests/skin_guard.test.ts`
- [x] **Task 2.4: 自动曝光预对齐器 (Exposure Aligner)**
  - **测试用例**：`projects/ToneRelay/tests/exposure.test.ts`
  - **实现文件**：`projects/ToneRelay/src/core/exposure.ts`
  - **验证命令**：`node --test projects/ToneRelay/tests/exposure.test.ts`
- [x] **Task 2.5: 调色渲染与质感合成引擎 (Grading Renderer)**
  - **测试用例**：`projects/ToneRelay/tests/renderer.test.ts`
  - **实现文件**：`projects/ToneRelay/src/core/renderer.ts`
  - **验证命令**：`node --test projects/ToneRelay/tests/renderer.test.ts`

### 阶段三：批处理流水线与滤镜资产
- [x] **Task 3.1: 串行防 OOM 批量导出管道 (Batch Pipeline)**
  - **测试用例**：`projects/ToneRelay/tests/batch_pipeline.test.ts`
  - **实现文件**：`projects/ToneRelay/src/pipeline/batch_pipeline.ts`
  - **验证命令**：`node --test projects/ToneRelay/tests/batch_pipeline.test.ts`
- [x] **Task 3.2: 专属滤镜库管理器 (Preset Store)**
  - **测试用例**：`projects/ToneRelay/tests/preset_store.test.ts`
  - **实现文件**：`projects/ToneRelay/src/pipeline/preset_store.ts`
  - **验证命令**：`node --test projects/ToneRelay/tests/preset_store.test.ts`

### 阶段四：集成验证与轻量端侧交互界面
- [x] **Task 4.1: 全链路 E2E 自动化测试套件**
  - **验收标准**：模拟上传参考图 ➡️ 门控检查 ➡️ 提取配方 ➡️ 调节强度 ➡️ 批量九宫格导出，全流程通过。
  - **验证命令**：`node --test projects/ToneRelay/tests/e2e.test.ts`
- [x] **Task 4.2: 移动端 H5 响应式前端交互原型 (Web Preview)**
  - **实现文件**：
    - `projects/ToneRelay/src/ui/index.html`
    - `projects/ToneRelay/src/ui/styles.css`
    - `projects/ToneRelay/src/ui/app.ts`
  - **验收标准**：双槽选图、卷帘拖动对比、强度滑块、九宫格批量进度交互完整可用。

### 阶段五：植被色彩空间黄绿联动与灰绿深度压制专项调优
- [x] **Task 5.1: 灰绿与黄绿植被色彩空间 TDD 单元测试集**
  - **改动范围**：`projects/ToneRelay/tests/green_tuning.test.ts`
  - **目标**：验证低饱和莫兰迪灰绿捕获、黄绿嫩叶植被联动、原图高饱和刺眼绿深度压制。
  - **验证命令**：`node --test projects/ToneRelay/tests/green_tuning.test.ts`
- [x] **Task 5.2: 提取器扩展植被色彩域与无偏饱和度统计**
  - **改动范围**：`projects/ToneRelay/src/core/extractor.ts`
  - **目标**：放宽灰绿采样下限 ($s \ge 0.05$)，扩充植被色相域至 $38^\circ \sim 175^\circ$，改用中位数和高斯权值消除虚高饱和度。
- [x] **Task 5.3: 渲染引擎深度自适应压制与全局饱和度保护**
  - **改动范围**：`projects/ToneRelay/src/core/renderer.ts`、`projects/ToneRelay/src/ui/engine.ts`
  - **目标**：建立植被平滑引导矩阵，施加灰绿深度阻尼压缩，并在全局饱和度提升环节引入植被防打架保护。
- [x] **Task 5.4: 语义色区直接 1:1 复用与“换色不换光”光影保留**
  - **改动范围**：`projects/ToneRelay/src/core/renderer.ts`、`projects/ToneRelay/src/ui/engine.ts`、`projects/ToneRelay/tests/green_tuning.test.ts`
  - **目标**：实现语义色区直复用架构，将待修图绿色通道的色相与饱和度 1:1 替换为参考图绿色，同时 100% 完整保留原图明暗纹理与立体感。

### 阶段六：通用全风格自适应解析与电影/胶片多阶段合成 (Universal Engine)
- [x] **Task 6.1: 通用全风格解构与迁移 TDD 单元测试套件**
  - **改动范围**：`projects/ToneRelay/tests/universal_style.test.ts`
  - **目标**：覆盖大面积白色高调胶片风、电影 Teal-Orange 撞色、拉普拉斯高频颗粒度自动检测、明度自适应颗粒与镜头暗角。
  - **验证命令**：`node --test projects/ToneRelay/tests/universal_style.test.ts`
- [x] **Task 6.2: 通用特征提取器 (Universal Extractor)**
  - **改动范围**：`projects/ToneRelay/src/core/extractor.ts`
  - **目标**：实现 RGB 转 CIE-Lab 正交空间变换、5 点分位数光影曲线分析、动态分位数色调划分、高频拉普拉斯颗粒感与镜头暗角检测。
- [x] **Task 6.3: 通用多阶段影调与质感渲染引擎 (Universal Renderer)**
  - **改动范围**：`projects/ToneRelay/src/core/renderer.ts`、`projects/ToneRelay/src/ui/engine.ts`
  - **目标**：实现黑位抬升灰雾感 (Lifted Blacks) 保底、日系高调透亮微提、好莱坞电影冷暖对冲注入、高光无噪明度自适应颗粒合成。

### 阶段七：Pitié 3D 色彩概率分布传输 (MKL) 与空间保真导向滤波 (Guided Filter)
- [x] **Task 7.1: Pitié 3D 传输与导向滤波 TDD 单元测试套件**
  - **测试用例**：`projects/ToneRelay/tests/color_transfer.test.ts`
  - **目标**：验证 1D CDF 连续累积直方图精确映射、导向滤波边缘与高频纹理保真、Pitié 3D 多次 Radon 轴向正交投影收敛性。
  - **验证命令**：`node --test projects/ToneRelay/tests/color_transfer.test.ts`
- [x] **Task 7.2: Pitié 3D 连续色彩传输核心实现 (N-Dimensional PDF Transfer)**
  - **实现文件**：`projects/ToneRelay/src/core/color_transfer.ts`
  - **目标**：实现 4 组 3D 正交旋转基 (`ROTATION_MATRICES`)、Radon 投影直方图规范化与逆变换、O(1) 快速 2D 盒式滤波与保真导向滤波 (`guidedFilter`)。
- [x] **Task 7.3: 核心渲染器与纯前端引擎深度集成**
  - **改动范围**：`projects/ToneRelay/src/core/renderer.ts`、`projects/ToneRelay/src/ui/engine.ts`、`projects/ToneRelay/src/ui/app.ts`
  - **目标**：在传入 `referenceImageData` 时无缝执行 3D 色域真实映射，与胶片曲线、真实颗粒及智能人像肤色保护完美组合。
- [x] **Task 7.4: TypeScript 纯粹性与全套测试 100% 验证**
  - **验收命令**：`node --test tests/*.test.ts` (35 项测试 100% 通过，0 失败，全量代码与测试统一采用 TypeScript `.ts`)。
