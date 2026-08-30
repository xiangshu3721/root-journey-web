import { useMemo, useState } from 'react';
import type { FamilyPatternAssessment } from '../types';

export const patternDimensions = [
  { name: '亲密距离失衡', note: '靠得太近、过度卷入，或彼此疏远、难以亲近的经验。', subtype: '偏向：融合 / 疏离 / 两者并存' },
  { name: '自主边界受限', note: '个人选择、隐私和边界是否常被忽略或替代。' },
  { name: '情感回应不足', note: '感受、害怕和需要是否曾被认真看见与回应。' },
  { name: '沟通表达受限', note: '家庭中能否坦诚表达、倾听和讨论真实想法。' },
  { name: '冲突不安全与三角化', note: '冲突是否容易变成回避、爆发，或让第三人卷入。' },
  { name: '条件认可与羞耻压力', note: '认可是否常与成绩、表现、懂事或听话绑定。' },
  { name: '角色倒置与过度责任', note: '是否很早开始照顾他人或承担超出年龄的责任。' },
  { name: '家庭规则与适应失衡', note: '家庭规则是否过度僵化、混乱，或两者交替出现。', subtype: '偏向：僵化 / 混乱 / 两者并存' }
];
const questions = patternDimensions.flatMap((dimension) => [
  `回想 6～18 岁：${dimension.name}在家里常常让我感到不自在。`,
  `回想 6～18 岁：我需要调整自己来适应与${dimension.name}有关的家庭氛围。`,
  `回想 6～18 岁：这类经验会影响我表达需要、做决定或与人相处。`,
  `回想 6～18 岁：即使没有发生特别严重的事，这种体验也长期存在。`
].map((text) => ({ text, dimension: dimension.name })));
const options = ['非常不符合', '比较不符合', '一般 / 说不清', '比较符合', '非常符合'];
const score = (answers: Array<number | null>) => patternDimensions.map((_, index) => { const values = answers.slice(index * 4, index * 4 + 4).filter((value): value is number => typeof value === 'number'); return values.length ? Math.round(((values.reduce((sum, value) => sum + value, 0) / values.length - 1) / 4) * 100) : 0; });
const level = (value: number) => value >= 70 ? '值得优先探索' : value >= 45 ? '可以继续留意' : '目前较轻';

export function FamilyPatternTest({ assessment, onComplete, loggedIn = true, onSave }: { assessment?: FamilyPatternAssessment; onComplete?: (next: FamilyPatternAssessment) => void; loggedIn?: boolean; onSave?: () => void }) {
  const [mode, setMode] = useState<'intro' | 'test' | 'result'>(assessment ? 'result' : 'intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(assessment?.answers || Array(32).fill(null));
  const result = assessment || (mode === 'result' ? { answers, scores: score(answers), completedAt: new Date().toISOString() } : undefined);
  const current = questions[step];
  const ranked = useMemo(() => result?.scores.map((value, index) => ({ ...patternDimensions[index], score: value })).sort((a, b) => b.score - a.score) || [], [result]);
  function finish() { const next = { answers, scores: score(answers), completedAt: new Date().toISOString() }; onComplete?.(next); setMode('result'); }
  if (mode === 'intro') return <section className="assessment-intro"><span>原生家庭关系模式探索测试</span><h1>用 32 个问题，<br />看见家庭留下的关系线索。</h1><p>请回想大约 6～18 岁、与父母共同生活的大部分时间，并按长期、整体的真实体验作答，而不是只根据某一次特别好的或糟糕的事件。</p><small>完成后可直接查看八维关系模式画像。登录后可以保存结果，并继续探索父母画像、家庭影响链与时空洞察。</small><button className="primary" onClick={() => setMode('test')}>开始测试（约 6–8 分钟）<b>→</b></button></section>;
  if (mode === 'test') return <section className="assessment-flow"><header><span>原生家庭关系模式测试 · {step + 1} / 32</span><button className="text-button" onClick={() => setMode('intro')}>暂时退出</button></header><div className="test-progress"><i style={{ width: `${((step + 1) / 32) * 100}%` }} /></div><p>{current.dimension}</p><h2>{current.text}</h2><div className="answer-list">{options.map((option, index) => <button key={option} className={answers[step] === index + 1 ? 'selected' : ''} onClick={() => setAnswers((old) => old.map((value, itemIndex) => itemIndex === step ? index + 1 : value))}><b>{index + 1}</b>{option}</button>)}<button className={answers[step] === null ? 'selected muted' : 'muted'} onClick={() => setAnswers((old) => old.map((value, itemIndex) => itemIndex === step ? null : value))}>记不清 / 不适用</button></div><div className="test-actions"><button className="text-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>上一题</button>{step === 31 ? <button className="primary" onClick={finish}>查看我的结果 <b>→</b></button> : <button className="primary" onClick={() => setStep((value) => value + 1)}>下一题 <b>→</b></button>}</div></section>;
  return <AssessmentResult assessment={result!} ranked={ranked} loggedIn={loggedIn} onSave={onSave} onRestart={() => { setStep(0); setAnswers(Array(32).fill(null)); setMode('test'); }} />;
}

export function AssessmentResult({ assessment, ranked, loggedIn, onSave, onRestart }: { assessment: FamilyPatternAssessment; ranked?: Array<(typeof patternDimensions)[number] & { score: number }>; loggedIn?: boolean; onSave?: () => void; onRestart?: () => void }) {
  const values = ranked || assessment.scores.map((value, index) => ({ ...patternDimensions[index], score: value })).sort((a, b) => b.score - a.score);
  return <section className="assessment-result"><div className="result-head"><div><span>{loggedIn ? '原生家庭测试完整结果' : '你的基础测试结果'}</span><h1>你的原生家庭<br />关系模式画像</h1><p>分数越接近外圈，代表这类成长体验可能越明显；它不是对你或家庭的好坏判断。</p></div>{onRestart && <button className="text-button" onClick={onRestart}>重新作答</button>}</div><div className="assessment-radar-layout"><Radar scores={assessment.scores} /><div><span>最突出的模式</span>{values.slice(0, 3).map((item) => <article className="top-pattern" key={item.name}><b>{item.name}<em>{item.score}/100</em></b><p>{item.note}</p>{item.subtype && <small>{item.subtype}</small>}</article>)}</div></div><p className="assessment-summary">从目前的作答看，你的成长体验里，{values.slice(0, 2).map((item) => item.name).join('与')}可能是更值得慢慢理解的线索。它们不定义你，也不替你解释全部人生；接下来可以通过真实故事，看看这些体验如何形成与延续。</p><div className="assessment-scores">{assessment.scores.map((value, index) => <article key={patternDimensions[index].name}><b>{patternDimensions[index].name}</b><strong>{value}</strong><i><span style={{ width: `${value}%` }} /></i><small>{level(value)}</small></article>)}</div>{loggedIn ? <div className="result-next"><b>下一步，可以从父母的真实故事里理解这些模式是怎样形成的。</b></div> : <div className="result-gate"><h2>你已经看见了“现象”。</h2><p>保存这份结果，并继续了解：为什么这些模式会形成，以及它们可能如何影响今天的你。</p><button className="primary" onClick={onSave}>保存结果，继续寻根 <b>→</b></button></div>}</section>;
}

export function Radar({ scores }: { scores: number[] }) { const center = 145; const radius = 94; const point = (index: number, value: number) => { const angle = -Math.PI / 2 + index * Math.PI / 4; return `${center + Math.cos(angle) * radius * value},${center + Math.sin(angle) * radius * value}`; }; const polygon = (value: number) => scores.map((_, index) => point(index, value)).join(' '); const values = scores.map((value, index) => point(index, value / 100)).join(' '); return <div className="radar radar-eight"><svg viewBox="0 0 290 290" role="img" aria-label="八维原生家庭关系模式雷达图">{[.25, .5, .75, 1].map((value) => <polygon key={value} points={polygon(value)} className="radar-grid" />)}{scores.map((_, index) => { const [x, y] = point(index, 1).split(','); return <line key={index} x1={center} y1={center} x2={x} y2={y} className="radar-axis" />; })}<polygon points={values} className="radar-shape" />{scores.map((value, index) => { const [x, y] = point(index, value / 100).split(','); return <circle key={index} cx={x} cy={y} r="3.8" className="radar-point" />; })}</svg>{patternDimensions.map((dimension, index) => { const [x, y] = point(index, 1.26).split(','); return <span key={dimension.name} style={{ left: `${Number(x) / 2.9}%`, top: `${Number(y) / 2.9}%` }}>{dimension.name}<b>{scores[index]}</b></span>; })}</div>; }
