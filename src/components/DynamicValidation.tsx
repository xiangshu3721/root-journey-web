import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Approval, Insight, JourneyData } from '../types';
import { isActionableInsight } from '../lib/insightValidation';

export function DynamicValidation({ data, persist, toast }: { data: JourneyData; persist: (next: JourneyData) => Promise<void>; toast: (message: string) => void }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [requestVersion, setRequestVersion] = useState(0);
  const requested = useRef(new Set<string>());
  const signature = data.materials.map((item) => item.id).sort().join('|');
  const pending = useMemo(() => data.insights.filter((item) => item.kind === 'hypothesis' && item.status === 'pending' && isActionableInsight(item.body) && !hidden.includes(item.id)), [data.insights, hidden]);
  const current = pending[0];
  useEffect(() => {
    if (!signature || current) return;
    const alreadyHandled = data.insights.some((item) => item.kind === 'hypothesis' && item.materialSignature === signature);
    if (alreadyHandled || requested.current.has(signature)) return;
    requested.current.add(signature);
    const feedback = data.insights.filter((item) => item.kind === 'hypothesis' && item.status !== 'pending');
    const portraits = data.insights.filter((item) => item.kind === 'portrait');
    void api.dynamicInsights(data.materials, feedback, portraits).then(async (results) => {
      const candidates = results.filter((item) => isActionableInsight(item.body)).slice(0, 3);
      if (!candidates.length) return;
      const next: JourneyData = {
        ...data,
        insights: [...candidates.map((item) => ({ id: crypto.randomUUID(), kind: 'hypothesis' as const, status: 'pending' as const, title: item.title.trim(), body: item.body.trim(), sourceIds: data.materials.map((material) => material.id), materialSignature: signature })), ...data.insights]
      };
      await persist(next);
    });
  }, [signature, current?.id, requestVersion]);
  function decide(status: Approval) {
    if (!current) return;
    void persist({ ...data, insights: data.insights.map((item) => item.id === current.id ? { ...item, status } : item) });
    setHidden((items) => [...items, current.id]);
    toast('已记录，系统会据此继续校正内在父母。');
  }
  return <div className="page dynamic-validation"><span className="eyebrow">动态校验</span><h1>看见更真实的父母</h1><p className="page-copy">每一条理解都来自你已经记录的故事和选择。你的判断会被保留，并成为下一次理解父母与自己的依据。</p>{current ? <section className="validation-card"><span>{current.title}</span><p>{current.body}</p><small>基于已记录的经历 · 请按你的真实感受判断</small><div><button className="primary small" onClick={() => decide('confirmed')}>符合</button><button className="secondary" onClick={() => decide('partial')}>部分符合</button><button className="text-button" onClick={() => decide('rejected')}>不符合</button></div></section> : <section className="validation-empty"><h2>暂时没有新的理解</h2><p>这里不会用泛泛的推测填充。新增故事、测试线索或一次确认后，只有形成具体理解时，它才会出现。</p>{data.materials.length > 0 && <button className="text-button" onClick={() => { requested.current.delete(signature); setRequestVersion((value) => value + 1); }}>重新整理</button>}</section>}</div>;
}
