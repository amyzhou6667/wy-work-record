---
name: rea
description: >-
  基于 morluto/rea 的工业级逆向分析与软件解构技能。面向无源码环境下的应用行为探查、
  Electron ASAR 拆解、Web/API 交互协议还原、.NET 程序集与原生二进制 (Native Binaries) 的证据驱动 (Evidence-based) 逆向与接口契约还原。
---

# REA 逆向工程与行为分析技能规范 (Reverse Engineer Anything)

本技能专用于在无源码或黑盒场景下，对软件行为、网络协议、打包资源或编译产物进行逆向与架构还原。核心准则为：**确凿证据驱动（Evidence-based）、明确局限边界（Limitations）、强制 TypeScript 契约还原（TS Interface/Contract 先行）**。

---

## 🎯 核心工程原则

1. **证据驱动 (Evidence-First / Zero Hallucination)**：
   - 严禁对未观察到的逻辑进行无根据臆测或伪造实现。
   - 所有分析结论必须附带具体且可验证的物理凭据：源文件路径、偏移量、反编译/反汇编指令片段、符号名或真实抓包数据。
2. **局限性显式声明 (Explicit Limitations)**：
   - 每次逆向输出必须诚实指出未覆盖的代码分支、混淆导致无法确定的逻辑、动态计算的值或分析盲区。
3. **接口与模型契约强制 TypeScript 还原**：
   - 逆向分析得出的数据模型、DTO、IPC 消息体、API 接口定义，**强制统一使用 TypeScript (`.ts`) 的 `interface` 与 `type` 严密声明**，契合本仓库全局规范。
4. **安全与隔离执行 (Safe Sandbox)**：
   - 优先采用静态结构与符号分析；涉及动态运行或沙箱探测时，避免在未隔离主机直接执行不可信代码。

---

## 🔄 四阶段标准逆向工作流

### 阶段一：资产分类与环境预检 (Triage & Environment Setup)
1. **识别分析标的类别**：
   - **Web / 流量层**：HTTP/HTTPS 抓包文件、WebSocket 会话流、Har 文件；
   - **JS / Electron 层**：`.asar` 归档、打包压缩的 `.js`、Webpack/Vite runtime、Source Map；
   - **托管运行时**：`.NET` 程序集（`.dll` / `.exe`）、Java 字节码（`.jar` / `.apk`）；
   - **原生二进制**：PE (`.exe`, `.dll`)、ELF、Mach-O。
2. **环境预检**：
   - 检查 Node.js 运行环境；
   - 调度 `npx -y rea-agents` 作为 MCP 工具链，或按需准备系统级反编译辅助引擎（如 Ghidra、Hopper、IDA、ilspycmd 等）。

---

### 阶段二：静态结构解构 (Static Inspection)
1. **解包与资产展开**：
   - Electron 应用：解包 `.asar` 并提取主进程 (`main`)、渲染进程 (`renderer`) 与预加载脚本 (`preload.js`)；
   - Web/混淆脚本：通过 Source Map 恢复或代码美化（Beautify/Prettier），识别关键路由与 API 模块。
2. **符号表与拓扑提取**：
   - 提取导出函数列表（Export Symbols）、动态导入项（Imports）、全局配置常数与字符串常量表；
   - 梳理跨进程通信（IPC/RPC 事件名）与外部网络调用地址。

---

### 阶段三：逻辑溯源与证据链合成 (Tracing & Evidence Gathering)
1. **核心逻辑定位**：
   - 追踪目标功能（如：鉴权算法、数据加密、协议封包、权限校验）的代码入口；
   - 提取执行链路中的关键条件分支与状态转换。
2. **证据记录归档**：
   - 记录代码行号、函数签名与反编译片段，作为后续报告或重构实现的硬性支撑凭证。

---

### 阶段四：契约还原与报告归档 (Contract Reconstruction & Report)
1. **TypeScript 契约先行还原**：
   - 将逆向所得的协议格式、请求/响应结构完整还原为 TypeScript 类型定义文件（如 `contracts.ts`）。
2. **产出规范报告**：
   - 归档至：`projects/<项目名>/docs/rea/` 或输出结构化 Markdown 报告，必须包含：
     - **资产基本信息**（名称、架构、版本、哈希）
     - **核心架构与通信时序**（Mermaid 序列图/流程图）
     - **TypeScript 接口契约**
     - **证据清单 (Evidence List)**
     - **已知局限性 (Known Limitations)**

---

## 🛠️ REA 常用操作指令

### 1. 启动 REA 智能体环境
```bash
# 执行 REA 交互式初始化与 MCP 配置
npx rea-agents setup
```

### 2. 典型分析场景
- **Electron ASAR 分析**：
  ```bash
  npx -y @electron/asar extract <app.asar> <output_dir>
  ```
- **.NET 结构静态导出**：
  ```bash
  ilspycmd <assembly.dll> -p -o <output_dir>
  ```
- **API 与流量解构**：
  优先分析抓包记录，提取请求 Header、Payload 签名与加解密流程。
