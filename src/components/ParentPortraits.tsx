import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Insight, JourneyData, PersonId } from '../types';

const labels: Record<PersonId, string> = { father: '父亲', mother: '母亲' };
const topics = ['人生背景摘要', '成长经历', '性格倾向', '核心价值观', '最看重什么', '可能最害怕什么', '爱的表达方式', '愤怒表达方式', '冲突处理方式', '对家庭的理解', '对孩子的主要期待', '对我的主要态度', '常说的话 / 语言风格', '重要人生局限', '时代与家庭环境的影响'];
const invalidPortraitText = /(请基于|任务[:：]|材料[:：]|输出|生成结构化|覆盖[:：]|维度可能呈现|不诊断|不下定论|当前材料提示|等待用户核对|从你记录的内容看|提供了一条可继续核对的线索|这是理解.{0,4}起点)/;

function hasUsableSections(value: Insight | undefined) {
  return Boolean(value?.portraitSections && Object.values(value.portraitSections).some((item) => item.trim().length >= 8 && !invalidPortraitText.test(item)));
}

export function ParentPortraits({ data, persist }: { data: JourneyData; persist: (next: JourneyData) => Promise<void> }) {
  const [personId, setPersonId] = useState<PersonId>('mother');
  const [generationTick, setGenerationTick] = useState(0);
  const inFlight = useRef(new Set<string>());
  const retries = useRef(new Map<string, number>());
  const roleId = personId === 'father' ? 'innerFather' : 'innerMother';
  const role = data.innerRoles.find((item) => item.id === roleId)!;
  const materials = data.materials.filter((item) => item.personId === personId);
  const portrait = useMemo(() => data.insights.find((item) => item.kind === 'portrait' && item.title.startsWith(`${labels[personId]} ·`) && hasUsableSections(item)), [data.insights, personId]);
  const materialKey = `${personId}:${materials.map((item) => item.id).sort().join('|')}`;
  const feedback = useMemo(() => data.insights.filter((item) => item.kind === 'hypothesis' && item.status !== 'pending' && item.sourceIds.some((sourceId) => materials.some((material) => material.id === sourceId))), [data.insights, materials]);
  const feedbackKey = feedback.map((item) => `${item.id}:${item.status}`).sort().join('|');

  async function generate() {
    if (!materials.length || inFlight.current.has(materialKey)) return;
    inFlight.current.add(materialKey);
    try {
      const output = await api.parentPortrait(personId, materials, feedback);
      const sections = Object.fromEntries(Object.entries(output?.sections || {}).filter(([topic, text]) => topics.includes(topic) && typeof text === 'string' && text.trim().length >= 8 && text.trim().length <= 180 && !invalidPortraitText.test(text)));
      if (!Object.keys(sections).length) {
        const attempts = retries.current.get(materialKey) || 0;
        if (attempts < 2) {
          retries.current.set(materialKey, attempts + 1);
          window.setTimeout(() => setGenerationTick((value) => value + 1), 900 * (attempts + 1));
        }
        return;
      }
      retries.current.delete(materialKey);
      const next: Insight = {
        id: crypto.randomUUID(), kind: 'portrait', status: 'confirmed', title: `${labels[personId]} · 内在${labels[personId]}画像`,
        body: '基于已录入材料形成的动态画像。', portraitSections: sections,
        sourceIds: materials.map((item) => item.id), materialSignature: `${materialKey}|${feedbackKey}`, confidence: materials.length >= 6 ? '中' : '低'
      };
      await persist({ ...data, insights: [next, ...data.insights.filter((item) => !(item.kind === 'portrait' && item.title.startsWith(`${labels[personId]} ·`)))] });
    } finally { inFlight.current.delete(materialKey); }
  }

  useEffect(() => {
    const needsRefresh = materials.length && (!portrait || portrait.materialSignature !== `${materialKey}|${feedbackKey}`);
    if (needsRefresh) void generate();
  }, [materialKey, feedbackKey, portrait?.id, portrait?.materialSignature, generationTick]);

  function edit() {
    const name = prompt('角色称呼', role.name)?.trim();
    const avatar = prompt('头像文字', role.avatar)?.trim();
    if (!name || !avatar) return;
    void persist({ ...data, innerRoles: data.innerRoles.map((item) => item.id === role.id ? { ...item, name, avatar: avatar.slice(0, 2) } : item) });
  }

  return <div className="page portraits">
    <span className="eyebrow">内在父母</span><h1>从你的经历里，<br />看见内在父母。</h1>
    <p className="page-copy">内在父亲 / 内在母亲来自你提供的经历与感受，不等同于现实中的父母本人。每次新增材料，系统都会重新核对并更新画像。</p>
    <div className="person-tabs">{(['mother', 'father'] as PersonId[]).map((id) => <button key={id} className={personId === id ? 'selected' : ''} onClick={() => setPersonId(id)}><i className={id}>{data.people[id].avatar}</i>内在{labels[id]}</button>)}</div>
    <section className="portrait-profile"><i>{role.avatar}</i><div><span>内在角色</span><h2>{role.name}</h2><p>材料基础：{materials.length} 条关于{labels[personId]}的原始记录</p></div><button className="text-button" onClick={edit}>修改头像与称呼</button></section>
    {portrait ? <section className="portrait-result">
      <span>动态画像 · 基于 {portrait.sourceIds.length} 条可追溯材料</span><h2>{portrait.title}</h2>
      <p className="portrait-note">每一项都是依据已录入经历形成的当前理解；没有依据的部分会先留白。</p>
      <div className="portrait-dimensions">{topics.map((title) => { const text = portrait.portraitSections?.[title]; return <article key={title} className={text ? '' : 'insufficient'}><b>{title}</b><p>{text || '暂无足够材料形成这项理解。'}</p></article>; })}</div>
      <details><summary>查看形成这版画像的原始材料</summary>{materials.filter((item) => portrait.sourceIds.includes(item.id)).map((item) => <p key={item.id}>· {item.text}</p>)}</details>
    </section> : materials.length ? <section className="portrait-empty portrait-skeleton" aria-label="正在更新画像"><div /><div /><div /><div /></section> : <section className="portrait-empty"><h2>从一段真实故事开始</h2><p>关于{labels[personId]}的经历还没有被记录。写下一件你记得的事，画像会从那里慢慢变得清晰。</p></section>}
  </div>;
}
