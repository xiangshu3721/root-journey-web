import type { FamilyPatternAssessment, JourneyData } from '../types';

export type DevelopmentTask = 'trust' | 'autonomy' | 'initiative' | 'competence' | 'identity' | 'intimacy' | 'generativity' | 'integrity';
export type DevelopmentSignal = { task: DevelopmentTask; direction: 'risk' | 'support'; evidence: string; sourceId: string; strength: 'weak' | 'moderate' | 'strong' };
export type DevelopmentStageInsight = {
  primaryTask: DevelopmentTask; primaryTaskName: string; secondaryTask?: DevelopmentTask; secondaryTaskName?: string;
  theory: string; theoryStage: string; confidence: 'low' | 'medium' | 'high'; coreQuestion: string;
  generalDescription: string; personalizedDescription: string; growthTask: string;
  familyContext: { show: boolean; summary: string; evidence: DevelopmentSignal[] };
  sourceVersion: { testVersion: number; parentProfileVersion: number }; stale: boolean; generatedAt: string;
  candidates: Array<{ task: DevelopmentTask; score: number }>;
};

export const developmentQuestions = [
  { id: 'D01', domain: '主动与行动', text: '当我真正想做一件事时，即使不确定结果、或者别人不太支持，我通常也能允许自己先开始尝试。' },
  { id: 'D02', domain: '身份与主体', text: '我对自己真正看重什么、想过怎样的生活，已经比较清楚。' },
  { id: 'D03', domain: '亲密与互惠', text: '在重要关系里，我既能和对方保持亲近，也能保留自己的边界、感受和选择。' },
  { id: 'D04', domain: '创造与生成', text: '我目前有一些愿意长期投入、持续创造，并希望对自己或他人产生真实价值的事情。' }
] as const;
export const answerOptions = ['完全不像我', '比较不像我', '有时如此', '比较像我', '非常像我'];
export const hasDevelopmentAnswers = (answers?: Array<number | null>): answers is number[] =>
  answers?.length === 4 && answers.every((answer) => Number.isInteger(answer) && Number(answer) >= 1 && Number(answer) <= 5);

type TaskDefinition = { name: string; conflict: string; question: string; description: string; growth: string; dimensions: string[]; items: Array<[number, boolean, string]>; calibration?: number };
// Product candidate mapping, not a standardized conversion from the eight-dimension assessment.
// Item numbers refer to the unchanged 28 ability items; family-climate answers never determine a task.
export const developmentTasks: Record<DevelopmentTask, TaskDefinition> = {
  trust: { name: '安全与信任', conflict: '基本信任 vs 不信任', question: '面对关系里的不确定，我能否保有安全感，并逐步相信支持是可能的？', description: '这一任务关注对自己、他人和环境的基本信任。常见的探索包括：在不确定中保持稳定，分辨真实风险与预期的失望，也允许自己需要和接受可靠的支持。', growth: '从在不确定中反复确认安全，走向辨认可靠支持并保持内在稳定。', dimensions: ['emotion_awareness', 'emotional_independence'], items: [[12, true, '他人冷淡时容易被关系牵动'], [14, false, '关系变化后能慢慢回到自己的生活'], [18, false, '被激怒时能稍作停顿']] },
  autonomy: { name: '自主与边界', conflict: '自主 vs 羞耻/怀疑', question: '我能否做自己的选择，并承受与别人不同带来的不安？', description: '这一任务关注自主选择与自我信任。常见的表现可能是做决定时反复寻找许可、拒绝后内疚，或在坚持自己与照顾关系之间摇摆；整合的方向是能够选择，也能够承担选择的责任。', growth: '从依赖外部许可、拒绝后撤回界限，走向信任自己的判断并承担选择。', dimensions: ['autonomy_boundary'], items: [[5, false, '不被认同时仍能判断什么适合自己'], [6, false, '能对不合理要求说不'], [7, true, '拒绝后因内疚而撤回界限']] },
  initiative: { name: '主动与行动', conflict: '主动 vs 内疚', question: '我能否允许自己有所想要，并主动发起尝试？', description: '这一任务关注愿望能否转化为主动尝试。人可能因为担心打扰别人、出错或不被支持而收回行动，也可能逐渐学会在考虑影响的同时，为自己的兴趣和尝试留出位置。', growth: '从因不确定或内疚而收回愿望，走向允许自己发起并尝试。', dimensions: ['autonomy_boundary', 'value_realization'], items: [[26, false, '重要的事情能从思考进入行动'], [28, false, '结果不确定时也愿意先尝试']], calibration: 0 },
  competence: { name: '能力与胜任', conflict: '勤奋 vs 自卑', question: '我能否在学习与完成事情的过程中，建立有根据的胜任感？', description: '这一任务关注努力、能力与胜任感之间的连接。常见的探索是如何面对比较和失败、允许自己尚未熟练，并通过真实的学习和完成体验认识能力，而不把一次表现当成全部价值。', growth: '从用表现反复证明自身价值，走向允许试错并积累真实的胜任感。', dimensions: ['self_worth', 'value_realization'], items: [[22, false, '没有成果时仍觉得自己有价值'], [23, true, '失败或不被认可时彻底否定自己'], [25, false, '知道自己的能力能创造什么价值']] },
  identity: { name: '身份与主体', conflict: '同一性 vs 角色混乱', question: '我是谁？什么对我真正重要？我想过怎样的生活？', description: '这一任务关注把不同角色、经历和价值逐步整合为对自己的认识。人可能在外部期待与个人愿望之间摇摆，也可能通过探索与选择，逐渐形成较清楚又能继续发展的生活方向。', growth: '从以外部期待安排自己，走向形成自己的价值排序与生活方向。', dimensions: ['self_awareness', 'autonomy_boundary'], items: [[1, false, '能区分自己的愿望与别人的期待'], [2, true, '意见不同时容易怀疑自己的判断'], [3, false, '会依据真正看重的事调整选择']], calibration: 1 },
  intimacy: { name: '亲密与互惠', conflict: '亲密 vs 孤独', question: '我能否与人真正靠近，同时保有自己的边界和选择？', description: '这一任务关注在保有自我的同时建立亲密与相互承诺。常见的探索是如何表达需要、理解差异、承受距离，以及让付出和回应具有互惠性，既不因靠近失去自己，也不因害怕受伤而始终退开。', growth: '从在依附与退开之间摇摆，走向保有自我的亲近与互惠。', dimensions: ['emotional_independence', 'listening_understanding', 'gentle_expression'], items: [[11, false, '重要关系中保持自己的生活节奏'], [13, false, '能直接表达情感和需要'], [21, false, '冲突后愿意并能够修复关系']], calibration: 2 },
  generativity: { name: '创造与生成', conflict: '生成 vs 停滞', question: '我愿意持续投入什么，让生命产生超出眼前回报的价值？', description: '这一任务关注持续创造、关怀与贡献，可能体现在工作、养育、传承、创作或支持他人中。人往往会重新思考时间要投向哪里，以及如何让自己的能力形成对自己与他人有意义的长期投入。', growth: '从停在想法或短期回报，走向持续投入、创造与贡献。', dimensions: ['value_realization'], items: [[25, false, '知道自己的能力能创造什么价值'], [26, false, '重要的事情能从思考进入行动'], [28, false, '愿意将想法放进现实尝试']], calibration: 3 },
  integrity: { name: '人生整合', conflict: '自我整合 vs 绝望', question: '我如何理解并接纳自己走过的人生，让遗憾与意义共存？', description: '这一任务关注回看生命时的接纳与完整感。常见的探索包括看待未完成的愿望、承认限制与遗憾，也重新辨认已经建立的关系、选择和贡献，使生命经历获得更连贯的意义。', growth: '从只被遗憾与未完成牵动，走向容纳局限并整合生命的意义。', dimensions: ['self_worth', 'self_awareness'], items: [[24, false, '反思不足时仍尊重和支持自己']] }
};

const dimensionNames: Record<string, string> = { emotion_awareness: '情绪觉察', emotional_independence: '情感独立', autonomy_boundary: '自主边界', value_realization: '价值实现力', self_worth: '自我价值感', self_awareness: '自我认知', listening_understanding: '倾听理解', gentle_expression: '柔和表达' };
const dimensionOrder = Object.keys(dimensionNames);
const scoreOrder = ['self_awareness', 'autonomy_boundary', 'emotion_awareness', 'emotional_independence', 'listening_understanding', 'gentle_expression', 'self_worth', 'value_realization'];
const validAnswer = (n: unknown): n is number => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 5;
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 50;

// Only concrete caregiver-to-user statements are eligible. A parent's trait or biography alone is not evidence.
const signalPatterns: Array<[DevelopmentTask, RegExp, RegExp]> = [
  ['trust', /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?:经常吵架|反复失约|突然发火|不让我哭|不许我哭)/, /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?<!不)(?:安慰我|听我说|在我难过时陪我|保护我)/],
  ['autonomy', /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?:不让我自己决定|不许我拒绝|替我做决定|要求我听话)/, /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?<!不)(?:让我自己决定|尊重我的选择|允许我说不)/],
  ['initiative', /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?:不让我尝试|嘲笑我的想法|责怪我想要)/, /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?<!不)(?:鼓励我尝试|支持我的想法|允许我试错)/],
  ['competence', /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?:只看我的成绩|拿我和别人比较|考不好就骂我|说我没用)/, /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?<!不)(?:肯定我的努力|失败时鼓励我|陪我练习)/],
  ['identity', /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?:要求我按他们的安排|否定我的兴趣|替我选择专业)/, /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?<!不)(?:支持我的兴趣|尊重我的想法|鼓励我探索)/],
  ['intimacy', /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?:用冷战惩罚我|不允许我表达感受|要求我牺牲自己)/, /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?<!不)(?:认真听我的感受|愿意向我道歉|和我商量)/],
  ['generativity', /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?:要求我放弃创作|不允许我从事喜欢的工作)/, /(?:家人|父母|爸爸|妈妈|父亲|母亲).{0,12}(?<!不)(?:支持我长期创作|鼓励我帮助别人|支持我的事业)/]
];

export function deriveDevelopmentSignals(data: JourneyData): DevelopmentSignal[] {
  const sources = data.materials.filter((m) => (m.personId === 'mother' || m.personId === 'father') && (m.isRaw || (!m.rawEntryId && ['fact', 'experience', 'raw'].includes(m.evidenceType || 'experience')))).map((m) => ({ sourceId: m.id, text: m.text }));
  for (const insight of data.insights.filter((item) => item.kind === 'portrait')) {
    const text = [insight.portraitSummary, ...Object.values(insight.portraitSections || {})].filter(Boolean).join('。');
    if (text) sources.push({ sourceId: insight.id, text });
  }
  for (const id of ['mother', 'father'] as const) {
    for (const field of ['keyInteractions', 'lifeEvents'] as const) sources.push({ sourceId: `${id}.${field}`, text: data.people[id][field] || '' });
  }
  const signals: DevelopmentSignal[] = [];
  for (const source of sources) for (const evidence of source.text.split(/[。！？\n]/).map((s) => s.trim()).filter(Boolean)) {
    // Do not interpret quoted hypotheses, negated claims or contrasts as simple directional evidence.
    if (/可能|也许|假如|如果|并不|没有|不是|不再|从不|未曾|但|以前|后来/.test(evidence)) continue;
    for (const [task, risk, support] of signalPatterns) {
      const direction = risk.test(evidence) ? 'risk' : support.test(evidence) ? 'support' : undefined;
      if (direction && !signals.some((s) => s.task === task && s.evidence === evidence)) signals.push({ task, direction, evidence, sourceId: source.sourceId, strength: 'moderate' });
    }
  }
  return signals;
}

export function generateDevelopmentStage(assessment: FamilyPatternAssessment, data: JourneyData): DevelopmentStageInsight {
  const calibration = assessment.developmentAnswers;
  const calibrated = hasDevelopmentAnswers(calibration);
  const dimensionScore = (id: string) => {
    const score = assessment.dimensionScores?.[id] ?? assessment.scores[scoreOrder.indexOf(id)];
    return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 50;
  };
  const candidates: Array<{ task: DevelopmentTask; score: number }> = (Object.keys(developmentTasks) as DevelopmentTask[]).filter((task) => task !== 'integrity').map((task) => {
    const definition = developmentTasks[task];
    const items = definition.items.flatMap(([n, reverse]) => validAnswer(assessment.answers[n - 1]) ? [(reverse ? assessment.answers[n - 1]! - 1 : 5 - assessment.answers[n - 1]!) * 25] : []);
    const existing = mean(items) * .7 + mean(definition.dimensions.map((id) => 100 - dimensionScore(id))) * .3;
    const score = calibrated && definition.calibration !== undefined ? (5 - calibration[definition.calibration]) * 25 * .65 + existing * .35 : existing;
    return { task, score: Math.round(score * 10) / 10 };
  });
  // Stage 8 requires personal life-stage AND explicit personal life-review evidence, never parents' ages or stories.
  const year = Number(data.profile.birthYear);
  const age = new Date().getFullYear() - year;
  const laterLife = (year > 1900 && age >= 60 && age <= 120) || data.profile.lifeStages.some((s) => /退休|晚年|老年/.test(s));
  const reflection = Object.values(assessment.openAnswers || {}).find((s) => /回顾我的一生|回顾自己的一生|我的余生|我已退休|我的晚年/.test(s) && /遗憾|意义|衰老|死亡|接纳|完整|后悔/.test(s));
  if (laterLife && reflection) candidates.push({ task: 'integrity', score: 65 });
  candidates.sort((a, b) => b.score - a.score);
  const [first, second] = candidates;
  const signals = deriveDevelopmentSignals(data);
  const riskCount = (task: DevelopmentTask) => new Set(signals.filter((s) => s.task === task && s.direction === 'risk').map((s) => s.sourceId)).size;
  const close = first.score - second.score <= 5;
  const swap = close && riskCount(second.task) >= 2 && riskCount(second.task) > riskCount(first.task) && !signals.some((s) => s.task === second.task && s.direction === 'support');
  const primary = swap ? second : first;
  const secondary = swap ? first : second;
  const definition = developmentTasks[primary.task];
  const familyEvidence = signals.filter((s) => s.task === primary.task).slice(0, 4);
  const hasSupport = familyEvidence.some((s) => s.direction === 'support');
  const hasRisk = familyEvidence.some((s) => s.direction === 'risk');
  const contradiction = hasRisk && hasSupport;
  const complete = assessment.answers.length === 33 && assessment.answers.every(validAnswer) && calibrated;
  const responses = definition.items.filter(([n]) => validAnswer(assessment.answers[n - 1])).map(([n, , label]) => `关于“${label}”，你选择了“${answerOptions[assessment.answers[n - 1]! - 1]}”`);
  const conflictingTest = calibrated && definition.calibration !== undefined && Math.abs((5 - calibration[definition.calibration]) * 25 - mean(definition.items.map(([n, reverse]) => validAnswer(assessment.answers[n - 1]) ? (reverse ? assessment.answers[n - 1]! - 1 : 5 - assessment.answers[n - 1]!) * 25 : 50))) >= 45;
  let confidence: DevelopmentStageInsight['confidence'] = !complete || close || primary.score < 35 || contradiction || conflictingTest || primary.task === 'integrity' ? 'low' : 'medium';
  if (confidence === 'medium' && primary.score >= 65 && first.score - second.score >= 15 && riskCount(primary.task) >= 2 && !hasSupport) confidence = 'high';
  const parts = [confidence === 'low' ? `目前可以先把“${definition.name}”作为探索方向，证据还不足以做明确判断。` : `从目前作答看，“${definition.name}”是相对更值得关注的发展课题。`, ...responses.slice(0, 2)];
  if (calibrated && definition.calibration !== undefined) parts.push(`在新增的“${developmentQuestions[definition.calibration].domain}”题中，你选择了“${answerOptions[calibration[definition.calibration] - 1]}”。`);
  parts.push(`原报告中的${definition.dimensions.filter((id) => dimensionOrder.includes(id)).map((id) => `${dimensionNames[id]}为 ${dimensionScore(id)} 分`).join('、')}，也作为候选参考。`);
  if (primary.task === 'integrity' && reflection) parts.push(`你已有的生命回顾中写到：“${reflection}”。`);
  if (conflictingTest) parts.push('新增作答与原测试呈现了不同侧面，可能与情境有关，需要结合现实经历继续核对。');
  const familySummary = !familyEvidence.length ? '' : contradiction ? '家庭材料同时包含限制与支持，不能据此确定形成原因，当前解读保留较低确定性。' : hasSupport ? '这些成长记录提供了支持性的经历，提醒我们不能把当前困难简单归因于家庭，也可以继续看这些资源如何发挥作用。' : '这些具体成长记录可能提供一条理解线索，与测试中的课题存在呼应；它们不能证明因果关系，也不能单独决定你的发展课题。';
  return { primaryTask: primary.task, primaryTaskName: definition.name, ...(secondary.score >= 35 && Math.abs(primary.score - secondary.score) <= 12 ? { secondaryTask: secondary.task, secondaryTaskName: developmentTasks[secondary.task].name } : {}), theory: 'Erik Erikson 心理社会发展理论', theoryStage: definition.conflict, confidence, coreQuestion: definition.question, generalDescription: definition.description, personalizedDescription: parts.join('；').replace(/。；/g, '。'), growthTask: definition.growth, familyContext: { show: !!familyEvidence.length, summary: familySummary, evidence: familyEvidence }, sourceVersion: { testVersion: assessment.testVersion || 1, parentProfileVersion: data.parentProfileVersion || 0 }, stale: false, generatedAt: new Date().toISOString(), candidates };
}

function parentSnapshot(data: JourneyData) {
  return JSON.stringify({ people: data.people, materials: data.materials.filter((m) => m.personId === 'mother' || m.personId === 'father'), summaries: data.insights.filter((i) => i.kind === 'portrait') });
}

export function updateDevelopmentContext(previous: JourneyData, next: JourneyData): JourneyData {
  if (parentSnapshot(previous) === parentSnapshot(next)) return next;
  const assessment = next.familyAssessment;
  return { ...next, parentProfileVersion: (previous.parentProfileVersion || 0) + 1, developmentSignals: deriveDevelopmentSignals(next), familyAssessment: assessment?.developmentStage ? { ...assessment, developmentStage: { ...assessment.developmentStage, stale: true } } : assessment };
}
