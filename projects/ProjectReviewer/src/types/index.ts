/**
 * ProjectReviewer 核心领域模型与服务契约类型定义
 */

/** 面试官风格模式 */
export type InterviewerMode = 'architect' | 'comprehensive';

/** 面试会话状态枚举 */
export type SessionState = 
  | 'IDLE' 
  | 'ANALYZING' 
  | 'ASKING_MAIN' 
  | 'FOLLOW_UP' 
  | 'AWAITING_ANSWER' 
  | 'GENERATING_REVIEW' 
  | 'FINISHED' 
  | 'TERMINATED';

/** 项目元数据与代码特征感知 */
export interface ProjectMetadata {
  projectName: string;
  sourceType: 'local' | 'github';
  sourcePath: string;
  languages: string[];
  frameworks: string[];
  dependencies: Record<string, string>;
  fileCount: number;
  keyFiles: string[];
  summary: string;
  architectureHighlights: string[];
}

/** 考点类别 */
export type TopicCategory = 
  | 'architecture' 
  | 'core_logic' 
  | 'concurrency_perf' 
  | 'edge_cases' 
  | 'engineering';

/** 单个主考点大纲 */
export interface TopicAgenda {
  id: string; // T1 ~ T5
  category: TopicCategory;
  title: string;
  targetFile?: string;
  codeSnippetRef?: string;
  mainQuestion: string;
  expectedKeyPoints: string[];
}

/** 候选人单次回答记录 */
export interface AnswerRecord {
  question: string;
  isFollowUp: boolean;
  followUpDepth: number; // 0: 主问题, 1~2: 追问
  answer: string;
  isSkipped: boolean;
  answeredAt: number;
}

/** 单个考点的完整考察记录 (包含主问与追问链) */
export interface TopicSessionRecord {
  topic: TopicAgenda;
  records: AnswerRecord[];
  score: number; // 0 ~ 100
  strengths: string[];
  weaknesses: string[];
  bestPracticeAnswer: string;
  improvementAdvice: string;
}

/** 四维得分明细 */
export interface DimensionScores {
  technicalDepth: number;      // 权重 40% (底层原理与深度)
  architecturalDesign: number;  // 权重 30% (方案设计与Trade-off)
  engineeringRobustness: number;// 权重 20% (并发/容灾/边界防范)
  communicationLogic: number;   // 权重 10% (STAR结构与表达逻辑)
}

/** 综合复盘报告对象 */
export interface ReviewReport {
  projectName: string;
  interviewDate: string;
  mode: InterviewerMode;
  totalScore: number;
  grade: 'S' | 'A' | 'B' | 'C';
  dimensions: DimensionScores;
  topicRecords: TopicSessionRecord[];
  overallSummary: string;
  resumeAdvices: string[];
  markdownFilePath: string;
}

/** CLI 启动与配置参数 */
export interface ReviewerOptions {
  source: string;
  mode?: InterviewerMode;
  isRetry?: boolean;
  isNext?: boolean;
  outputDir?: string;
}

/** 代码感知扫描器接口 */
export interface IProjectScanner {
  scanProject(source: string): Promise<ProjectMetadata>;
  getFileSnippet(source: string, relativePath: string, maxLines?: number): Promise<string>;
}

/** 面试引擎服务接口 */
export interface IInterviewEngine {
  initSession(metadata: ProjectMetadata, options?: ReviewerOptions): Promise<TopicAgenda[]>;
  getCurrentPrompt(): { question: string; isFollowUp: boolean; progress: string };
  submitAnswer(answer: string): Promise<{
    nextAction: 'FOLLOW_UP' | 'NEXT_TOPIC' | 'COMPLETE';
    followUpQuestion?: string;
  }>;
  skipCurrentTopic(): { nextAction: 'NEXT_TOPIC' | 'COMPLETE' };
  requestEarlyExit(): { canGenerateReport: boolean; answeredCount: number };
}

/** 评分与复盘生成服务接口 */
export interface IReviewEvaluator {
  evaluate(metadata: ProjectMetadata, records: TopicSessionRecord[]): Promise<ReviewReport>;
}

/** 复盘文件持久化与展示服务接口 */
export interface IReportStorage {
  saveReport(report: ReviewReport, baseOutputDir?: string): Promise<string>;
  saveProjectProfile(metadata: ProjectMetadata, baseOutputDir?: string): Promise<string>;
  formatConsoleSummary(report: ReviewReport): string;
}
