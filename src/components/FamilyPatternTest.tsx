import { useEffect, useState } from 'react';
import type { FamilyPatternAssessment } from '../types';

export const patternDimensions = [
  { name: '自我认知', module: '主体性', note: '分辨自己的需要，建立内在参照。', explanation: '你正在练习把外界期待和内心真实的声音分开。' },
  { name: '自主边界', module: '主体性', note: '为自己做选择，也能表达界限。', explanation: '在关系中照顾自己、表达“不”，仍需要更多练习。' },
  { name: '情绪觉察', module: '情感力', note: '看见感受，也听见身体的信号。', explanation: '你对情绪已有感受力，可以继续练习更早地回应自己。' },
  { name: '情感独立', module: '情感力', note: '在连接里保持自己的节奏。', explanation: '重要关系的靠近或疏远，可能仍会明显影响你的内在稳定。' },
  { name: '倾听理解', module: '关系力', note: '先理解，再决定是否认同。', explanation: '你具备看见不同立场的能力，这是关系中的重要资源。' },
  { name: '柔和表达', module: '关系力', note: '表达感受、需要，并修复冲突。', explanation: '冲突来临时，给自己一点停顿和表达空间会很有帮助。' },
  { name: '自我价值感', module: '价值力', note: '不只用表现衡量自己的价值。', explanation: '你正在把自我价值慢慢从外部评价中拿回来。' },
  { name: '价值实现力', module: '价值力', note: '识别能力，并让价值进入行动。', explanation: '你拥有的能力值得被看见，也值得开始进入现实行动。' }
] as const;

const modules = [
  { title: '认识自己', range: [0, 5], transition: '你正在慢慢看见那个真实的自己。' },
  { title: '感受自己', range: [6, 11], transition: '接下来，看看你如何面对自己的情绪与关系。' },
  { title: '连接他人', range: [12, 17], transition: '再看看，你如何与另一个人真正相遇。' },
  { title: '活出价值', range: [18, 23], transition: '最后，我们回到你成长的那个家。' },
  { title: '回望来处', range: [24, 28], transition: '' }
];

const questions = [
  ['面对重要选择时，我通常能分辨：这是我真正想要的，还是别人希望我这样做。', 0, false], ['我比较清楚哪些事情会让我真正有活力，哪些事情其实并不适合我。', 0, false], ['当没有人给我建议或参照时，我常常不知道自己究竟想要什么。', 0, true],
  ['即使重要的人不认同，我也能够认真听取意见后，做出属于自己的选择。', 1, false], ['当别人提出让我不舒服或超出我能力范围的要求时，我能够表达“不”。', 1, false], ['为了不让别人失望、生气或觉得我不好，我常会勉强自己答应原本不想答应的事情。', 1, true],
  ['当自己的情绪开始变化时，我通常能够比较快觉察到。', 2, false], ['我能够分辨自己当下更多是委屈、愤怒、害怕、羞耻、失落，还是其他感受。', 2, false], ['我经常直到失眠、身体不舒服、突然爆发或彻底没劲了，才发现自己其实已经压抑了很久。', 2, true],
  ['当重要的人暂时冷淡、没有及时回应我时，我虽然会难受，但还能基本保持自己的生活节奏。', 3, false], ['我能够表达自己的情感和需要，同时接受对方并不一定能满足我的所有期待。', 3, false], ['一旦重要关系出现距离，我很容易反复确认、讨好、控制，或者干脆彻底退开。', 3, true],
  ['别人表达与我不同的观点时，我通常能够先听明白他的意思，再决定是否认同。', 4, false], ['发生冲突时，我会试着理解：对方为什么会这样想、这样反应。', 4, false], ['当别人说到我不认同的地方时，我很容易一边听，一边已经在脑子里准备怎么反驳。', 4, true],
  ['当我被冒犯或激怒时，大多数情况下我能让自己稍微停一下，而不是立刻反击。', 5, false], ['我能够比较直接地表达自己的感受、需求和不同意见，而不是靠讽刺、指责、冷淡或暗示让别人猜。', 5, false], ['一旦发生较大的冲突，我更容易冷战、回避、翻旧账，或者等对方先低头。', 5, true],
  ['即使最近没有特别好的成绩、收入或成果，我仍然觉得自己本身是有价值的。', 6, false], ['当别人不认可我时，我可以反思自己，但不会因此彻底否定自己。', 6, false], ['我很容易用收入、成绩、身份、别人是否喜欢我，来判断自己到底够不够好。', 6, true],
  ['我大致知道自己有哪些能力、经验或特质，是能够真正为别人创造价值的。', 7, false], ['面对真正重要的事情，我通常能够从思考进入行动，而不是一直等到“准备得更好”。', 7, false], ['即使我知道自己有一些能力，我也经常因为觉得“还不够好”，而迟迟不敢真正展示、争取机会或获得回报。', 7, true],
] as const;
const climateQuestions = [
  ['高期待', '成长过程中，我经常感觉家人对我的成绩、表现、懂事、出息或做人方式有比较高的期待。'],
  ['情感压抑', '在我的家庭里，难过、害怕、委屈、脆弱等感受，通常不太会被充分表达和讨论。'],
  ['控制干预', '在学习、交友、生活习惯或重要选择上，家人通常会比较深入地介入我的决定。'],
  ['批评指责', '当我犯错或表现不好时，家人更容易先指出我的问题，而不是先理解我当时发生了什么。'],
  ['温暖支持', '无论我表现得好不好，我都曾经真实感受到：家里至少有一个人关心我、保护我，愿意在我困难时支持我。']
] as const;
const options = ['完全不像我', '比较不像我', '有时如此', '比较像我', '非常像我'];
const score = (answers: Array<number | null>) => patternDimensions.map((_, dimension) => {
  const values = answers.slice(dimension * 3, dimension * 3 + 3).map((value, index) => value === null ? null : questions[dimension * 3 + index][2] ? 6 - value : value).filter((value): value is number => value !== null);
  return values.length ? Math.round(((values.reduce((sum, value) => sum + value, 0) / values.length - 1) / 4) * 100) : 0;
});
const climateLevel = (value: number, warm = false) => warm ? (value >= 4 ? '较明显' : value >= 3 ? '有一些' : '较少') : (value >= 4 ? '明显' : value >= 3 ? '中等' : '较少');
const moduleScores = (scores: number[]) => [0, 1, 2, 3].map((index) => Math.round((scores[index * 2] + scores[index * 2 + 1]) / 2));

export function FamilyPatternTest({ assessment, startAtTest = false, onComplete, onExit }: { assessment?: FamilyPatternAssessment; startAtTest?: boolean; onComplete?: (next: FamilyPatternAssessment) => void | Promise<void>; onContinueParents?: () => void; onExit?: () => void }) {
  const [mode, setMode] = useState<'intro' | 'test'>(startAtTest ? 'test' : 'intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(assessment?.answers?.length === 29 ? assessment.answers : Array(29).fill(null));
  const [finishing, setFinishing] = useState(false);
  const question = step < 24 ? questions[step] : climateQuestions[step - 24];
  const questionText = step < 24 ? question[0] : question[1];
  const group = modules.find((item) => step >= item.range[0] && step <= item.range[1])!;
  useEffect(() => { window.scrollTo(0, 0); }, [mode, step]);
  async function complete() { if (finishing) return; setFinishing(true); const next = { answers, scores: score(answers), familyClimate: answers.slice(24), completedAt: new Date().toISOString() }; try { await onComplete?.(next); } finally { setFinishing(false); } }
  if (mode === 'intro') return <section className="assessment-intro life-assessment-intro"><span>觉塑 · 生命成长地图测评</span><h1>用 29 个问题，看见你此刻的生命力量。</h1><p>先看见自己如何生活、感受、连接与创造，最后再轻轻回望那个家。</p><small>请按真实、惯常的状态作答，没有标准答案。本测试用于自我探索，不是医学或心理诊断。</small><button className="primary" onClick={() => setMode('test')}>开始探索 <b>→</b></button></section>;
  return <section className="assessment-flow life-assessment-flow"><header><div><span>{group.title}</span><b>{step + 1} / 29</b></div>{startAtTest && <button className="text-button" onClick={onExit}>暂时退出</button>}</header>{group.transition && step === group.range[1] && <p className="section-transition">{group.transition}</p>}<div className="test-progress"><i style={{ width: `${((step + 1) / 29) * 100}%` }} /></div>{step === 24 && <div className="family-switch"><span>回到你长大的那个家</span><p>这不是评价父母好坏，只是回忆那个家庭整体给你的感受。</p></div>}<p className="question-domain">{step < 24 ? patternDimensions[question[1] as number].name : '家庭氛围'}</p><h2>{questionText}</h2><div className="answer-list">{options.map((option, index) => <button key={option} className={answers[step] === index + 1 ? 'selected' : ''} onClick={() => setAnswers((old) => old.map((value, itemIndex) => itemIndex === step ? index + 1 : value))}><b>{index + 1}</b>{option}</button>)}</div><div className="test-actions"><button className="text-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>上一题</button>{step === 28 ? <button className="primary" disabled={finishing || answers.some((value) => value === null)} onClick={() => void complete()}>{finishing ? '正在生成生命地图…' : '查看生命地图'} <b>→</b></button> : <button className="primary" disabled={answers[step] === null} onClick={() => setStep((value) => value + 1)}>下一题 <b>→</b></button>}</div></section>;
}

export function AssessmentResult({ assessment, onRestart }: { assessment: FamilyPatternAssessment; onRestart?: () => void }) {
  const scores = assessment.scores.length === 8 ? assessment.scores : Array(8).fill(0);
  const totals = moduleScores(scores); const climate = assessment.familyClimate || assessment.answers.slice(24, 29);
  const modulesWithCopy = [['主体性', '自我的诞生'], ['情感力', '情绪情感成长'], ['关系力', '止观与沟通'], ['价值力', '自我价值实现']];
  const lowest = scores.map((value, index) => ({ ...patternDimensions[index], value })).sort((a, b) => a.value - b.value).slice(0, 3);
  return <section className="life-map"><div className="life-map-head"><div><span>觉塑 · 生命成长地图</span><h1>我的生命成长地图</h1><p>一份基于当下自我认知与成长状态的温和指引</p></div>{onRestart && <button className="text-button" onClick={onRestart}>重新测试</button>}</div><section className="life-summary"><h2>我的四大生命能力总览</h2><div className="life-module-grid">{modulesWithCopy.map(([name, sub], index) => <article key={name} className={`life-module module-${index}`}><span>{sub}</span><h3>{name}</h3><div className="score-orbit"><strong>{totals[index]}</strong><small>/100</small></div><p>{totals[index] >= 70 ? '你的优势领域' : totals[index] >= 50 ? '有提升空间' : '需要重点关注'}</p></article>)}</div></section><div className="life-map-grid"><section className="life-radar-card"><h2>核心能力雷达图 <small>8维</small></h2><Radar scores={scores} /></section><section className="life-findings"><h2>关键发现</h2>{lowest.map((item) => <article key={item.name}><b>{item.name}<em>{item.value}</em></b><p>{item.explanation}</p></article>)}</section></div><div className="life-map-grid lower family-only"><section className="family-climate"><h2>家庭氛围关键词</h2><p>这是你成长感受到的主要体验，不代表对任何人的评价。</p>{climateQuestions.map(([name], index) => <div key={name}><span>{name}</span><b>{climateLevel(climate[index] || 3, index === 4)}</b></div>)}</section></div></section>;
}

export function Radar({ scores }: { scores: number[] }) { const center = 145; const radius = 91; const point = (index: number, value: number) => { const angle = -Math.PI / 2 + index * Math.PI / 4; return `${center + Math.cos(angle) * radius * value},${center + Math.sin(angle) * radius * value}`; }; const polygon = (value: number) => scores.map((_, index) => point(index, value)).join(' '); const values = scores.map((value, index) => point(index, value / 100)).join(' '); return <div className="radar radar-eight"><svg viewBox="0 0 290 290" role="img" aria-label="八维核心能力雷达图">{[.25, .5, .75, 1].map((value) => <polygon key={value} points={polygon(value)} className="radar-grid" />)}{scores.map((_, index) => { const [x, y] = point(index, 1).split(','); return <line key={index} x1={center} y1={center} x2={x} y2={y} className="radar-axis" />; })}<polygon points={values} className="radar-shape" />{scores.map((value, index) => { const [x, y] = point(index, value / 100).split(','); return <circle key={index} cx={x} cy={y} r="3.8" className="radar-point" />; })}</svg>{patternDimensions.map((dimension, index) => { const [x, y] = point(index, 1.27).split(','); return <span key={dimension.name} style={{ left: `${Number(x) / 2.9}%`, top: `${Number(y) / 2.9}%` }}>{dimension.name}<b>{scores[index]}</b></span>; })}</div>; }
