import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Load the pure TS rules without adding a runtime dependency to the app.
function loadTS(path, transform = (source) => source) {
  const source = transform(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  runInNewContext(compiled, { module, exports: module.exports, require: createRequire(import.meta.url), Date, Set, Map });
  return module.exports;
}
const { generateDevelopmentStage, deriveDevelopmentSignals, updateDevelopmentContext, hasDevelopmentAnswers } = loadTS('../src/lib/developmentStage.ts');
const { calculate } = loadTS('../src/components/FamilyPatternTest.tsx', (source) => source.slice(0, source.indexOf('export function FamilyPatternTest')).replace(/^import .*\n/gm, '') + '\nexport { calculate };');
const scores = { self_awareness: 60, autonomy_boundary: 60, emotion_awareness: 60, emotional_independence: 60, listening_understanding: 60, gentle_expression: 60, self_worth: 60, value_realization: 60 };
const assessment = (extra = {}) => ({ answers: Array(33).fill(3), scores: Object.values(scores), dimensionScores: scores, completedAt: '2026-09-11', assessmentVersion: '2.0', developmentAnswers: [3, 1, 3, 3], ...extra });
const data = (extra = {}) => ({ profile: { birthYear: '', lifeStages: [] }, people: { mother: { keyInteractions: '', lifeEvents: '' }, father: { keyInteractions: '', lifeEvents: '' } }, materials: [], insights: [], ...extra });
const raw = (id, text) => ({ id, text, personId: 'mother', isRaw: true });

test('新增四题独立保存、不会影响原有八维计分', () => {
  const original = Array.from({ length: 33 }, (_, i) => i % 5 + 1);
  assert.deepEqual(calculate([...original, 1, 1, 1, 1]), calculate(original));
  assert.deepEqual(calculate([...original, 5, 5, 5, 5]), calculate(original));
  const a = assessment({ answers: original });
  const before = JSON.stringify(a);
  generateDevelopmentStage(a, data());
  assert.equal(JSON.stringify(a), before);
  assert.equal(hasDevelopmentAnswers([1, 2, 3, 5]), true);
  assert.equal(hasDevelopmentAnswers([1, 2, null, 5]), false);
});
test('无家庭档案可生成，有一个主课题且输出完整', () => {
  const result = generateDevelopmentStage(assessment(), data());
  assert.equal(result.primaryTask, 'identity');
  assert.equal(result.familyContext.show, false);
  assert.ok(result.theory.includes('Erik Erikson'));
  assert.ok(result.personalizedDescription.includes('完全不像我'));
  assert.match(result.growthTask, /^从.+走向/);
  assert.equal(result.stale, false);
});
test('旧用户缺少四题仍可保留原报告，并降低确定性', () => {
  const result = generateDevelopmentStage(assessment({ developmentAnswers: undefined }), data());
  assert.equal(result.confidence, 'low');
});
test('父母特征、父母年龄、否定和推测不能决定本人课题', () => {
  const base = generateDevelopmentStage(assessment(), data());
  const family = data({ profile: { birthYear: '', lifeStages: [] }, materials: [raw('1', '妈妈控制很多。妈妈70岁了，回顾她的一生有许多遗憾。'), raw('2', '妈妈没有替我做决定。妈妈不鼓励我尝试。妈妈不支持我的兴趣。可能妈妈不许我拒绝。')] });
  assert.equal(deriveDevelopmentSignals(family).length, 0);
  assert.equal(generateDevelopmentStage(assessment(), family).primaryTask, base.primaryTask);
  assert.equal(generateDevelopmentStage(assessment(), family).candidates.some((c) => c.task === 'integrity'), false);
});
test('家庭信号只能在原测试前两名接近且有多条独立证据时交换主次', () => {
  const a = assessment({ developmentAnswers: [1, 1, 4, 4] });
  const baseline = generateDevelopmentStage(a, data());
  const topTwo = baseline.candidates.slice(0, 2).map((c) => c.task);
  assert.ok(topTwo.includes('identity'));
  const family = data({ materials: [raw('1', '妈妈替我选择专业。'), raw('2', '父亲否定我的兴趣。'), raw('3', '妈妈不让我自己决定。')] });
  const result = generateDevelopmentStage(a, family);
  assert.ok(topTwo.includes(result.primaryTask));
  assert.equal(result.primaryTask, 'identity');
  const unrelated = data({ materials: [raw('1', '妈妈不让我自己决定。'), raw('2', '父亲不许我拒绝。')] });
  assert.ok(topTwo.includes(generateDevelopmentStage(a, unrelated).primaryTask));
});
test('支持与限制相冲突，降低确定性并如实呈现证据', () => {
  const family = data({ materials: [raw('1', '妈妈替我选择专业。'), raw('2', '爸爸支持我的兴趣。')] });
  const result = generateDevelopmentStage(assessment(), family);
  assert.equal(result.confidence, 'low');
  assert.equal(result.familyContext.evidence.length, 2);
  assert.ok(result.familyContext.summary.includes('同时包含限制与支持'));
});
test('家庭资料新增、修改、删除均标记 stale；刷新只改变卡片', () => {
  const previous = data();
  previous.familyAssessment = assessment();
  previous.familyAssessment.developmentStage = generateDevelopmentStage(previous.familyAssessment, previous);
  const next = updateDevelopmentContext(previous, { ...previous, materials: [raw('1', '妈妈替我选择专业。')] });
  assert.equal(next.parentProfileVersion, 1);
  assert.equal(next.familyAssessment.developmentStage.stale, true);
  assert.equal(next.familyAssessment.answers, previous.familyAssessment.answers);
  assert.equal(next.familyAssessment.dimensionScores, previous.familyAssessment.dimensionScores);
  const refreshed = generateDevelopmentStage(next.familyAssessment, next);
  assert.equal(refreshed.sourceVersion.parentProfileVersion, 1);
  assert.equal(refreshed.stale, false);
  const removed = updateDevelopmentContext(next, { ...next, materials: [] });
  assert.equal(removed.parentProfileVersion, 2);
  assert.equal(removed.developmentSignals.length, 0);
  assert.equal(updateDevelopmentContext(previous, { ...previous, insights: [{ kind: 'dilemma', body: '问题' }] }).parentProfileVersion, undefined);
});
test('人生整合只有本人年龄或人生阶段与生命回顾同时存在时参与', () => {
  const a = assessment({ openAnswers: { story: '回顾我的一生，我有遗憾，也在寻找接纳和意义。' } });
  const eligible = data({ profile: { birthYear: '1950', lifeStages: [] } });
  assert.ok(generateDevelopmentStage(a, eligible).candidates.some((c) => c.task === 'integrity'));
  assert.equal(generateDevelopmentStage(a, data()).candidates.some((c) => c.task === 'integrity'), false);
  assert.equal(generateDevelopmentStage(assessment(), eligible).candidates.some((c) => c.task === 'integrity'), false);
});
