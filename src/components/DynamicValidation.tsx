import { useMemo, useState } from 'react';
import type { Approval, Insight, JourneyData } from '../types';

function displayInsight(insight: Insight, data: JourneyData) {
  const text = insight.body.replace(/请只基于[\s\S]*?材料[，。]/, '').replace(/这是[^。]*定论[。]/g, '').trim();
  if (text.length <= 220) return text;
  const source = data.materials.find((item) => insight.sourceIds.includes(item.id));
  return source ? `根据你记录的“${source.text.slice(0, 58)}${source.text.length > 58 ? '…' : ''}”，系统暂时看到：${text.slice(-130)}` : text.slice(0, 210);
}

export function DynamicValidation({ data, persist, toast }: { data: JourneyData; persist: (next: JourneyData) => Promise<void>; toast: (message: string) => void }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const pending = useMemo(() => data.insights.filter((item) => (item.kind === 'summary' || item.kind === 'hypothesis') && item.status === 'pending' && !hidden.includes(item.id)), [data.insights, hidden]);
  const current = pending[0];
  function decide(status: Approval) {
    if (!current) return;
    void persist({ ...data, insights: data.insights.map((item) => item.id === current.id ? { ...item, status } : item) });
    setHidden((items) => [...items, current.id]);
    toast('已记录，你的下一次确认会继续帮助系统校正内在父母。');
  }
  return <div className="page dynamic-validation"><span className="eyebrow">动态校验</span><h1>看见更真实的父母</h1><p className="page-copy">系统会根据你持续录入的材料，动态提出关于父母及其对你影响的理解。每一次确认，都会让内在父母更接近你的真实经验。</p>{current ? <section className="validation-card"><span>{current.kind === 'hypothesis' ? '内在父母对我的可能影响' : '关于父母的一条系统洞察'}</span><p>{displayInsight(current, data)}</p><small>来自 {current.sourceIds.length} 条原始材料 · 这是一种待你确认的理解</small><div><button className="primary small" onClick={() => decide('confirmed')}>符合</button><button className="secondary" onClick={() => decide('partial')}>部分符合</button><button className="text-button" onClick={() => decide('rejected')}>不符合</button></div></section> : <section className="validation-empty"><h2>暂时没有新的洞察等待你确认</h2><p>继续补充父亲、母亲的故事与互动，系统会把新的理解一条条带到这里。</p></section>}</div>;
}
