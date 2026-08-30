import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Insight, JourneyData, PersonId } from '../types';

const labels: Record<PersonId, string> = { father: '父亲', mother: '母亲' };
const topics = ['人生背景摘要', '成长经历', '性格倾向', '核心价值观', '最看重什么', '可能最害怕什么', '爱的表达方式', '愤怒表达方式', '冲突处理方式', '对家庭的理解', '对孩子的主要期待', '对我的主要态度', '常说的话 / 语言风格', '重要人生局限', '时代与家庭环境的影响'];
const invalidPortraitText = /(请基于|任务[:：]|材料[:：]|输出|生成结构化|覆盖[:：]|维度可能呈现|不诊断|不下定论|当前材料提示|等待用户核对)/;

function hasUsableSections(value: Insight | undefined) {
  return Boolean(value?.portraitSections && Object.values(value.portraitSections).some((item) => item.trim().length >= 8 && !invalidPortraitText.test(item)));
}

export function ParentPortraits({ data, persist, toast }: { data: JourneyData; persist: (next: JourneyData) => Promise<void>; toast: (message: string) => void }) {
  const [personId, setPersonId] = useState<PersonId>('mother');
  const [generating, setGenerating] = useState(false);
  const attemptedKeys = useRef(new Set<string>());
  const roleId = personId === 'father' ? 'innerFather' : 'innerMother';
  const role = data.innerRoles.find((item) => item.id === roleId)!;
  const materials = data.materials.filter((item) => item.personId === personId);
  const portrait = useMemo(() => data.insights.find((item) => item.kind === 'portrait' && item.title.startsWith(`${labels[personId]} ·`) && hasUsableSections(item)), [data.insights, personId]);
  const materialKey = `${personId}:${materials.map((item) => item.id).sort().join('|')}`;

  async function generate() {
    if (!materials.length || generating) return;
    setGenerating(true);
    try {
      const output = await api.parentPortrait(personId, materials);
      const sections = Object.fromEntries(Object.entries(output?.sections || {}).filter(([topic, text]) => topics.includes(topic) && typeof text === 'string' && text.trim().length >= 8 && text.trim().length <= 180 && !invalidPortraitText.test(text)));
      if (!Object.keys(sections).length) {
        toast('材料已保存，但暂时不足以形成可靠画像；系统不会用模板补全。');
        return;
      }
      const next: Insight = {
        id: crypto.randomUUID(), kind: 'portrait', status: 'confirmed', title: `${labels[personId]} · 内在${labels[personId]}画像`,
        body: '基于已录入材料形成的动态画像。', portraitSections: sections,
        sourceIds: materials.map((item) => item.id), confidence: materials.length >= 6 ? '中' : '低'
      };
      await persist({ ...data, insights: [next, ...data.insights.filter((item) => !(item.kind === 'portrait' && item.title.startsWith(`${labels[personId]} ·`)))] });
    } finally { setGenerating(false); }
  }

  useEffect(() => {
    const needsRefresh = materials.length && (!portrait || materials.some((item) => !portrait.sourceIds.includes(item.id)));
    if (needsRefresh && !attemptedKeys.current.has(materialKey)) { attemptedKeys.current.add(materialKey); void generate(); }
  }, [materialKey, portrait, data.materials]);

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
      <p className="portrait-note">每一项只呈现已有材料能支持的理解；空白处会保留为资料不足。</p>
      <div className="portrait-dimensions">{topics.map((title) => { const text = portrait.portraitSections?.[title]; return <article key={title} className={text ? '' : 'insufficient'}><b>{title}</b><p>{text || '暂无足够材料形成这项理解。'}</p></article>; })}</div>
      <details><summary>查看形成这版画像的原始材料</summary>{materials.filter((item) => portrait.sourceIds.includes(item.id)).map((item) => <p key={item.id}>· {item.text}</p>)}</details>
    </section> : <section className="portrait-empty"><h2>{generating ? '正在从材料中整理内在角色…' : '内在角色正在形成'}</h2><p>{materials.length ? '已有材料正在被重新核对。若缺少可靠洞见，系统会保持空白，而不是用泛化文案填充。' : `关于${labels[personId]}的资料还不够，先写下一段真实经历吧。`}</p></section>}
  </div>;
}
