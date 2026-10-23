import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function loadTS(path, transform = (source) => source, requireMap = {}) {
  const source = transform(readFileSync(new URL(path, import.meta.url), "utf8"));
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => requireMap[id] || createRequire(import.meta.url)(id);
  runInNewContext(compiled, { module, exports: module.exports, require: localRequire, Date, Set, Map, Array, Math, Number, String, Object, JSON, Intl, globalThis, btoa: globalThis.btoa, Uint8Array }, { filename: path });
  return module.exports;
}

const family = loadTS("../src/components/FamilyPatternTest.tsx", (source) => source.slice(0, source.indexOf("export function FamilyPatternTest")).replace(/^import .*\n/gm, "") + "\nexport { calculate, patternDimensions };");
const payload = loadTS("../src/lib/cloud-payload.ts", (source) => source, { "../components/FamilyPatternTest": family });
const client = loadTS("../src/lib/cloud-client.ts");
const { buildRootResult, rootNickname, ASSESSMENT_ID, ASSESSMENT_NAME, ROOT_VERSION, SCHEMA_VERSION } = payload;
const { calculate } = family;
const { buildShareUrl, parseShareLink, createSubmissionIds, ASSESSMENT_CLOUD_CONFIG } = client;

function base(extra) {
  return {
    nickname: "林深",
    reportId: "rpt_abcdefghijk",
    clientSubmissionId: "sub_abcdefghijklmnop",
    completedAt: "2026-10-23T15:04:05+08:00",
    ...extra,
  };
}

function answers() {
  return Array.from({ length: 33 }, (_, index) => (index % 5) + 1);
}

function same(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

function keysOf(value, found = []) {
  if (!value || typeof value !== "object") return found;
  const keys = Array.isArray(value) ? [] : Object.keys(value);
  for (const key of keys) {
    found.push(key);
    keysOf(value[key], found);
  }
  if (Array.isArray(value)) value.forEach((item) => keysOf(item, found));
  return found;
}

test("称呼取前 12 个字，空称呼和坏答案不上传", () => {
  assert.equal(rootNickname("  林深  "), "林深");
  assert.equal(rootNickname(`${"林深".repeat(6)}尾`), "林深".repeat(6));
  assert.equal(rootNickname("   "), "");
  assert.equal(buildRootResult(base({ nickname: "  ", answers: answers() })), null);
  assert.equal(buildRootResult(base({ answers: answers().slice(0, 32) })), null);
  assert.equal(buildRootResult(base({ answers: answers(), reportId: "" })), null);
  assert.equal(buildRootResult(base({ answers: Array(33).fill(0) })), null);
  assert.equal(buildRootResult(base({ answers: Array(33).fill(6) })), null);
  assert.equal(buildRootResult(base({ answers: Array(33).fill(1.5) })), null);
  assert.equal(buildRootResult(base({ nickname: "13800000000", answers: answers(), developmentAnswers: [3, 1, 5, 2] })), null);
  assert.equal(buildRootResult(base({ answers: answers() })), null);
  assert.equal(buildRootResult(base({ answers: answers(), developmentAnswers: [1, null, 3, 4] })), null);
});

test("完整作答生成协议，分数跟 calculate，不含私人档案", () => {
  const raw = answers();
  raw[1] = 5;
  const developmentAnswers = [3, 1, 5, 2];
  const scored = calculate(raw);
  const report = buildRootResult(base({
    nickname: `${"林深".repeat(6)}多余`,
    answers: raw,
    developmentAnswers,
    phone: "13800000000",
    wechat: "secret-wechat",
    wechatQr: "secret-qr",
    profile: { name: "张三", phone: "13800000000", wechatQr: "secret-qr" },
    people: { father: { name: "父亲真名" }, mother: { name: "母亲真名" } },
    parentArchive: { father: "父亲真名" },
    journey: { profile: { phone: "13800000000" } },
    materials: [{ text: "妈妈替我选择专业" }],
    insights: [{ body: "SECRET_INSIGHT" }],
    openAnswers: { life: "SECRET_OPEN 我的余生很遗憾" },
    developmentStage: {
      primaryTask: "identity",
      primaryTaskName: "身份与主体",
      secondaryTask: "intimacy",
      secondaryTaskName: "亲密与互惠",
      theory: "Erik Erikson 心理社会发展理论",
      theoryStage: "同一性 vs 角色混乱",
      confidence: "medium",
      coreQuestion: "我是谁？什么对我真正重要？",
      growthTask: "从以外部期待安排自己，走向形成自己的价值排序与生活方向。",
      generalDescription: "这一任务关注把不同角色整合为对自己的认识。",
      personalizedDescription: "SECRET_OPEN 我的余生",
      familyContext: { show: true, summary: "SECRET_FAMILY", evidence: [{ evidence: "妈妈替我选择专业", sourceId: "mom" }] },
    },
  }));
  const packed = JSON.stringify(report);
  assert.equal(report.assessmentId, "root");
  assert.equal(report.assessmentId, ASSESSMENT_ID);
  assert.equal(report.assessmentName, "寻根之旅 · 生命成长地图");
  assert.equal(report.assessmentName, ASSESSMENT_NAME);
  assert.equal(report.assessmentName.includes("寻根之旅"), true);
  assert.equal(report.assessmentName.includes("生命成长地图"), true);
  assert.equal(report.assessmentVersion, "root-h5-v1");
  assert.equal(report.assessmentVersion, ROOT_VERSION);
  assert.equal(report.schemaVersion, "1.0.0");
  assert.equal(report.schemaVersion, SCHEMA_VERSION);
  assert.equal(report.nickname, "林深".repeat(6));
  assert.equal(report.extensionData.assessmentVersion, undefined);
  assert.equal(report.extensionData.scoringVersion, undefined);
  same(Object.keys(report.extensionData).sort(), ["answers", "compat", "consent", "developmentAnswers", "quality", "score"]);
  same(report.extensionData.consent.scopes, ["store", "share_link", "mentor_read"]);
  assert.equal(report.extensionData.consent.version, "consent-assessment-root-1");
  assert.equal(report.extensionData.quality.rushed, false);
  assert.equal(report.reportContent.viewModel.rushed, false);
  assert.equal(report.extensionData.compat.level, "partial");
  assert.equal(report.source.repo, "root-journey-web");
  assert.equal(report.source.origin, "external-repo");
  assert.equal(report.source.path, "index.html");
  assert.equal(report.source.pageUrl, "https://xiangshu3721.github.io/root-journey-web/");
  assert.equal(report.source.resultKitId, "root");
  assert.equal(report.source.localKey, "root-family-pattern-v1");
  assert.equal(report.reportContent.format, "view-model+sections");
  assert.equal(report.reportContent.textFallback, report.reportContent.sections.map((section) => section.x).join(""));
  same(report.extensionData.answers, raw);
  same(report.reportContent.viewModel.answers, raw);
  assert.equal(report.extensionData.answers[1], 5);
  same(report.extensionData.developmentAnswers, developmentAnswers);
  same(report.reportContent.viewModel.developmentAnswers, developmentAnswers);
  same(report.extensionData.score.dimensionScores, scored.dimensionScores);
  same(report.extensionData.score.moduleScores, {
    subjectivity: scored.moduleScores["主体性"],
    emotion: scored.moduleScores["情感力"],
    relationship: scored.moduleScores["关系力"],
    value: scored.moduleScores["价值力"],
  });
  same(report.extensionData.score.familyClimate, raw.slice(28));
  same(report.dimensions.slice(0, 8).map((item) => item.id), ["self_awareness", "autonomy_boundary", "emotion_awareness", "emotional_independence", "listening_understanding", "gentle_expression", "self_worth", "value_realization"]);
  same(report.dimensions.slice(0, 8).map((item) => item.score), patternScores(scored));
  report.dimensions.slice(0, 8).forEach((item) => assert.ok(item.score >= 15 && item.score <= 92));
  same(report.dimensions.slice(8).map((item) => item.id), ["subjectivity", "emotion", "relationship", "value"]);
  same(report.dimensions.slice(8).map((item) => item.score), ["主体性", "情感力", "关系力", "价值力"].map((name) => scored.moduleScores[name]));
  same(report.reportContent.viewModel.familyClimate.map((item) => item.name), ["高期待", "情感压抑", "控制干预", "批评指责", "温暖支持"]);
  assert.equal(report.reportContent.viewModel.familyClimate[0].value, raw[28]);
  assert.equal(report.result.code, null);
  assert.equal(report.recommendations[0].title, null);
  assert.equal(packed.includes("13800000000"), false);
  assert.equal(packed.includes("secret-wechat"), false);
  assert.equal(packed.includes("secret-qr"), false);
  assert.equal(packed.includes("父亲真名"), false);
  assert.equal(packed.includes("母亲真名"), false);
  assert.equal(packed.includes("SECRET_INSIGHT"), false);
  assert.equal(packed.includes("SECRET_OPEN"), false);
  assert.equal(packed.includes("SECRET_FAMILY"), false);
  assert.equal(packed.includes("妈妈替我选择专业"), false);
  assert.equal(packed.includes("张三"), false);
  for (const key of ["phone", "wechat", "wechatQr", "profile", "people", "parentArchive", "journey", "materials", "insights", "openAnswers", "developmentStage", "familyContext", "personalizedDescription"]) {
    assert.equal(keysOf(report).includes(key), false, key);
  }
  assert.equal(report.result.headline, "我的生命成长地图");
  assert.equal(report.result.summary.includes("不代表医学或人格诊断"), true);
  same(Object.keys(report).sort(), [
    "assessmentId", "assessmentName", "assessmentVersion", "completedAt", "dimensions",
    "extensionData", "interpretation", "nickname", "recommendations", "reportContent",
    "reportId", "result", "schemaVersion", "source",
  ].sort());
});

test("均匀作答时自我价值感情境落差为 high，且分数压在 15 到 92", () => {
  const raw = Array(33).fill(3);
  const report = buildRootResult(base({ answers: raw, developmentAnswers: [3, 3, 3, 3] }));
  const scored = calculate(raw);
  assert.equal(report.extensionData.score.contextVariances.self_worth, "high");
  assert.equal(report.extensionData.score.contextVariances.self_worth, scored.contextVariances.self_worth);
  assert.equal(report.dimensions.every((item) => item.score >= 15 && item.score <= 92), true);
  assert.equal(JSON.stringify(report).includes("developmentStage"), false);
});

test("分享链接是 mindtest-web 短链，提交体不带密钥", () => {
  const ids = createSubmissionIds();
  const url = buildShareUrl(ASSESSMENT_CLOUD_CONFIG.reportPageBase, ids.reportId, ids.linkSecret);
  assert.match(url, /^https:\/\/xiangshu3721\.github\.io\/mindtest-web\/r\/#[A-Za-z0-9_-]{11,64}\.[A-Za-z0-9_-]{16,128}$/);
  assert.equal(url.includes("rpt_"), false);
  assert.equal(parseShareLink(url).reportId, ids.reportId);
  assert.equal(parseShareLink(url).linkSecret, ids.linkSecret);
  assert.equal(ASSESSMENT_CLOUD_CONFIG.endpoint.endsWith("/assessment-report-dev"), true);
  const share = readFileSync(new URL("../src/lib/cloud-share.ts", import.meta.url), "utf8");
  const button = readFileSync(new URL("../src/components/ShareResult.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.equal(share.includes("/v1/results"), true);
  assert.equal(share.includes("rootSubmitBody"), true);
  assert.equal(share.includes("authorization"), false);
  assert.equal(share.includes("apiKey"), false);
  assert.equal(share.includes("api-key"), false);
  assert.equal(share.includes("微信"), false);
  assert.equal(share.includes("二维码"), false);
  assert.equal(button.includes("分享结果"), true);
  assert.equal(button.includes("disabled={busy}"), true);
  assert.equal(button.includes("重试"), true);
  assert.equal(button.includes("微信"), false);
  assert.equal(button.includes("二维码"), false);
  assert.equal(app.includes("<ShareResult"), true);
  assert.equal(app.includes("导出图片") || readFileSync(new URL("../src/components/FamilyPatternTest.tsx", import.meta.url), "utf8").includes("导出图片"), true);
  assert.equal(readFileSync(new URL("../src/components/FamilyPatternTest.tsx", import.meta.url), "utf8").includes("历史记录"), true);
});

function patternScores(scored) {
  return ["self_awareness", "autonomy_boundary", "emotion_awareness", "emotional_independence", "listening_understanding", "gentle_expression", "self_worth", "value_realization"].map((id) => scored.dimensionScores[id]);
}
