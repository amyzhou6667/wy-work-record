import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ReviewerCLI } from '../src/cli.ts';

describe('ProjectReviewer 端到端完整模拟集成测试', () => {
  const cli = new ReviewerCLI();

  it('应当正确解析参数与命令行标志', () => {
    const opts = cli.parseArgs(['./my-proj', '--mode', 'comprehensive', '--retry']);
    assert.strictEqual(opts.source, './my-proj');
    assert.strictEqual(opts.mode, 'comprehensive');
    assert.strictEqual(opts.isRetry, true);
    assert.strictEqual(opts.isNext, false);
  });

  it('应当驱动完整 5 轮单步问答并最终生成统一归档的复盘文件', async () => {
    // 准备临时工程
    const mockDir = path.join(os.tmpdir(), `integration-proj-${Date.now()}`);
    fs.mkdirSync(mockDir, { recursive: true });
    
    try {
      fs.writeFileSync(path.join(mockDir, 'package.json'), JSON.stringify({
        name: 'integration-demo-service',
        dependencies: {
          'ioredis': '^5.0.0',
          'express': '^4.18.0'
        }
      }));
      fs.writeFileSync(path.join(mockDir, 'README.md'), '# Integration Demo Service\n支付结算与高并发异步系统');
      const srcDir = path.join(mockDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export const run = () => {};');

      // 准备模拟回答队列
      const simulatedInputs = [
        '我们选用了 Express 和 Redis 作为底层，核心是为了高并发与简单轻量。', // T1 主回答 (触发追问)
        '当修改数据时，我们采用 Cache-Aside 模式结合延迟双删保障一致性。', // T1 追问 1 (触发追问 2)
        '若执行超时，我们设计了锁自动续期机制（看门狗机制）。', // T1 追问 2 -> 切入 T2
        '核心文件 index.ts 负责装配路由与中间件，遵循单一职责。', // T2
        '通过 Redis 集群实现分布式锁与防击穿。', // T3 (触发追问)
        '遇到宕机直接降级走数据库兜底并做限流。', // T3 追问
        '跳过', // T4 跳过
        '我们编写了完整的自动化测试套件和 CI/CD 质量门禁。' // T5
      ];

      let inputIndex = 0;
      const customPrompt = async (_query: string): Promise<string> => {
        const val = simulatedInputs[inputIndex++] || '标准回答完成';
        return val;
      };

      // 拦截 console.log 检验输出
      let logs = '';
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs += args.map(a => String(a)).join(' ') + '\n';
      };

      try {
        await cli.run([mockDir], process.stdin, process.stdout, customPrompt);
      } finally {
        console.log = originalLog;
      }

      // 验证关键流程输出
      assert.ok(logs.includes('项目识别成功: integration-demo-service'));
      assert.ok(logs.includes('模拟面试复盘诊断卡片'));
      assert.ok(logs.includes('完整复盘文档已生成'));

      // 验证统一归档文件是否存在
      const recordsDir = path.resolve(process.cwd(), 'interview-records', 'integration-demo-service');
      assert.ok(fs.existsSync(recordsDir));
      const files = fs.readdirSync(recordsDir);
      assert.ok(files.length > 0);
      assert.ok(files[0].startsWith('interview-review-integration-demo-service-'));

      // 读取生成的复盘文件验证内容结构
      const reportPath = path.join(recordsDir, files[0]);
      const reportContent = fs.readFileSync(reportPath, 'utf-8');
      assert.ok(reportContent.includes('# 【面试复盘诊断报告】integration-demo-service'));
      assert.ok(reportContent.includes('【大厂标杆范例参考回答】'));
      assert.ok(reportContent.includes('简历与项目描述优化建议'));

    } finally {
      fs.rmSync(mockDir, { recursive: true, force: true });
    }
  });
});
