import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { FamilyPatternAssessment, JourneyData } from '../types';

const dimensions = [
  { name: '边界纠缠', note: '家庭成员之间是否难以区分关心、责任与个人边界。', questions: ['我常觉得需要优先满足家人的情绪或期待。', '当我为自己做决定时，常担心会让家人失望。'] },
  { name: '情感忽视', note: '感受是否曾被认真看见、回应与安放。', questions: ['我小时候的难过或害怕，常常没有被认真回应。', '我不太习惯向家人表达自己的真实感受。'] },
  { name: '过度负责', note: '是否很早学会照顾他人或承担超出年龄的责任。', questions: ['我常觉得自己要负责让家庭气氛变好。', '即使很累，我也很难拒绝家人对我的期待。'] },
  { name: '条件式认可', note: '被肯定是否常与表现、成绩或听话绑定。', questions: ['我感觉被认可时，往往是因为我做得足够好。', '犯错时，我会担心自己不再值得被喜欢。'] },
  { name: '焦虑与控制', note: '家庭中是否常以担心为名，替彼此安排或干预。', questions: ['家人常会很担心我的选择，并希望替我决定。', '我面对不确定时，容易通过控制细节来获得安全感。'] },
  { name: '冲突不安全', note: '冲突能否被表达、讨论与修复。', questions: ['家里发生冲突时，常以沉默、回避或爆发收场。', '我会为了避免冲突，而压下自己真正的想法。'] }
];
const options = ['很少或没有', '偶尔', '有时', '经常', '几乎总是'];

function scoreAnswers(answers: number[]) { return dimensions.map((_, index) => { const pair = answers.slice(index * 2, index * 2 + 2); return Math.round(((pair[0] + pair[1]) / 2 - 1) * 25); }); }
function level(score: number) { return score >= 70 ? '值得优先探索' : score >= 45 ? '可以继续留意' : '目前较轻'; }

export function FamilyPatternTest({ data }: { data: JourneyData }) {
  const saved = data.familyAssessment;
  const [mode, setMode] = useState<'intro' | 'test' | 'summary' | 'result'>(saved ? 'summary' : 'intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(saved?.answers || Array(12).fill(0));
  const [result, setResult] = useState<FamilyPatternAssessment | undefined>(saved);
  const question = useMemo(() => dimensions.flatMap((dimension) => dimension.questions.map((text) => ({ text, dimension: dimension.name }))), []);
  const scores = result?.scores || [];
  const current = question[step];
  async function finish() { const next = { answers, scores: scoreAnswers(answers), completedAt: new Date().toISOString() }; setResult(next); setMode('summary'); await api.save({ ...data, familyAssessment: next }); }
  function restart() { setAnswers(Array(12).fill(0)); setStep(0); setMode('test'); }
  if (mode === 'intro') return <section className="pattern-test pattern-intro"><div><span>原生家庭关系模式</span><h2>用 12 个问题，<br/>看见关系留下的线索。</h2><p>围绕边界、情感回应、责任、认可、控制与冲突，帮你整理成长中可能形成的关系经验。</p><small>这不是心理诊断。请按你自己的经验作答。</small></div><button className="primary" onClick={() => setMode('test')}>开始探索 <b>→</b></button></section>;
  if (mode === 'test') return <section className="pattern-test test-flow"><header><span>原生家庭关系模式 · {step + 1} / 12</span><button className="text-button" onClick={() => setMode(result ? 'summary' : 'intro')}>暂时退出</button></header><div className="test-progress"><i style={{ width: `${((step + 1) / 12) * 100}%` }}/></div><p className="test-dimension">{current.dimension}</p><h2>{current.text}</h2><div className="answer-list">{options.map((label, index) => <button className={answers[step] === index + 1 ? 'selected' : ''} key={label} onClick={() => setAnswers((old) => old.map((answer, i) => i === step ? index + 1 : answer))}><b>{index + 1}</b>{label}</button>)}</div><div className="test-actions"><button className="text-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>上一题</button>{step === 11 ? <button className="primary" disabled={!answers.every(Boolean)} onClick={() => void finish()}>查看模式图谱 <b>→</b></button> : <button className="primary" disabled={!answers[step]} onClick={() => setStep((value) => value + 1)}>下一题 <b>→</b></button>}</div></section>;
  const ranked = scores.map((score, index) => ({ score, ...dimensions[index] })).sort((a, b) => b.score - a.score);
  if (mode === 'summary') return <section className="pattern-test pattern-summary"><div><span>原生家庭关系模式</span><h2>你的关系模式缩略图</h2><p>当前最值得留意：{ranked[0]?.name || '继续完成探索'}。</p><button className="text-button" onClick={() => setMode('result')}>查看详细结果　›</button></div><div className="mini-radar"><Radar scores={scores}/></div></section>;
  return <section className="pattern-test pattern-result"><div className="result-head"><div><span>你的关系模式雷达图</span><h2>原生家庭关系模式</h2><p>分数越接近外圈，表示这类经验在你的成长中可能越明显；它不是对你或家庭的好坏判断。</p></div><button className="text-button" onClick={restart}>重新作答</button></div><div className="radar-layout"><Radar scores={scores}/><div className="priority"><span>优先留意的线索</span>{ranked.slice(0, 2).map((item) => <article key={item.name}><b>{item.name}<em>{item.score}/100</em></b><p>{item.note}</p></article>)}</div></div><div className="score-grid">{scores.map((score, index) => <article key={dimensions[index].name}><div><b>{dimensions[index].name}</b><strong>{score}</strong></div><i><span style={{ width: `${score}%` }}/></i><small>{level(score)}</small><p>{dimensions[index].note}</p></article>)}</div><p className="test-disclaimer">这份结果用于自我探索。你可以把最想继续理解的一项，带到生命档案或 1v1 对话中。</p></section>;
}

function Radar({ scores }: { scores: number[] }) {
  const center = 138; const radius = 94; const point = (index: number, value: number) => { const angle = -Math.PI / 2 + index * Math.PI / 3; return `${center + Math.cos(angle) * radius * value},${center + Math.sin(angle) * radius * value}`; };
  const polygon = (value: number) => scores.map((_, index) => point(index, value)).join(' ');
  const values = scores.map((score, index) => point(index, score / 100)).join(' ');
  return <div className="radar"><svg viewBox="0 0 276 276" role="img" aria-label="六维关系模式雷达图">{[.25, .5, .75, 1].map((value) => <polygon key={value} points={polygon(value)} className="radar-grid"/>)}{scores.map((_, index) => { const [x, y] = point(index, 1).split(','); return <line key={index} x1={center} y1={center} x2={x} y2={y} className="radar-axis"/>; })}<polygon points={values} className="radar-shape"/>{scores.map((score, index) => { const [x, y] = point(index, score / 100).split(','); return <circle key={index} cx={x} cy={y} r="3.8" className="radar-point"/>; })}</svg>{dimensions.map((dimension, index) => { const [x, y] = point(index, 1.23).split(','); return <span key={dimension.name} style={{ left: `${Number(x) / 2.76}%`, top: `${Number(y) / 2.76}%` }}>{dimension.name}<b>{scores[index]}</b></span>; })}</div>;
}
