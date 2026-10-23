import { calculate } from "../components/FamilyPatternTest";

/** 云端协议与 mindtest-web assessmentReportDev 的 root 校验一致。
 * 页面里的 assessmentVersion「2.0」只留在本机。云端顶层固定 root-h5-v1。
 * 分数来自 FamilyPatternTest.calculate，模块 id 用 subjectivity / emotion / relationship / value。
 * 不上传电话、父母档案、journey、openAnswers、developmentStage。
 */
export const ROOT_VERSION = "root-h5-v1";
export const CONSENT_VERSION = "consent-assessment-root-1";
export const SCHEMA_VERSION = "1.0.0";
export const ASSESSMENT_ID = "root";
export const ASSESSMENT_NAME = "寻根之旅 · 生命成长地图";
export const ROOT_SCREEN_TEXT = "分数用于观察相对状态，不代表医学或人格诊断。这份结果不保存电话，也不保存父母档案或原文。";
export const ROOT_READER_GAP = "阅读页若尚未重绘寻根之旅，生命成长地图在 interpretation、sections 与 textFallback。父母档案与电话不在这份结果里。";

const ABILITY_COUNT = 28;

const ABILITIES = [
  { id: "self_awareness", name: "自我认知", moduleId: "subjectivity", explanation: "了解自己是谁、真正想要什么，并能够辨认自己的需要与价值取向。" },
  { id: "autonomy_boundary", name: "自主边界", moduleId: "subjectivity", explanation: "能够为自己做选择并承担责任，同时区分自己与他人的需要、情绪与责任。" },
  { id: "emotion_awareness", name: "情绪觉察", moduleId: "emotion", explanation: "能够感知、辨认并理解自己的情绪，以及情绪背后正在发生什么。" },
  { id: "emotional_independence", name: "情感独立", moduleId: "emotion", explanation: "在重要关系中既能够保持连接，也能够维持自己的判断、生活重心和内在稳定。" },
  { id: "listening_understanding", name: "倾听理解", moduleId: "relationship", explanation: "能够暂时放下自己的立场，理解他人的观点、感受、需要与行为。" },
  { id: "gentle_expression", name: "柔和表达", moduleId: "relationship", explanation: "能够真实而有边界地表达自己，并在分歧和冲突中促进理解与修复。" },
  { id: "self_worth", name: "自我价值感", moduleId: "value", explanation: "对自身价值具有相对稳定的感受，不完全依赖成绩、身份或他人认可。" },
  { id: "value_realization", name: "价值实现力", moduleId: "value", explanation: "能够识别自己的能力与价值，并逐步将其转化为行动、贡献与现实结果。" },
] as const;

const MODULES = [
  { id: "subjectivity", name: "主体性", abilities: ["self_awareness", "autonomy_boundary"], narrative: "主体性看你如何认识自己，并守住自己的选择。" },
  { id: "emotion", name: "情感力", abilities: ["emotion_awareness", "emotional_independence"], narrative: "情感力看你如何觉察情绪，并在关系里回到自己的生活。" },
  { id: "relationship", name: "关系力", abilities: ["listening_understanding", "gentle_expression"], narrative: "关系力看你如何听懂别人，并真实、有边界地表达。" },
  { id: "value", name: "价值力", abilities: ["self_worth", "value_realization"], narrative: "价值力看你如何感受自身价值，并把它做成现实里的事。" },
] as const;

const CLIMATES = [
  { id: "high_expectation", name: "高期待" },
  { id: "emotional_suppression", name: "情感压抑" },
  { id: "control_intervention", name: "控制干预" },
  { id: "criticism", name: "批评指责" },
  { id: "warmth", name: "温暖支持" },
] as const;

const DEVELOPMENT = [
  { id: "initiative", name: "主动与行动" },
  { id: "identity", name: "身份与主体" },
  { id: "intimacy", name: "亲密与互惠" },
  { id: "generativity", name: "创造与生成" },
] as const;

const MODULE_NAME: Record<(typeof MODULES)[number]["id"], string> = {
  subjectivity: "主体性",
  emotion: "情感力",
  relationship: "关系力",
  value: "价值力",
};

function chars(value: string) {
  return Array.from(String(value || ""));
}

/** 云端昵称沿用结果页已确认的称呼，去掉首尾空白后最多 12 个字。 */
export function rootNickname(value: unknown) {
  return chars(String(value || "").trim()).slice(0, 12).join("");
}

export function phoneNickname(value: string) {
  return /(?:^|[^\d])1[3-9]\d{9}(?:$|[^\d])/.test(value);
}

function likert(list: unknown, length: number): list is number[] {
  return Array.isArray(list) && list.length === length && list.every((value) => Number.isInteger(value) && value >= 1 && value <= 5);
}

export function rootStatus(score: number) {
  if (score >= 85) return { id: "strong", label: "优势明显" };
  if (score >= 75) return { id: "good", label: "发展较好" };
  if (score >= 65) return { id: "stable", label: "较为稳定" };
  if (score >= 55) return { id: "room", label: "有提升空间" };
  if (score >= 45) return { id: "watch", label: "值得关注" };
  if (score >= 35) return { id: "focus", label: "当前成长重点" };
  return { id: "explore", label: "值得深入探索" };
}

function climateLevel(value: number) {
  return ["很少", "较少", "一般", "较明显", "明显"][Math.max(0, Math.min(4, value - 1))];
}

function scoredFromPage(answers: number[]) {
  const page = calculate(answers);
  const moduleScores: Record<string, number> = {};
  for (const module of MODULES) moduleScores[module.id] = page.moduleScores[MODULE_NAME[module.id]];
  return {
    dimensionScores: page.dimensionScores,
    moduleScores,
    contextVariances: page.contextVariances,
  };
}

function ranked(scored: ReturnType<typeof scoredFromPage>) {
  return ABILITIES.map((ability) => ({ ...ability, score: scored.dimensionScores[ability.id] })).sort((left, right) => right.score - left.score);
}

function outcome(scored: ReturnType<typeof scoredFromPage>) {
  const order = ranked(scored);
  const top = order.slice(0, 2).map((ability) => ability.name).join("与");
  const low = order[order.length - 1];
  return {
    headline: "我的生命成长地图",
    code: null,
    label: "自我探索 · 非诊断",
    summary: `较突出的是${top}；相对更值得继续发展的是${low.name}。${ROOT_SCREEN_TEXT}`,
    flags: ABILITIES.filter((ability) => scored.contextVariances[ability.id] === "high").map((ability) => `variance-high:${ability.id}`),
  };
}

function dimensions(scored: ReturnType<typeof scoredFromPage>) {
  const abilities = ABILITIES.map((ability) => {
    const status = rootStatus(scored.dimensionScores[ability.id]);
    return {
      id: ability.id,
      name: ability.name,
      kind: "score" as const,
      score: scored.dimensionScores[ability.id],
      max: 100,
      level: status.id,
      levelLabel: status.label,
      narrative: ability.explanation,
      labels: [] as string[],
      extra: { moduleId: ability.moduleId, contextVariance: scored.contextVariances[ability.id] },
    };
  });
  const modules = MODULES.map((module) => {
    const status = rootStatus(scored.moduleScores[module.id]);
    return {
      id: module.id,
      name: module.name,
      kind: "score" as const,
      score: scored.moduleScores[module.id],
      max: 100,
      level: status.id,
      levelLabel: status.label,
      narrative: module.narrative,
      labels: [] as string[],
      extra: { abilities: module.abilities.slice() },
    };
  });
  return [...abilities, ...modules];
}

function familyClimate(answers: number[]) {
  return CLIMATES.map((climate, index) => ({
    id: climate.id,
    name: climate.name,
    value: answers[ABILITY_COUNT + index],
    levelLabel: climateLevel(answers[ABILITY_COUNT + index]),
  }));
}

function climateLine(answers: number[]) {
  const text = familyClimate(answers).map((climate) => `${climate.name} ${climate.levelLabel}`).join("，");
  return `家庭氛围：${text}。这五档是主观体验，不是对家人的评价。`;
}

function interpretation(scored: ReturnType<typeof scoredFromPage>, answers: number[]) {
  const result = outcome(scored);
  const blocks: Array<{ id: string; title: string; text: string }> = [
    { id: "verdict", title: result.headline, text: result.summary },
    { id: "screen", title: "不是诊断", text: ROOT_SCREEN_TEXT },
  ];
  for (const ability of ABILITIES) {
    const score = scored.dimensionScores[ability.id];
    const status = rootStatus(score);
    blocks.push({ id: ability.id, title: ability.name, text: `${status.label}，${score} 分。${ability.explanation}` });
  }
  for (const module of MODULES) {
    const score = scored.moduleScores[module.id];
    const status = rootStatus(score);
    blocks.push({ id: module.id, title: module.name, text: `${status.label}，${score} 分。${module.narrative}` });
  }
  blocks.push({ id: "climate", title: "家庭氛围", text: climateLine(answers) });
  return blocks;
}

function sections(scored: ReturnType<typeof scoredFromPage>, answers: number[]) {
  const result = outcome(scored);
  const abilities = ABILITIES.map((ability) => `${ability.name} ${scored.dimensionScores[ability.id]} 分，${rootStatus(scored.dimensionScores[ability.id]).label}`).join("。");
  const modules = MODULES.map((module) => `${module.name} ${scored.moduleScores[module.id]} 分，${rootStatus(scored.moduleScores[module.id]).label}`).join("。");
  return [
    { t: "h", l: 2, x: result.headline },
    { t: "p", x: result.summary },
    { t: "p", x: ROOT_SCREEN_TEXT },
    { t: "p", x: `${abilities}。` },
    { t: "p", x: `${modules}。` },
    { t: "p", x: climateLine(answers) },
  ];
}

export type RootReportInput = {
  nickname?: unknown;
  reportId?: string;
  clientSubmissionId?: string;
  completedAt?: string;
  answers?: Array<number | null> | null;
  developmentAnswers?: Array<number | null> | null;
  rushed?: boolean;
};

export function buildRootResult(input?: RootReportInput | null) {
  const nickname = rootNickname(input && input.nickname);
  const answers = input && input.answers;
  const developmentAnswers = input && input.developmentAnswers;
  if (!nickname || phoneNickname(nickname) || !likert(answers, 33) || !likert(developmentAnswers, 4)) return null;
  if (!input?.reportId || !input.clientSubmissionId || !input.completedAt) return null;

  let scored: ReturnType<typeof scoredFromPage>;
  try {
    scored = scoredFromPage(answers.slice(0, 33));
  } catch {
    return null;
  }

  const answerCopy = answers.slice(0, 33);
  const developmentCopy = developmentAnswers.slice(0, 4);
  const rushed = Boolean(input.rushed);
  const reportSections = sections(scored, answerCopy);
  return {
    reportId: input.reportId,
    assessmentId: ASSESSMENT_ID,
    assessmentName: ASSESSMENT_NAME,
    assessmentVersion: ROOT_VERSION,
    nickname,
    completedAt: input.completedAt,
    dimensions: dimensions(scored),
    result: outcome(scored),
    interpretation: interpretation(scored, answerCopy),
    recommendations: [
      { id: "screen", title: null, text: ROOT_SCREEN_TEXT },
      { id: "reader", title: null, text: ROOT_READER_GAP },
    ],
    reportContent: {
      format: "view-model+sections",
      viewModel: {
        answers: answerCopy.slice(),
        developmentAnswers: developmentCopy.slice(),
        abilities: ABILITIES.map((ability) => {
          const status = rootStatus(scored.dimensionScores[ability.id]);
          return {
            id: ability.id,
            name: ability.name,
            score: scored.dimensionScores[ability.id],
            level: status.id,
            levelLabel: status.label,
            contextVariance: scored.contextVariances[ability.id],
            moduleId: ability.moduleId,
          };
        }),
        modules: MODULES.map((module) => {
          const status = rootStatus(scored.moduleScores[module.id]);
          return {
            id: module.id,
            name: module.name,
            score: scored.moduleScores[module.id],
            level: status.id,
            levelLabel: status.label,
          };
        }),
        familyClimate: familyClimate(answerCopy),
        development: DEVELOPMENT.map((item, index) => ({ id: item.id, name: item.name, value: developmentCopy[index] })),
        rushed,
      },
      sections: reportSections,
      textFallback: reportSections.map((section) => section.x).join(""),
    },
    extensionData: {
      answers: answerCopy.slice(),
      developmentAnswers: developmentCopy.slice(),
      score: {
        dimensionScores: { ...scored.dimensionScores },
        moduleScores: { ...scored.moduleScores },
        contextVariances: { ...scored.contextVariances },
        familyClimate: answerCopy.slice(ABILITY_COUNT, 33),
      },
      quality: { rushed },
      consent: {
        agreed: true,
        version: CONSENT_VERSION,
        at: input.completedAt,
        scopes: ["store", "share_link", "mentor_read"],
      },
      compat: { level: "partial", gaps: [ROOT_READER_GAP] },
    },
    source: {
      site: "寻根之旅",
      path: "index.html",
      repo: "root-journey-web",
      origin: "external-repo",
      pageUrl: "https://xiangshu3721.github.io/root-journey-web/",
      clientSubmissionId: input.clientSubmissionId,
      resultKitId: "root",
      localKey: "root-family-pattern-v1",
    },
    schemaVersion: SCHEMA_VERSION,
  };
}
