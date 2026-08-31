import { useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Insight, JourneyData, PersonId } from '../types';

const labels: Record<PersonId, string> = { father: '父亲', mother: '母亲' };
const topics = ['人生背景摘要', '成长经历', '性格倾向', '核心价值观', '最看重什么', '可能最害怕什么', '爱的表达方式', '愤怒表达方式', '冲突处理方式', '对家庭的理解', '对孩子的主要期待', '对我的主要态度', '常说的话 / 语言风格', '重要人生局限', '时代与家庭环境的影响'];
const invalidPortraitText = /(请基于|任务[:：]|材料[:：]|输出|生成结构化|覆盖[:：]|维度可能呈现|不诊断|不下定论|当前材料提示|等待用户核对|从你记录的内容看|提供了一条可继续核对的线索|这是理解.{0,4}起点)/;
const cleanPortraitText = (value: string) => value.trim().replace(/^(?:从(?:这些)?(?:材料|记录)看|材料(?:仅)?显示)[，,:：\s]*/u, '').replace(/[，,]?\s*(?:具体职业与家庭结构|其他背景信息)未提及。?$/u, '').trim();

function hasUsableSections(value: Insight | undefined) {
  return Boolean(value?.portraitSections && Object.values(value.portraitSections).some((item) => cleanPortraitText(item).length >= 8 && !invalidPortraitText.test(item)));
}

export function ParentPortraits({ data, persist }: { data: JourneyData; persist: (next: JourneyData) => Promise<void> }) {
  const [personId, setPersonId] = useState<PersonId>('mother');
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const inFlight = useRef(new Set<string>());
  const roleId = personId === 'father' ? 'innerFather' : 'innerMother';
  const role = data.innerRoles.find((item) => item.id === roleId)!;
  const materials = data.materials.filter((item) => item.personId === personId && !item.isRaw);
  const legacyMaterials = materials.filter((item) => !item.evidenceType);
  const portrait = useMemo(() => data.insights.find((item) => item.kind === 'portrait' && item.title.startsWith(`${labels[personId]} ·`) && hasUsableSections(item)), [data.insights, personId]);
  const materialKey = `${personId}:${materials.map((item) => item.id).sort().join('|')}`;
  const feedback = useMemo(() => data.insights.filter((item) => item.kind === 'hypothesis' && item.status !== 'pending' && item.sourceIds.some((sourceId) => materials.some((material) => material.id === sourceId))), [data.insights, materials]);
  const feedbackKey = feedback.map((item) => `${item.id}:${item.status}`).sort().join('|');
  const needsUpdate = Boolean(materials.length && (!portrait || portrait.materialSignature !== `${materialKey}|${feedbackKey}`));

  async function generate() {
    if (!materials.length || inFlight.current.has(materialKey)) return;
    inFlight.current.add(materialKey);
    setGenerating(true);
    setGenerationFailed(false);
    try {
      let nextData = data;
      let portraitMaterials = materials;
      if (legacyMaterials.length) {
        const migrated = await Promise.all(legacyMaterials.map(async (material) => {
          const segments = await api.structureMaterial(material.text, personId);
          return {
            raw: { ...material, isRaw: true, evidenceType: 'raw' as const, section: `${material.section}原文` },
            segments: segments.map((segment) => ({ ...material, id: crypto.randomUUID(), personId: segment.personId, section: material.section, text: segment.text, evidenceType: segment.evidenceType, rawEntryId: material.id, isRaw: false }))
          };
        }));
        const migratedIds = new Set(legacyMaterials.map((item) => item.id));
        const structured = migrated.flatMap((item) => item.segments);
        nextData = { ...data, materials: [...structured, ...migrated.map((item) => item.raw), ...data.materials.filter((item) => !migratedIds.has(item.id))] };
        portraitMaterials = nextData.materials.filter((item) => item.personId === personId && !item.isRaw);
      }
      const output = await api.parentPortrait(personId, portraitMaterials, feedback);
      const sections = Object.fromEntries(Object.entries(output?.sections || {}).map(([topic, text]) => [topic, typeof text === 'string' ? cleanPortraitText(text) : '']).filter(([topic, text]) => topics.includes(topic) && text.length >= 8 && text.length <= 180 && !invalidPortraitText.test(text)));
      if (!Object.keys(sections).length) {
        setGenerationFailed(true);
        return;
      }
      setGenerationFailed(false);
      const next: Insight = {
        id: crypto.randomUUID(), kind: 'portrait', status: 'confirmed', title: `${labels[personId]} · 内在${labels[personId]}画像`,
        body: '基于已录入材料形成的动态画像。', portraitSections: sections,
        sourceIds: portraitMaterials.map((item) => item.id), materialSignature: `${personId}:${portraitMaterials.map((item) => item.id).sort().join('|')}|${feedbackKey}`, confidence: portraitMaterials.length >= 6 ? '中' : '低'
      };
      await persist({ ...nextData, insights: [next, ...nextData.insights.filter((item) => !(item.kind === 'portrait' && item.title.startsWith(`${labels[personId]} ·`)))] });
    } finally { inFlight.current.delete(materialKey); setGenerating(false); }
  }

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
    <section className="portrait-profile"><i>{role.avatar}</i><div><span>内在角色</span><h2>{role.name}</h2><p>材料基础：{materials.length} 条已归属到{labels[personId]}的线索</p></div>{materials.length > 0 && <button className="secondary portrait-refresh" disabled={generating} onClick={() => void generate()}>{generating ? '正在更新…' : needsUpdate ? `更新内在${labels[personId]}` : `刷新内在${labels[personId]}`} </button>}<button className="text-button" onClick={edit}>修改头像与称呼</button></section>
    {portrait ? <section className="portrait-result">
      <span>动态画像 · 基于 {portrait.sourceIds.length} 条可追溯材料</span><h2>{portrait.title}</h2>
      <p className="portrait-note">每一项都是依据已录入经历形成的当前理解；没有依据的部分会先留白。</p>
      <div className="portrait-dimensions">{topics.map((title) => { const text = portrait.portraitSections?.[title]; return <article key={title} className={text ? '' : 'insufficient'}><b>{title}</b><p>{text || '暂无足够材料形成这项理解。'}</p></article>; })}</div>
      <details><summary>查看形成这版画像的原始材料</summary>{materials.filter((item) => portrait.sourceIds.includes(item.id)).map((item) => <p key={item.id}>· {item.text}</p>)}</details>
    </section> : materials.length ? <section className="portrait-empty"><h2>{generationFailed ? '这次没有生成可展示的理解' : `已收集 ${materials.length} 条关于${labels[personId]}的经历`}</h2><p>{generationFailed ? '材料已经保留。请点击下方按钮再次生成；只有形成具体结论时，才会显示在画像中。' : `准备好后，点击一次即可基于这些经历生成内在${labels[personId]}。切换标签不会消耗任何模型调用。`}</p><button className="primary" disabled={generating} onClick={() => void generate()}>{generating ? '正在生成画像…' : `生成内在${labels[personId]}画像`} <b>→</b></button></section> : <section className="portrait-empty"><h2>从一段真实故事开始</h2><p>关于{labels[personId]}的经历还没有被记录。写下一件你记得的事，画像会从那里慢慢变得清晰。</p></section>}
  </div>;
}
