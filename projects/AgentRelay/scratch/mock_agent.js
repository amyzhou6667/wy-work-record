// 模拟一个长耗时 AI 工具（如 claude-code / antigravity）的交互流程
console.log('[MockAgent] 🔍 正在扫描工作区与分析代码依赖...');

setTimeout(() => {
  console.log('[MockAgent] ⚙️ 正在生成数据库迁移补丁...');
}, 800);

setTimeout(() => {
  // 输出提问，不带末尾换行，模拟光标停在提问等待输入
  process.stdout.write('[MockAgent] ❓ Allow write to database? [Y/n] ');
  
  // 监听标准输入
  process.stdin.once('data', (data) => {
    const input = data.toString().trim().toLowerCase();
    if (input === 'y' || input === 'yes' || input === '') {
      console.log('\n[MockAgent] ✅ 用户已确认允许！正在写入数据库迁移...');
      setTimeout(() => {
        console.log('[MockAgent] 🎉 全部任务顺利执行完毕！');
        process.exit(0);
      }, 500);
    } else {
      console.log(`\n[MockAgent] ❌ 用户拒绝 (${input})，操作已中止！`);
      process.exit(1);
    }
  });
}, 1600);
