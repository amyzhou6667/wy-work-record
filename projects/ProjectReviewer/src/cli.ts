#!/usr/bin/env node

import * as readline from 'node:readline';
import { ProjectScanner } from './services/scanner.ts';
import { InterviewEngine } from './services/engine.ts';
import { ReviewEvaluator } from './services/evaluator.ts';
import { ReportStorage } from './services/storage.ts';
import type { ReviewerOptions, InterviewerMode } from './types/index.ts';

export class ReviewerCLI {
  private scanner = new ProjectScanner();
  private engine = new InterviewEngine();
  private evaluator = new ReviewEvaluator();
  private storage = new ReportStorage();

  /** 解析命令行入参 */
  parseArgs(args: string[]): ReviewerOptions {
    const options: ReviewerOptions = {
      source: '',
      mode: 'architect',
      isRetry: false,
      isNext: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--retry') {
        options.isRetry = true;
      } else if (arg === '--next') {
        options.isNext = true;
      } else if (arg === '--mode' && args[i + 1]) {
        const mode = args[i + 1] as InterviewerMode;
        if (['architect', 'comprehensive'].includes(mode)) {
          options.mode = mode;
        }
        i++;
      } else if (!arg.startsWith('-') && !options.source) {
        options.source = arg;
      }
    }

    return options;
  }

  /** 打印帮助文档 */
  printHelp() {
    console.log(`
ProjectReviewer - 基于代码的智能模拟面试官

用法:
  node src/cli.ts <本地项目路径 | GitHub公开仓库URL> [选项]

选项:
  --mode <architect|comprehensive>  面试官风格: 架构师深度型(默认) / 全面考察型
  --retry                           针对上一轮薄弱点进行原题重练强化
  --next                            抽取全新考点开启新一轮面试
  --help, -h                        查看帮助信息

交互命令:
  /exit, /quit                      中途退出（答题 >=2 可生成阶段复盘）
  跳过, 不会, pass                  跳过当前考点，平滑切入下一题
`);
  }

  /** 执行交互式面试会话 */
  async run(
    args: string[],
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout,
    customPrompt?: (query: string) => Promise<string>
  ) {
    const options = this.parseArgs(args);

    if (!options.source || args.includes('--help') || args.includes('-h')) {
      this.printHelp();
      return;
    }

    const rl = customPrompt ? null : readline.createInterface({ input, output });
    const askQuestion = customPrompt || ((query: string): Promise<string> => {
      return new Promise(resolve => rl!.question(query, resolve));
    });

    try {
      console.log('\n🔍 [1/3] 正在感知并解析项目工程代码...');
      const metadata = await this.scanner.scanProject(options.source);
      
      console.log(`✅ 项目识别成功: ${metadata.projectName} (${metadata.languages.join('/')})`);
      console.log(`📦 模块摘要: ${metadata.summary}`);
      console.log(`🎯 规划考察架构亮点: ${metadata.architectureHighlights.join('、')}`);

      // 自动沉淀供简历使用的项目经验总览文档
      const profilePath = await this.storage.saveProjectProfile(metadata);
      console.log(`📄 [项目总览已落盘] 已生成简历项目经验说明: ${profilePath}`);

      console.log('\n🤖 [2/3] 面试官已就绪，即将进入一对一严格单步交互...');
      console.log('💡 提示：输入 "跳过" 可跳过本题，输入 "/exit" 可提前结算退出。\n');

      await this.engine.initSession(metadata, options);

      // 进入面试单步问答循环
      let isCompleted = false;
      while (!isCompleted) {
        const prompt = this.engine.getCurrentPrompt();
        const prefix = prompt.isFollowUp ? '🔍 [面试官追问]' : `❓ [面试官提问 ${prompt.progress}]`;

        console.log(`\n${prefix} (${prompt.topicTitle})`);
        console.log(`${prompt.question}\n`);

        const answer = await askQuestion('🗣️ 你的回答 > ');
        const trimmed = answer.trim();

        // 提前退出检测
        if (['/exit', '/quit'].includes(trimmed.toLowerCase())) {
          const exitCheck = this.engine.requestEarlyExit();
          if (exitCheck.canGenerateReport) {
            const confirm = await askQuestion('\n⚠️ 检测到已完成部分考点，是否生成阶段性复盘报告？[Y/n] > ');
            if (confirm.trim().toLowerCase() !== 'n') {
              console.log('\n📄 正在为您提前结算并生成阶段复盘...');
              break;
            }
          }
          console.log('\n👋 面试已终止，未生成报告。');
          rl.close();
          return;
        }

        // 跳过检测
        if (['跳过', '不会', 'pass', '换一题', '不清楚'].includes(trimmed.toLowerCase())) {
          console.log('\n⏩ [记录失分] 面试官：好，我们直接进入下一个考察要点。');
          const skipRes = this.engine.skipCurrentTopic();
          if (skipRes.nextAction === 'COMPLETE') {
            isCompleted = true;
          }
          continue;
        }

        // 正常回答处理
        const result = await this.engine.submitAnswer(trimmed);
        if (result.nextAction === 'COMPLETE') {
          isCompleted = true;
        }
      }

      // 生成复盘与打分
      console.log('\n📊 [3/3] 面试结束！面试官正在结合大厂标准进行四维加权打分与复盘分析...');
      const topicRecords = this.engine.getTopicRecords();
      const report = await this.evaluator.evaluate(metadata, topicRecords);
      const savedPath = await this.storage.saveReport(report);

      // 打印控制台卡片
      console.log(this.storage.formatConsoleSummary(report));
      console.log(`🎉 完整复盘文档已生成: ${savedPath}`);
      console.log('\n👉 输入 --retry 可针对本次失分弱项重练，输入 --next 可开启全新考点轮次。');

    } catch (err) {
      console.error(`\n❌ 执行失败: ${(err as Error).message}`);
    } finally {
      if (rl) rl.close();
    }
  }
}

// 命令行直接执行处理
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('cli.ts') || process.argv[1].endsWith('cli.js')
);

if (isDirectRun) {
  const cli = new ReviewerCLI();
  cli.run(process.argv.slice(2));
}
