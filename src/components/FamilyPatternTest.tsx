import { useMemo, useState } from 'react';
import type { FamilyPatternAssessment } from '../types';

export const patternDimensions = [
  { name: '亲密距离', note: '家人之间是过度卷入，还是彼此疏远、难以靠近。', explanation: '你过去的家里，亲近和独处之间可能不太容易找到舒服的距离。', subtype: '可能呈现：偏黏、偏疏，或两种情况都有' },
  { name: '个人边界', note: '我能否有自己的想法、选择、隐私和不同。', explanation: '父母可能比较容易参与甚至替你决定很多事情；按自己的方式生活时，也许会担心让他们失望。' },
  { name: '情绪回应', note: '难过、害怕和委屈时，我的感受有没有被看见。', explanation: '你难过、委屈或害怕时，家里可能更习惯让你坚强、讲道理，停下来理解感受的时候相对少一些。' },
  { name: '沟通方式', note: '家里的人能不能把真实想法直接说出来。', explanation: '家里有些情绪和重要的事可能不容易被直接说开，你也许曾习惯先观察气氛再表达。' },
  { name: '冲突安全', note: '家里发生矛盾时，我会不会紧张、害怕或被卷入。', explanation: '面对家里的冲突，你可能需要时刻留意气氛，并用安静、躲开或调和来保护自己。' },
  { name: '认可方式', note: '是否只有表现好、懂事或成功，才更容易被认可。', explanation: '被肯定可能常和表现、听话或不让人失望联系在一起；这不代表你不够好，只是一种曾经熟悉的关系经验。' },
  { name: '责任角色', note: '我是否很早就开始懂事、替大人操心。', explanation: '你可能比较早学会了少添麻烦、照顾他人或压下自己的需要，久而久之很会照顾别人，却不一定习惯先照顾自己。' },
  { name: '家庭秩序', note: '家里的规矩是太死，还是太乱。', explanation: '家里的规则可能不太容易商量，或常常变化、缺少清晰分工，让你需要不断猜测该怎么做。', subtype: '可能呈现：偏严格、偏混乱，或两种情况都有' }
];

const questionGroups = [
  ['家里的人会管彼此很多事情，让人很难真正有自己的空间。', '当我想自己做决定、安排自己的生活时，家里人容易觉得我跟他们生分了。', '我遇到难过或者很重要的事情时，家里人很少真正坐下来关心我发生了什么。', '即使一家人住在一起，我们很多时候也像各过各的，很少真正聊心里的事情。'],
  ['很多本来应该由我自己决定的事情，父母会直接替我做主。', '如果我没有按照父母的想法来，容易被说“不懂事”“不听话”或者“让人失望”。', '父母比较容易过问我的隐私、朋友、恋爱、工作或者花钱方式。', '即使父母不同意，我通常也可以表达自己的想法，并做适合自己的选择。'],
  ['我难过的时候，家里有人愿意先听我把话说完，而不是马上教育我。', '我哭、生气或者害怕时，经常听到“别想太多”“这有什么”“有什么好哭的”之类的话。', '当我说自己很委屈、很难受时，容易被认为是矫情、脆弱或者不懂事。', '我的感受在家里通常会被认真对待。'],
  ['家里有事情通常可以直接说出来，不需要一直猜别人脸色。', '家里有人不高兴时，经常不会直接说，而是冷着、憋着、阴阳怪气，或者等别人自己猜。', '我过去经常要先看看大人的脸色，再决定自己能不能说话、应该说什么。', '家里很多重要的事情很难真正说开，最后常常变成沉默、误会或者不了了之。'],
  ['家里一吵架，我会担心事情越来越严重，甚至失控。', '父母或者家里人发生矛盾时，我经常被拉去劝架、传话、站队或者安慰其中一个人。', '家里发生争执以后，通常能够把事情说开，不会长时间冷战或者反复翻旧账。', '只要感觉家里气氛不对，我就会下意识紧张、安静下来或者躲开。'],
  ['我表现好、成绩好、听话或者让父母有面子的时候，更容易得到肯定。', '如果我失败、犯错或者没有达到父母期待，我会明显感觉自己让他们失望了。', '家里经常拿我和别人家的孩子、兄弟姐妹或者同龄人比较。', '即使我表现普通、失败或者没有达到期待，我依然能够感受到家里对我的接纳。'],
  ['我过去经常觉得自己不能给家里添麻烦，要懂事一点。', '父母情绪不好时，我会想办法安慰他们、顺着他们，或者让家里的气氛赶快好起来。', '我很早就开始操心很多本来应该由大人处理的事情。', '我过去大多数时候可以安心做一个孩子，不需要经常操心大人的情绪和问题。'],
  ['家里的很多规矩比较死，经常是“大人说了算”，很难商量。', '家里遇到新的情况时比较难调整，经常觉得“以前就是这样”“就应该这样”。', '家里的规则有时候变化很大，今天可以、明天又不可以，让我很难知道到底应该怎么做。', '家里一遇到事情，经常没人说得清到底谁负责、接下来怎么办，很容易变得乱成一团。']
];
const reverseQuestions = new Set([7, 8, 11, 12, 18, 23, 27]);
const questions = questionGroups.flatMap((items, dimensionIndex) => items.map((text, index) => ({ text, dimension: patternDimensions[dimensionIndex].name, reverse: reverseQuestions.has(dimensionIndex * 4 + index) })));
const options = ['几乎没有', '偶尔会这样', '有时候会这样', '经常这样', '大多数时候都这样'];
const score = (answers: Array<number | null>) => patternDimensions.map((_, index) => {
  const values = answers.slice(index * 4, index * 4 + 4).map((value, offset) => value === null ? null : (reverseQuestions.has(index * 4 + offset) ? 6 - value : value)).filter((value): value is number => typeof value === 'number');
  return values.length ? Math.round(((values.reduce((sum, value) => sum + value, 0) / values.length - 1) / 4) * 100) : 0;
});
const level = (value: number) => value >= 70 ? '值得优先探索' : value >= 45 ? '可以继续留意' : '目前较轻';

const openPrompts = [
  ['常说的话', '回想一下，从小到大，父亲或母亲有哪些话是你听过很多遍、到现在都记得的？想到什么就写什么。'],
  ['矛盾点', '你觉得父亲或母亲身上，有没有一些让你觉得很矛盾的地方？'],
  ['塑造经历', '你知道父亲或母亲过去经历过哪些事，可能对他们影响很深吗？'],
  ['未完成的人生', 'TA 有没有什么很想做、却一直没做到的事？或者有什么遗憾、愿望，是你从小听 TA 提过很多次的？'],
  ['对我的期待', '如果用一句话概括，你觉得父亲和母亲最希望你成为一个怎样的人？']
] as const;

export function FamilyPatternTest({ assessment, startAtTest = false, onComplete, onContinueParents }: { assessment?: FamilyPatternAssessment; startAtTest?: boolean; onComplete?: (next: FamilyPatternAssessment) => void; onContinueParents?: () => void }) {
  const [mode, setMode] = useState<'intro' | 'test' | 'open' | 'result'>(assessment ? 'result' : startAtTest ? 'test' : 'intro');
  const [step, setStep] = useState(0); const [completed, setCompleted] = useState<FamilyPatternAssessment | undefined>();
  const [answers, setAnswers] = useState<Array<number | null>>(assessment?.answers || Array(32).fill(null));
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>(assessment?.openAnswers || {});
  const result = completed || assessment || (mode === 'result' ? { answers, scores: score(answers), completedAt: new Date().toISOString() } : undefined);
  const current = questions[step];
  const ranked = useMemo(() => result?.scores.map((value, index) => ({ ...patternDimensions[index], score: value })).sort((a, b) => b.score - a.score) || [], [result]);
  function finish() { setMode('open'); }
  function finishOpen() { const next = { answers, scores: score(answers), completedAt: new Date().toISOString(), openAnswers }; setCompleted(next); onComplete?.(next); setMode('result'); }
  if (mode === 'intro') return <section className="assessment-intro"><span>原生家庭关系模式探索测试</span><h1>用 32 个日常问题，<br />看见家庭关系留下的线索。</h1><p>请根据过去和父母，或主要照顾你的人长期相处的真实经历作答。不要只想某一件特别好或糟的事；如果不同阶段差别很大，可以按持续更久、影响更深的经历回答。</p><small>若主要由祖辈或其他亲人照顾，可把题目中的“父母 / 家里人”理解成当时主要照顾和影响你的人。本测试用于自我探索和理解，不是医学、心理疾病诊断或临床量表。</small><button className="primary" onClick={() => setMode('test')}>开始测试（约 6–8 分钟）<b>→</b></button></section>;
  if (mode === 'test') return <section className="assessment-flow"><header><span>原生家庭关系模式探索测试 · {step + 1} / 32</span><button className="text-button" onClick={() => setMode(result ? 'result' : 'intro')}>暂时退出</button></header><div className="test-progress"><i style={{ width: `${((step + 1) / 32) * 100}%` }} /></div><p>{current.dimension}</p><h2>{current.text}</h2><div className="answer-list">{options.map((option, index) => <button key={option} className={answers[step] === index + 1 ? 'selected' : ''} onClick={() => setAnswers((old) => old.map((value, itemIndex) => itemIndex === step ? index + 1 : value))}><b>{index + 1}</b>{option}</button>)}<button className={answers[step] === null ? 'selected muted' : 'muted'} onClick={() => setAnswers((old) => old.map((value, itemIndex) => itemIndex === step ? null : value))}>记不清 / 不适用</button></div><div className="test-actions"><button className="text-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>上一题</button>{step === 31 ? <button className="primary" onClick={finish}>继续补充线索 <b>→</b></button> : <button className="primary" onClick={() => setStep((value) => value + 1)}>下一题 <b>→</b></button>}</div></section>;
  if (mode === 'open') return <section className="assessment-open"><span>可跳过的开放线索</span><h1>再写下几段<br />你记得的故事。</h1><p>这些内容不参与计分，会成为后续理解父亲与母亲的第一批真实材料。想到多少写多少，也可以直接跳过。</p>{openPrompts.map(([key, prompt]) => <label key={key}><b>{key}</b><span>{prompt}</span><textarea value={openAnswers[key] || ''} onChange={(event) => setOpenAnswers((current) => ({ ...current, [key]: event.target.value }))} placeholder="想到什么就写什么…" /></label>)}<div className="test-actions"><button className="text-button" onClick={() => setMode('test')}>返回修改</button><button className="primary" onClick={finishOpen}>查看我的结果 <b>→</b></button></div></section>;
  return <AssessmentResult assessment={result!} ranked={ranked} onContinueParents={onContinueParents} onRestart={() => { setStep(0); setAnswers(Array(32).fill(null)); setOpenAnswers({}); setCompleted(undefined); setMode('test'); }} />;
}

export function AssessmentResult({ assessment, ranked, onContinueParents, onRestart }: { assessment: FamilyPatternAssessment; ranked?: Array<(typeof patternDimensions)[number] & { score: number }>; onContinueParents?: () => void; onRestart?: () => void }) {
  const values = ranked || assessment.scores.map((value, index) => ({ ...patternDimensions[index], score: value })).sort((a, b) => b.score - a.score);
  const top = values.slice(0, 3);
  return <section className="assessment-result"><div className="result-head"><div><span>原生家庭关系模式探索测试</span><h1>原生家庭关系模式</h1><p>分数越接近外圈，代表这类成长体验可能越明显；它不是对你或家庭的好坏判断。</p></div>{onRestart && <button className="text-button" onClick={onRestart}>重新测试</button>}</div><div className="assessment-radar-layout"><Radar scores={assessment.scores} /><div><span>最值得留意的线索</span>{top.map((item) => <article className="top-pattern" key={item.name}><b>{item.name}<em>{item.score}/100</em></b><p>{item.explanation}</p>{item.subtype && <small>{item.subtype}</small>}</article>)}</div></div><p className="assessment-summary">从目前的作答看，{top.slice(0, 2).map((item) => item.name).join('与')}可能是更值得慢慢理解的线索。它们不定义你，也不替你解释全部人生；接下来可以通过真实故事，看看这些体验如何形成与延续。</p><div className="assessment-scores">{assessment.scores.map((value, index) => <article key={patternDimensions[index].name}><b>{patternDimensions[index].name}</b><strong>{value}</strong><i><span style={{ width: `${value}%` }} /></i><small>{patternDimensions[index].explanation}</small></article>)}</div>{onContinueParents && <div className="result-gate"><h2>你已经看见了一些现象。</h2><p>接下来，可以从父亲和母亲的真实故事里，慢慢理解这些模式怎样形成。</p><button className="primary" onClick={onContinueParents}>继续了解我的父母 <b>→</b></button></div>}</section>;
}

export function Radar({ scores }: { scores: number[] }) { const center = 145; const radius = 94; const point = (index: number, value: number) => { const angle = -Math.PI / 2 + index * Math.PI / 4; return `${center + Math.cos(angle) * radius * value},${center + Math.sin(angle) * radius * value}`; }; const polygon = (value: number) => scores.map((_, index) => point(index, value)).join(' '); const values = scores.map((value, index) => point(index, value / 100)).join(' '); return <div className="radar radar-eight"><svg viewBox="0 0 290 290" role="img" aria-label="八维原生家庭关系模式雷达图">{[.25, .5, .75, 1].map((value) => <polygon key={value} points={polygon(value)} className="radar-grid" />)}{scores.map((_, index) => { const [x, y] = point(index, 1).split(','); return <line key={index} x1={center} y1={center} x2={x} y2={y} className="radar-axis" />; })}<polygon points={values} className="radar-shape" />{scores.map((value, index) => { const [x, y] = point(index, value / 100).split(','); return <circle key={index} cx={x} cy={y} r="3.8" className="radar-point" />; })}</svg>{patternDimensions.map((dimension, index) => { const [x, y] = point(index, 1.26).split(','); return <span key={dimension.name} style={{ left: `${Number(x) / 2.9}%`, top: `${Number(y) / 2.9}%` }}>{dimension.name}<b>{scores[index]}</b></span>; })}</div>; }
