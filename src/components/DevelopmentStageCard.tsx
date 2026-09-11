import { useState } from 'react';
import './DevelopmentStageCard.css';
import type { FamilyPatternAssessment, JourneyData } from '../types';
import { answerOptions, developmentQuestions, generateDevelopmentStage, hasDevelopmentAnswers } from '../lib/developmentStage';

export function DevelopmentStageCard({ data, persist }: { data: JourneyData; persist: (next: JourneyData) => Promise<void> }) {
  const assessment = data.familyAssessment!;
  const insight = assessment.developmentStage;
  const [answering, setAnswering] = useState(false);
  const [answers, setAnswers] = useState<Array<number | null>>(Array(4).fill(null));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function generate(supplement = false) {
    if (busy || (supplement && !hasDevelopmentAnswers(answers))) return;
    setBusy(true); setError('');
    const nextAssessment: FamilyPatternAssessment = supplement ? { ...assessment, developmentAnswers: answers, testVersion: (assessment.testVersion || 1) + 1 } : assessment;
    try {
      const developmentStage = generateDevelopmentStage(nextAssessment, data);
      await persist({ ...data, familyAssessment: { ...nextAssessment, developmentStage } });
      setAnswering(false);
    } catch { setError('解读暂未保存成功，你的作答仍在，请重试。'); }
    finally { setBusy(false); }
  }
  const confidenceLabels = { low: '探索方向 · 待更多线索核对', medium: '有一定作答依据', high: '多条线索较一致' };
  return <section className="development-card" aria-labelledby="development-title" aria-busy={busy}>
    <header><div><span className="eyebrow">理解当下，也看见发展的可能</span><h2 id="development-title">发展心理学阶段解读</h2></div>{insight && <span className="development-confidence">{confidenceLabels[insight.confidence]}</span>}</header>
    {!insight && !answering && <div className="development-empty"><p>从已有的生命地图出发，再看看你当前较突出的发展课题。</p>{!hasDevelopmentAnswers(assessment.developmentAnswers) ? <button className="secondary" onClick={() => setAnswering(true)}>补 4 个小问题生成阶段解读 <span>→</span></button> : <button className="secondary" disabled={busy} onClick={() => void generate()}>{busy ? '正在生成…' : '生成阶段解读'}</button>}</div>}
    {answering && <div className="development-supplement">
      <div className="development-supplement-head"><span>{step + 1} / 4</span><button className="text-button" disabled={busy} onClick={() => setAnswering(false)}>暂时不填</button></div>
      <h3>{developmentQuestions[step].text}</h3>
      <div className="development-options">{answerOptions.map((label, index) => <button key={label} disabled={busy} aria-pressed={answers[step] === index + 1} onClick={() => { setAnswers((current) => current.map((value, i) => i === step ? index + 1 : value)); if (step < 3) setStep(step + 1); }}>{label}</button>)}</div>
      <div className="development-supplement-actions"><button className="text-button" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>上一题</button>{step === 3 && <button className="primary" disabled={busy || !hasDevelopmentAnswers(answers)} onClick={() => void generate(true)}>{busy ? '正在生成…' : '生成阶段解读'} <b>→</b></button>}</div>
    </div>}
    {insight && <>
      {(insight.stale || insight.sourceVersion.parentProfileVersion !== (data.parentProfileVersion || 0)) && <div className="development-refresh" role="status"><p>家庭材料有更新，可刷新发展阶段解读</p><button className="secondary" disabled={busy} onClick={() => void generate()}>{busy ? '正在刷新…' : '刷新这张解读'}</button></div>}
      <div className="development-primary"><h3>当前主要发展课题</h3><p>{insight.primaryTaskName}</p>{insight.secondaryTaskName && <small>同时伴随：{insight.secondaryTaskName}</small>}</div>
      <div className="development-theory"><h3>理论参考</h3><p>{insight.theory}</p><span>{insight.theoryStage}</span></div>
      <section><h3>这一阶段在发展什么</h3><p className="development-question">{insight.coreQuestion}</p></section>
      <section><h3>这一阶段的典型表现</h3><p>{insight.generalDescription}</p></section>
      <section><h3>结合你的结果</h3><p>{insight.personalizedDescription}</p>{insight.familyContext.show && <div className="development-family"><h4>成长背景线索</h4><p>{insight.familyContext.summary}</p><ul>{insight.familyContext.evidence.map((item) => <li key={`${item.sourceId}-${item.task}-${item.evidence}`}>“{item.evidence}”</li>)}</ul></div>}</section>
      <section className="development-growth"><h3>接下来的发展课题</h3><p>{insight.growthTask}</p></section>
      <p className="development-note">发展心理学中的阶段并不意味着成年人“停留在某个年龄”。进入成年后，较早的发展任务仍可能在关系、事业与重要选择中反复被激活和重新整合。</p>
      <small className="development-method">这是用于自我探索的候选线索解读，不是标准化心理测验换算或临床诊断。</small>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
