import type {
  IInterviewEngine,
  ProjectMetadata,
  ReviewerOptions,
  TopicAgenda,
  TopicSessionRecord,
  AnswerRecord,
  SessionState
} from '../types/index.ts';

export class InterviewEngine implements IInterviewEngine {
  private metadata: ProjectMetadata | null = null;
  private options: ReviewerOptions = { source: '' };
  private topics: TopicAgenda[] = [];
  private currentTopicIndex: number = 0;
  private currentFollowUpDepth: number = 0;
  private currentFollowUpQuestion: string | null = null;
  private sessionState: SessionState = 'IDLE';

  /** 存储所有考点的问答与评估记录 */
  private topicRecords: TopicSessionRecord[] = [];
  private currentTopicAnswers: AnswerRecord[] = [];

  /** 获取所有已完成的考点记录 */
  getTopicRecords(): TopicSessionRecord[] {
    return this.topicRecords;
  }

  /** 获取元数据 */
  getMetadata(): ProjectMetadata | null {
    return this.metadata;
  }

  /** 初始化面试会话，生成 5 个主考点 */
  async initSession(metadata: ProjectMetadata, options?: ReviewerOptions): Promise<TopicAgenda[]> {
    this.metadata = metadata;
    this.options = options || { source: metadata.sourcePath };
    this.currentTopicIndex = 0;
    this.currentFollowUpDepth = 0;
    this.currentFollowUpQuestion = null;
    this.topicRecords = [];
    this.currentTopicAnswers = [];

    this.topics = this.generateAgendas(metadata, this.options);
    this.sessionState = 'AWAITING_ANSWER';
    return this.topics;
  }

  /** 根据项目特征动态生成 5 个专业考点 */
  private generateAgendas(metadata: ProjectMetadata, options: ReviewerOptions): TopicAgenda[] {
    const isRetry = Boolean(options.isRetry);
    const isNext = Boolean(options.isNext);
    const proj = metadata.projectName;
    const mainLang = metadata.languages[0] || 'TypeScript';
    const hasRedis = Boolean(metadata.dependencies['ioredis'] || metadata.dependencies['redis']);
    const frameworks = metadata.frameworks.join(', ') || '标准工程分层';
    const sampleFile = metadata.keyFiles.find(f => !f.endsWith('json') && !f.endsWith('md')) || '核心代码入口';

    return [
      {
        id: 'T1',
        category: 'architecture',
        title: `${proj} 整体技术选型与架构分层权衡`,
        mainQuestion: isRetry 
          ? `[重练强化] 请重新复盘并详细阐述：在 ${proj} 项目中，选择 ${mainLang} 与 ${frameworks} 作为核心技术栈的核心权衡依据是什么？如果现在系统规模扩大 10 倍，当前的分层架构存在哪些潜在瓶颈？`
          : isNext
          ? `[第二轮考察] 请从模块解耦与扩展性角度，深入介绍 ${proj} 各核心层级之间的依赖反转与数据流转设计。`
          : `请结合 ${proj} 的业务场景，谈谈你们当时在核心技术栈（如 ${mainLang}、${frameworks}）上的选型考量是什么？相比竞品或其他主流方案，做出了哪些关键的 Trade-off（权衡取舍）？`,
        expectedKeyPoints: ['选型对比与业务契合度', '架构分层与依赖解耦', '面对未来扩展的潜在瓶颈']
      },
      {
        id: 'T2',
        category: 'core_logic',
        title: '核心业务链路实现与关键代码设计',
        targetFile: sampleFile,
        mainQuestion: `在项目核心文件（如 \`${sampleFile}\`）或对应业务模块中，最核心的一段业务流转逻辑是如何落地的？你在设计这块代码时，如何保障模块的高内聚与可维护性？`,
        expectedKeyPoints: ['核心领域对象与状态流转', '代码设计模式与单一职责', '关键函数的复杂度控制']
      },
      {
        id: 'T3',
        category: 'concurrency_perf',
        title: '高并发、性能瓶颈与缓存/异步优化',
        mainQuestion: hasRedis
          ? `检测到项目中引入了 Redis 等组件。在面对瞬间高并发流量涌入时，你们系统是如何防范缓存穿透、缓存击穿与雪崩的？在高并发写场景下，缓存与数据库的一致性又是如何保障的？`
          : `如果当前系统的 QPS 瞬间提升 20 倍，从接口层、计算层到存储层，最先出现性能瓶颈的会是哪一部分？针对这些瓶颈，你在代码中做了哪些异步处理或性能调优设计？`,
        expectedKeyPoints: ['高并发吞吐瓶颈识别', '缓存一致性与热点数据保护', '异步非阻塞与资源池优化']
      },
      {
        id: 'T4',
        category: 'edge_cases',
        title: '异常容灾、数据一致性与边界防护',
        mainQuestion: `在分布式或真实网络环境下，如果下游服务或依赖中间件发生网络闪断、超时或者脏数据重复提交，${proj} 在接口幂等性、超时重试以及熔断降级上有哪些兜底防范机制？`,
        expectedKeyPoints: ['接口幂等设计 (如唯一键/防重Token)', '超时与重试退避机制', '极端故障下的兜底与降级保障']
      },
      {
        id: 'T5',
        category: 'engineering',
        title: '工程规范、自动化质量保障与线上排障',
        mainQuestion: `作为项目的关键开发/负责人，你是如何建立 ${proj} 的质量护城河的？当线上出现不可预期的偶发 Bug 或内存泄露时，你的排查定位思路与工具链是怎样的？`,
        expectedKeyPoints: ['自动化测试与 CI/CD 质量门禁', '日志链路追踪与监控告警', '系统化故障排查五步法']
      }
    ];
  }

  /** 获取当前提问提示 */
  getCurrentPrompt(): { question: string; isFollowUp: boolean; progress: string; topicTitle: string } {
    const currentTopic = this.topics[this.currentTopicIndex];
    if (!currentTopic) {
      return {
        question: '面试已全部完成。',
        isFollowUp: false,
        progress: '5/5',
        topicTitle: '已结束'
      };
    }

    const question = this.currentFollowUpQuestion || currentTopic.mainQuestion;
    const isFollowUp = Boolean(this.currentFollowUpQuestion);
    const progress = `[考点 ${this.currentTopicIndex + 1}/5]`;

    return {
      question,
      isFollowUp,
      progress,
      topicTitle: currentTopic.title
    };
  }

  /** 提交候选人回答 */
  async submitAnswer(answer: string): Promise<{
    nextAction: 'FOLLOW_UP' | 'NEXT_TOPIC' | 'COMPLETE';
    followUpQuestion?: string;
  }> {
    const currentTopic = this.topics[this.currentTopicIndex];
    if (!currentTopic) {
      return { nextAction: 'COMPLETE' };
    }

    const trimmedAnswer = answer.trim();
    const currentQuestion = this.currentFollowUpQuestion || currentTopic.mainQuestion;

    // 记录本轮回答
    const record: AnswerRecord = {
      question: currentQuestion,
      isFollowUp: Boolean(this.currentFollowUpQuestion),
      followUpDepth: this.currentFollowUpDepth,
      answer: trimmedAnswer,
      isSkipped: false,
      answeredAt: Date.now()
    };
    this.currentTopicAnswers.push(record);

    // 判定是否触发自适应深度追问
    const shouldFollowUp = this.evaluateFollowUpTrigger(currentTopic, trimmedAnswer, this.currentFollowUpDepth);

    if (shouldFollowUp && this.currentFollowUpDepth < 2) {
      this.currentFollowUpDepth += 1;
      const followUp = this.generateFollowUpQuestion(currentTopic, trimmedAnswer, this.currentFollowUpDepth);
      this.currentFollowUpQuestion = followUp;
      return {
        nextAction: 'FOLLOW_UP',
        followUpQuestion: followUp
      };
    }

    // 否则结束本考点，归档并切入下一个主考点
    this.finalizeCurrentTopic();

    if (this.currentTopicIndex < this.topics.length) {
      return { nextAction: 'NEXT_TOPIC' };
    } else {
      this.sessionState = 'FINISHED';
      return { nextAction: 'COMPLETE' };
    }
  }

  /** 自适应追问触发判定 */
  private evaluateFollowUpTrigger(topic: TopicAgenda, answer: string, currentDepth: number): boolean {
    if (currentDepth >= 2) return false;
    
    // 如果回答过短 (< 15 字)，追问引导其详细说明
    if (answer.length < 15) return true;

    // 关键字匹配：提到了关键组件但未交代底层容灾或原理
    const lower = answer.toLowerCase();
    const technicalKeywords = ['redis', 'lock', '缓存', '锁', '异步', '中间件', '事务', 'queue', 'mq', 'token', '限流', '状态机'];
    const hasTechKeywords = technicalKeywords.some(kw => lower.includes(kw));

    // 如果提到了关键技术词，必须深挖其并发一致性或容灾
    return hasTechKeywords;
  }

  /** 生成针对性的深度追问问题 */
  private generateFollowUpQuestion(topic: TopicAgenda, answer: string, depth: number): string {
    const lower = answer.toLowerCase();

    if (lower.includes('redis') || lower.includes('缓存')) {
      if (depth === 1) {
        return '追问：你提到了使用缓存提高性能，那么当存在高频写入或修改时，如何保证缓存与底层数据源的一致性？如果采用延时双删或 Canal 监听 binlog，各自有什么优缺点？';
      } else {
        return '追问：在极端并发情况下，如果分布式锁的持有者执行超时导致锁被误释放，或者锁服务本身发生网络分区，系统如何避免并发写入造成脏数据？';
      }
    }

    if (lower.includes('锁') || lower.includes('lock')) {
      return '追问：使用锁机制必然带来性能损耗甚至死锁风险。在代码层面，你们是如何控制加锁粒度与锁超时的？如何防范死锁发生？';
    }

    if (lower.includes('异步') || lower.includes('queue') || lower.includes('mq')) {
      return '追问：采用异步处理虽然能削峰，但如果下游消费积压或者消费者宕机，消息的防重（幂等性）以及死信队列如何闭环处理？';
    }

    // 通用深度追问
    if (depth === 1) {
      return `追问：针对你刚才提到的方案，在边界异常（例如超时断网、瞬时流量翻倍）情况下，底层代码具体的防范逻辑与回滚策略是怎样的？`;
    } else {
      return `追问：如果让你重新设计这个模块，站在可扩展性与可观测性的角度，你认为当前设计最大的一个妥协点（Trade-off）是什么？如何改造？`;
    }
  }

  /** 归档当前考点并推进索引 */
  private finalizeCurrentTopic() {
    const currentTopic = this.topics[this.currentTopicIndex];
    if (currentTopic) {
      this.topicRecords.push({
        topic: currentTopic,
        records: [...this.currentTopicAnswers],
        score: this.calculateTopicScore(this.currentTopicAnswers),
        strengths: this.extractStrengths(this.currentTopicAnswers),
        weaknesses: this.extractWeaknesses(this.currentTopicAnswers),
        bestPracticeAnswer: this.generateBestPractice(currentTopic),
        improvementAdvice: this.generateAdvice(currentTopic, this.currentTopicAnswers)
      });
    }

    this.currentTopicIndex += 1;
    this.currentFollowUpDepth = 0;
    this.currentFollowUpQuestion = null;
    this.currentTopicAnswers = [];
  }

  /** 计算单个考点得分 (0~100) */
  private calculateTopicScore(answers: AnswerRecord[]): number {
    if (answers.length === 0 || answers.some(a => a.isSkipped)) {
      return 15; // 跳过或未答直接给予基线低分
    }

    let score = 65; // 基础合格分
    const totalWords = answers.reduce((acc, a) => acc + a.answer.length, 0);

    // 回答长度与丰富度奖励
    if (totalWords > 150) score += 15;
    else if (totalWords > 60) score += 8;

    // 追问应对表现
    if (answers.length > 1) {
      score += 10; // 经受住追问
    }

    return Math.min(100, Math.max(0, score));
  }

  /** 提炼亮点 */
  private extractStrengths(answers: AnswerRecord[]): string[] {
    if (answers.some(a => a.isSkipped)) return ['能明确自身技能边界，不盲目胡编乱造'];
    const text = answers.map(a => a.answer).join(' ');
    const list: string[] = [];
    if (text.length > 80) list.push('回答条理清晰，具备一定的实际项目动手经验');
    if (/缓存|redis|锁|异步|幂等/i.test(text)) list.push('能主动结合工程组件（如缓存、锁等）展开技术说明');
    if (list.length === 0) list.push('能够配合面试官完成基础场景的阐述');
    return list;
  }

  /** 提炼不足 */
  private extractWeaknesses(answers: AnswerRecord[]): string[] {
    if (answers.some(a => a.isSkipped)) return ['该核心知识模块尚未形成完整闭环，在真实面试中属于高风险扣分点'];
    const text = answers.map(a => a.answer).join(' ');
    const list: string[] = [];
    if (text.length < 50) list.push('回答较为简略，缺乏具体代码调用链路与架构设计细节');
    if (!/容灾|回滚|降级|监控|幂等/i.test(text)) list.push('对极端网络异常与系统容灾防范的方案阐述稍显薄弱');
    if (list.length === 0) list.push('在大厂深度追问场景下，对底层原理的挖掘深度可进一步巩固');
    return list;
  }

  /** 针对性提供大厂标杆示范回答 */
  private generateBestPractice(topic: TopicAgenda): string {
    switch (topic.category) {
      case 'architecture':
        return '【大厂架构师标杆范例】：回答宜遵循“业务特征 ➡️ 选型痛点 ➡️ 方案对比 ➡️ 架构分层与 Trade-off”四步法。明确说明引入当前技术栈解决了什么痛点（例如低延迟/高吞吐），对比方案（如为什么没用 A 而是用了 B），并指出在面对 10 倍流量增长时，如何通过服务拆分与读写分离演进架构。';
      case 'core_logic':
        return '【大厂架构师标杆范例】：先给出一句话核心定义（解决什么业务问题），再按“输入 ➡️ 状态机转移 ➡️ 事务一致性 ➡️ 关键代码抽象”层层展开。重点提及关键类与函数的单一职责原则，以及如何通过策略模式/责任链隔离变动。';
      case 'concurrency_perf':
        return '【大厂架构师标杆范例】：结构化阐述多级缓存架构（本地缓存 + 分布式 Redis）。说明缓存击穿采用互斥锁或逻辑过期方案；缓存穿透采用布隆过滤器与空值缓存；数据一致性推荐采用“Cache-Aside 模式 + Canal 监听 MySQL binlog 异步失效”，并给出降级保护阈值。';
      case 'edge_cases':
        return '【大厂架构师标杆范例】：重点阐明“墨菲定律”思维。对外部依赖一律做超时熔断保护（如断路器）；接口做唯一 Token 幂等防重；涉及资产/订单等核心数据必须有延时对账与最终一致性补偿机制。';
      case 'engineering':
        return '【大厂架构师标杆范例】：阐述单元测试覆盖率红线与 CI/CD 自动化门禁。线上排障使用日志链路追踪（TraceID）、Metrics 指标看板与告警，遇到问题严格按照“止血（降级/回滚）➡️ 保留现场 ➡️ 五步归因 ➡️ 深度复盘”落地闭环。';
    }
  }

  /** 生成提分建议 */
  private generateAdvice(topic: TopicAgenda, answers: AnswerRecord[]): string {
    if (answers.some(a => a.isSkipped)) {
      return '建议针对此模块重点补全底层原理知识，面试前提前准备 1~2 个真实生产案例。';
    }
    return '建议回答时采用 STAR 法则（情境-任务-行动-结果），多主动聊聊在编写该部分代码时遇到的具体技术难题和你的解决思路，掌握面试对话主导权。';
  }

  /** 跳过当前考点 */
  skipCurrentTopic(): { nextAction: 'NEXT_TOPIC' | 'COMPLETE' } {
    const currentTopic = this.topics[this.currentTopicIndex];
    if (currentTopic) {
      const skipRecord: AnswerRecord = {
        question: this.currentFollowUpQuestion || currentTopic.mainQuestion,
        isFollowUp: Boolean(this.currentFollowUpQuestion),
        followUpDepth: this.currentFollowUpDepth,
        answer: '[候选人选择跳过此考点]',
        isSkipped: true,
        answeredAt: Date.now()
      };
      this.currentTopicAnswers.push(skipRecord);
      this.finalizeCurrentTopic();
    }

    if (this.currentTopicIndex < this.topics.length) {
      return { nextAction: 'NEXT_TOPIC' };
    } else {
      this.sessionState = 'FINISHED';
      return { nextAction: 'COMPLETE' };
    }
  }

  /** 提前退出请求 */
  requestEarlyExit(): { canGenerateReport: boolean; answeredCount: number } {
    const answeredCount = this.topicRecords.length;
    return {
      canGenerateReport: answeredCount >= 2,
      answeredCount
    };
  }
}
