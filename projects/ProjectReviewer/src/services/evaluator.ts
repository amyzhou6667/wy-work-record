import type {
  IReviewEvaluator,
  ProjectMetadata,
  ReviewReport,
  TopicSessionRecord,
  DimensionScores
} from '../types/index.ts';

export class ReviewEvaluator implements IReviewEvaluator {
  /** 评估并生成完整复盘结构 */
  async evaluate(metadata: ProjectMetadata, records: TopicSessionRecord[]): Promise<ReviewReport> {
    const dimensions = this.calculateDimensions(records);

    // 计算加权总分: 技术深度(40%) + 架构设计(30%) + 容灾工程(20%) + 表达逻辑(10%)
    const weightedTotal = Math.round(
      (dimensions.technicalDepth * 0.4) +
      (dimensions.architecturalDesign * 0.3) +
      (dimensions.engineeringRobustness * 0.2) +
      (dimensions.communicationLogic * 0.1)
    );

    const totalScore = Math.min(100, Math.max(0, weightedTotal));

    // 评级判定
    let grade: 'S' | 'A' | 'B' | 'C' = 'C';
    if (totalScore >= 90) grade = 'S';
    else if (totalScore >= 80) grade = 'A';
    else if (totalScore >= 70) grade = 'B';

    const overallSummary = this.generateOverallSummary(metadata, totalScore, grade, records);
    const resumeAdvices = this.generateResumeAdvices(metadata, records);

    return {
      projectName: metadata.projectName,
      interviewDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
      mode: 'architect',
      totalScore,
      grade,
      dimensions,
      topicRecords: records,
      overallSummary,
      resumeAdvices,
      markdownFilePath: ''
    };
  }

  /** 计算四维得分 */
  private calculateDimensions(records: TopicSessionRecord[]): DimensionScores {
    if (records.length === 0) {
      return { technicalDepth: 30, architecturalDesign: 30, engineeringRobustness: 30, communicationLogic: 30 };
    }

    const archRecords = records.filter(r => r.topic.category === 'architecture');
    const logicRecords = records.filter(r => r.topic.category === 'core_logic');
    const perfRecords = records.filter(r => ['concurrency_perf', 'edge_cases'].includes(r.topic.category));
    const engRecords = records.filter(r => r.topic.category === 'engineering');

    const avg = (recs: TopicSessionRecord[], defaultScore: number) => {
      if (recs.length === 0) return defaultScore;
      return Math.round(recs.reduce((acc, r) => acc + r.score, 0) / recs.length);
    };

    const overallAvg = Math.round(records.reduce((acc, r) => acc + r.score, 0) / records.length);

    // 1. 技术深度与底层原理
    const technicalDepth = avg(logicRecords.length > 0 ? logicRecords : records, overallAvg);

    // 2. 架构设计与方案权衡
    const architecturalDesign = avg(archRecords.length > 0 ? archRecords : records, overallAvg);

    // 3. 工程边界与容灾防范
    const engineeringRobustness = avg(perfRecords.length > 0 ? perfRecords : records, Math.max(30, overallAvg - 5));

    // 4. 表达逻辑与沟通技巧
    const communicationLogic = avg(engRecords.length > 0 ? engRecords : records, Math.min(95, overallAvg + 5));

    return {
      technicalDepth,
      architecturalDesign,
      engineeringRobustness,
      communicationLogic
    };
  }

  /** 生成全局总评 */
  private generateOverallSummary(
    metadata: ProjectMetadata,
    score: number,
    grade: 'S' | 'A' | 'B' | 'C',
    records: TopicSessionRecord[]
  ): string {
    const skippedCount = records.filter(r => r.records.some(a => a.isSkipped)).length;

    let evalText = '';
    switch (grade) {
      case 'S':
        evalText = `候选人在 ${metadata.projectName} 项目中展现出了极其出色的技术视野与架构驾驭能力，能够游刃有余地回答底层原理、高并发挑战及极端容灾权衡。具备大厂资深专家/架构师水准，极力推荐。`;
        break;
      case 'A':
        evalText = `候选人对 ${metadata.projectName} 的业务流转与核心技术栈有非常扎实的实战掌控力，面对多轮深挖追问能给出逻辑自洽的方案。整体表现良好，建议通过。`;
        break;
      case 'B':
        evalText = `候选人具备该项目的核心研发经验，但面对并发一致性、边界降级等深度追问时，暴露出一定的理解盲区。需强化系统可用性与容灾架构的系统性思考。`;
        break;
      case 'C':
        evalText = `候选人在面试中存在多处关键知识盲区（跳过或未深入展开 ${skippedCount} 个考点），对项目核心链路掌控力不足，未能形成大厂面试要求的技术闭环，建议回炉巩固后再次挑战。`;
        break;
    }

    return `本次面试综合得分 ${score} 分（${grade} 级）。${evalText}`;
  }

  /** 生成针对性的简历与阐述优化建议 */
  private generateResumeAdvices(metadata: ProjectMetadata, records: TopicSessionRecord[]): string[] {
    const advices: string[] = [
      `【量化产出】：在简历中介绍 ${metadata.projectName} 时，避免纯功能罗列，增加量化指标（例如“将接口响应耗时降低 X%”、“支撑 QPS 达 Y”）。`,
      `【突出 Trade-off】：重点写明技术选型中的对比思考（例如为什么采用 ${metadata.languages.join('/')}，解决了什么实际工程瓶颈）。`,
      `【容灾与稳定性闭环】：在简历的项目难点（STAR）中，补充“如何设计重试与幂等防重机制，保障了极端异常下的数据最终一致性”。`
    ];

    const hasWeaknessInPerf = records.some(r => r.topic.category === 'concurrency_perf' && r.score < 70);
    if (hasWeaknessInPerf) {
      advices.push(`【重点补课】：请在面试前重新梳理分布式锁、缓存一致性与降级熔断方案，大厂技术二面极大概率会在此处展开深挖。`);
    }

    return advices;
  }
}
