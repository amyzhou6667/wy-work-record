import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IReportStorage, ReviewReport, ProjectMetadata } from '../types/index.ts';

export class ReportStorage implements IReportStorage {
  /** 在了解项目情况后，在 ./interview-records/<项目名>/ 下生成可沉淀进简历的项目总览说明 */
  async saveProjectProfile(metadata: ProjectMetadata, baseOutputDir?: string): Promise<string> {
    const outputDir = baseOutputDir 
      ? path.resolve(baseOutputDir, metadata.projectName)
      : path.resolve(process.cwd(), 'interview-records', metadata.projectName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fullPath = path.join(outputDir, 'project-profile.md');
    const content = this.renderProjectProfile(metadata);
    fs.writeFileSync(fullPath, content, 'utf-8');
    return fullPath;
  }

  /** 将复盘报告渲染并写入统一归档目录 */
  async saveReport(report: ReviewReport, baseOutputDir?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    
    // 统一集中归档在当前项目目录下的 interview-records/<项目名>/ 中
    const outputDir = baseOutputDir 
      ? path.resolve(baseOutputDir, report.projectName)
      : path.resolve(process.cwd(), 'interview-records', report.projectName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `interview-review-${report.projectName}-${timestamp}.md`;
    const fullPath = path.join(outputDir, fileName);

    const markdownContent = this.renderMarkdown(report);
    fs.writeFileSync(fullPath, markdownContent, 'utf-8');

    report.markdownFilePath = fullPath;
    return fullPath;
  }

  /** 渲染控制台精简摘要卡片 */
  formatConsoleSummary(report: ReviewReport): string {
    const gradeBadge = {
      S: '[S 级: 极力推荐 / Offer+]',
      A: '[A 级: 建议通过 / Offer]',
      B: '[B 级: 犹豫待定 / Pass]',
      C: '[C 级: 未通过 / Reject]'
    }[report.grade];

    return `
================================================================================
                    🎯 模拟面试复盘诊断卡片 - ${report.projectName}
================================================================================
【综合得分】：${report.totalScore} 分  |  评级：${gradeBadge}
【面试时间】：${report.interviewDate}   |  模式：${report.mode === 'architect' ? '技术深度与架构师型' : '全面考察型'}

【四维战力评估】：
  - 技术深度与底层原理: ${report.dimensions.technicalDepth} / 100 (权重 40%)
  - 架构设计与方案权衡: ${report.dimensions.architecturalDesign} / 100 (权重 30%)
  - 工程边界与容灾防范: ${report.dimensions.engineeringRobustness} / 100 (权重 20%)
  - 表达逻辑与沟通技巧: ${report.dimensions.communicationLogic} / 100 (权重 10%)

【面试官总评】：
  ${report.overallSummary}

【大厂标杆回答与复盘报告已归档】：
  📄 文件位置: ${report.markdownFilePath || './interview-records/' + report.projectName}
================================================================================
`;
  }

  /** 渲染完整的专业复盘 Markdown */
  private renderMarkdown(report: ReviewReport): string {
    const { dimensions } = report;

    let topicsSection = '';
    report.topicRecords.forEach((record, index) => {
      const topic = record.topic;
      const qaHistory = record.records.map((r, i) => {
        const prefix = r.isFollowUp ? `> 🔍 **追问 ${r.followUpDepth}**` : `> ❓ **主考点提问**`;
        return `${prefix}：${r.question}\n>\n> 🗣️ **候选人作答**：\n> ${r.answer}\n`;
      }).join('\n');

      const strengthsList = record.strengths.map(s => `- ✅ ${s}`).join('\n');
      const weaknessesList = record.weaknesses.map(w => `- ⚠️ ${w}`).join('\n');

      topicsSection += `
### 考点 ${index + 1}：${topic.title} (得分: ${record.score}/100)

${qaHistory}

#### 📋 现场表现诊断
**【得分亮点】**：
${strengthsList}

**【失分弱项与漏洞】**：
${weaknessesList}

#### 💡 【大厂标杆范例参考回答】
> ${record.bestPracticeAnswer}

#### 🚀 【针对性提分建议】
${record.improvementAdvice}

---
`;
    });

    const resumeAdvicesSection = report.resumeAdvices.map((adv, idx) => `${idx + 1}. ${adv}`).join('\n');

    return `# 【面试复盘诊断报告】${report.projectName}

| 项目名称 | 面试时间 | 综合得分 | 最终评级 | 面试风格 |
| :--- | :--- | :--- | :--- | :--- |
| **${report.projectName}** | ${report.interviewDate} | **${report.totalScore} 分** | **${report.grade} 级** | ${report.mode} |

---

## 1. 综合战力与四维评估雷达

| 评估维度 | 权重 | 得分 (百分制) | 维度解析 |
| :--- | :--- | :--- | :--- |
| **技术深度与底层原理** | 40% | **${dimensions.technicalDepth}** | 考察语言特性、运行时机制、核心中间件底层原理的掌握深度 |
| **架构设计与方案权衡** | 30% | **${dimensions.architecturalDesign}** | 考察模块分层、依赖解耦、选型 Trade-off 与技术视野 |
| **工程边界与容灾防范** | 20% | **${dimensions.engineeringRobustness}** | 考察高并发吞吐瓶颈、超时幂等、弱网兜底与防雪崩意识 |
| **表达逻辑与沟通技巧** | 10% | **${dimensions.communicationLogic}** | 考察 STAR 结构化阐述能力、逻辑严密性与对话主导权 |

### 🎯 面试官核心总评
${report.overallSummary}

---

## 2. 逐题深度复盘与标杆范例解析 (Q&A Review)
${topicsSection}

## 3. 简历与项目描述优化建议 (Resume & Pitch Action Items)
${resumeAdvicesSection}

---

## 4. 循环对练后续操作指引
- 若需**针对本次失分弱项进行原题重练**，请执行：
  \`\`\`bash
  node src/cli.ts ${report.projectName} --retry
  \`\`\`
- 若需**换一批全新考点进行进阶第二轮面试**，请执行：
  \`\`\`bash
  node src/cli.ts ${report.projectName} --next
  \`\`\`
`;
  }

  /** 渲染供简历使用的项目经验总览 Markdown */
  private renderProjectProfile(metadata: ProjectMetadata): string {
    const langs = metadata.languages.join(' / ') || 'TypeScript';
    const fws = metadata.frameworks.length > 0 ? metadata.frameworks.join(' / ') : '模块化工程架构';
    const highlights = metadata.architectureHighlights.map(h => `- 🌟 **${h}**`).join('\n');
    const keyFileList = metadata.keyFiles.slice(0, 8).map(f => `  - \`${f}\``).join('\n');
    const depKeys = Object.keys(metadata.dependencies).slice(0, 10).join(', ') || '核心标准库依赖';

    return `# 【项目经验总览与简历提炼】${metadata.projectName}

> 📌 **本文档由 ProjectReviewer 自动生成**。在感知代码工程后，提炼了本项目的核心架构、业务定位与技术亮点，便于求职者后期直接整理进简历，化为高质量的项目经验与面试谈资。

---

## 1. 项目基本画像与技术栈

| 属性维度 | 项目实际特征 | 简历对应亮点 |
| :--- | :--- | :--- |
| **项目名称** | **${metadata.projectName}** | 可直接作为简历核心项目标题 |
| **业务定位** | ${metadata.summary} | 一句话项目背景说明 (STAR - Situation) |
| **主要开发语言** | ${langs} | 突出强类型语言与规范化开发能力 |
| **核心框架与组件** | ${fws} | 证明主流企业级框架实战经验 |
| **工程关键规模** | 约 ${metadata.fileCount} 个核心代码文件 | 具备完整工程架构掌控力 |

- **主要依赖组件**：\`${depKeys}\`
- **代表性关键文件**：
${keyFileList}

---

## 2. 核心架构与技术亮点提炼
${highlights}

---

## 3. 【简历黄金模板】STAR 原则项目经验描述范例

你可以根据申请的岗位层级，直接选取以下描述整理进简历：

### 📝 版本 A：资深开发 / 技术骨干视角 (强调业务实现与稳定性)
- **项目名称**：${metadata.projectName}
- **担任角色**：核心开发工程师
- **项目描述**：${metadata.summary}。基于 ${langs} 与 ${fws} 构建。
- **核心成果与职责 (STAR - Action & Result)**：
  1. **架构与选型**：负责系统核心模块的设计与落地，推行严格的分层解耦与类型契约规范，提升团队代码可维护性；
  2. **核心业务流转**：主导核心业务链路的代码抽象，运用设计模式降低模块间耦合度，关键函数复杂度降低 30%；
  3. **容灾与稳定性**：针对高频调用与潜在并发瓶颈，引入合理的防重/缓存与超时降级机制，建立单元测试与自动化流水线质量门禁，保障核心逻辑零故障交付。

### 📝 版本 B：架构师 / 性能调优视角 (强调 Trade-off 与高并发)
- **项目名称**：${metadata.projectName}
- **担任角色**：架构设计 / 核心研发
- **项目描述**：${metadata.summary}
- **核心成果与职责 (STAR - Action & Result)**：
  1. **技术选型与权衡**：基于业务吞吐诉求主导 ${langs} 技术方案评审，在开发效率与执行性能间达成最优 Trade-off；
  2. **高可用设计**：针对外部依赖超时与极端网络抖动，设计了熔断兜底与接口幂等性防线，保障数据最终一致性；
  3. **工程效能沉淀**：推进自动化测试套件建设，形成可复用的技术资产与工程基线。

---

## 4. 面试技术自测与备战清单
在真实面试中，面试官大概率会基于此项目深挖以下方向，建议提前对齐思路：
1. **技术选型理由**：为什么在这个项目中选择 ${langs} 而不是其他技术？遇到过哪些框架限制，如何绕过的？
2. **核心复杂代码**：找出项目中最具代表性的核心文件（如 \`${metadata.keyFiles[0] || '核心入口'}\`），用白板画出其完整调用链路与状态流转；
3. **极端情况思考**：如果当前项目流量放大 10 倍，最先扛不住的节点在哪里？如何分阶段重构演进？
`;
  }
}
