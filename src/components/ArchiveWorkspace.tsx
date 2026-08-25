import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { createMaterial, sections, selfSections } from '../lib/demo';
import type { Insight, JourneyData, PersonId } from '../types';

const labels: Record<PersonId, string> = { mother: '母亲', father: '父亲', self: '我自己' };
const archiveSection = (item: string) => item === '家庭系统' ? ['家庭系统', '父亲的家庭系统'] : [item];
const intro: Record<string, string> = {
  家庭系统: '看见早期关系、角色分工与家庭规则如何塑造一个人。', 生命故事: '沿着童年、教育、工作、婚姻与转折，理解人生如何展开。', 成长故事: '回到成长中的关键片段，理解你如何成为今天的自己。', 教育经历: '从学习环境与机会中，看见能力、期待与自我评价如何形成。', 社会与工作经历: '理解现实角色、责任与价值感如何进入你的生命轨迹。', 性格特质: '观察反复出现的气质、习惯与应对方式。', 优势与资源: '识别支撑这个人的力量、能力与生命资源。', 局限与代价: '看见曾经有用、如今可能带来代价的保护方式。', '擅长与不擅长': '理解能力边界、偏好与不必勉强成为的部分。', '价值观与三观': '探索什么被视为重要，以及这些信念如何影响选择。', 生存方式: '看见面对压力、责任、爱与冲突时形成的策略。', '关系与生存方式': '理解你在关系中靠近、退开、承担或保护自己的方式。', '我与原生家庭': '回看家庭经验如何进入今天的关系、工作与自我评价。', '当前困惑与成长课题': '把今天的困惑放回生命脉络，寻找更具体的理解。', '对我的影响': '回看这些经验如何进入今天的关系、工作与自我评价。', 其他: '保存尚未归类、但值得被看见的生命线索。'
};

export function ArchiveWorkspace({ data, persist, toast }: { data: JourneyData; persist: (next: JourneyData) => Promise<void>; toast: (message: string) => void }) {
  const [personId, setPersonId] = useState<PersonId>('mother');
  const dimensions = personId === 'self' ? selfSections : sections;
  const [focus, setFocus] = useState(dimensions[0]);
  const [recordSection, setRecordSection] = useState(dimensions[0]);
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [guiding, setGuiding] = useState(false);
  const person = data.people[personId];
  const materialsFor = (section: string) => data.materials.filter((item) => item.personId === personId && archiveSection(section).includes(item.section));
  const insightFor = (section: string) => { const ids = new Set(materialsFor(section).map((item) => item.id)); return data.insights.find((item) => item.kind === 'summary' && item.sourceIds.some((id) => ids.has(id))); };
  const focusedMaterials = materialsFor(focus);
  const focusedInsight = insightFor(focus);
  useEffect(() => { setFocus(dimensions[0]); setRecordSection(dimensions[0]); setQuestion(''); }, [personId]);
  const dimensionCards = useMemo(() => dimensions.map((section) => ({ section, materials: materialsFor(section), insight: insightFor(section) })), [personId, data.materials, data.insights]);
  async function generateInsight() { if (!focusedMaterials.length) { toast('先录入一段与此维度相关的具体经历，再生成分析。'); return; } const prompt = `请只基于以下材料，整理“${labels[personId]}”在「${focus}」维度可能呈现的形成过程、关系方式或影响。用待确认的理解表达，不诊断、不下定论。`; const insight = await api.deepInsight(prompt, focusedMaterials); const next: Insight = { ...insight, kind: 'summary', title: `${focus} · 待确认理解`, sourceIds: focusedMaterials.map((item) => item.id) }; await persist({ ...data, insights: [next, ...data.insights] }); toast('已生成初步分析，请结合真实经验核对。'); }
  async function ask() { setGuiding(true); try { setQuestion(await api.interviewQuestion(personId, recordSection, materialsFor(recordSection))); } finally { setGuiding(false); } }
  async function save() { if (!text.trim()) return; const material = createMaterial(personId, recordSection, text.trim(), question ? 'interview' : 'write'); await persist({ ...data, materials: [material, ...data.materials] }); setText(''); setQuestion(''); toast('已收进生命材料库。'); }
  function editIdentity() { const birthDate = prompt('出生年月日', person.birthDate) ?? person.birthDate; const birthplace = prompt('出生地', person.birthplace) ?? person.birthplace; void persist({ ...data, people: { ...data.people, [personId]: { ...person, birthDate, birthplace } } }); }
  return <div className="page archive-workspace"><span className="eyebrow">人物档案</span><h1>{person.name}如何成为<br/>今天的{personId === 'self' ? '我' : personId === 'mother' ? '她' : '他'}</h1><div className="person-tabs">{(['mother', 'father', 'self'] as PersonId[]).map((id) => <button className={personId === id ? 'selected' : ''} key={id} onClick={() => setPersonId(id)}><i className={id}>{data.people[id].avatar}</i>{labels[id]}</button>)}</div><section className="identity"><i className={personId}>{person.avatar}</i><div><b>{person.nickname}</b><span>{person.birthDate || '尚未填写生日'} · {person.birthplace || '尚未填写出生地'}</span></div><button onClick={editIdentity}>编辑信息</button></section><section className="dimension-area"><header><div><span>维度洞察</span><h2>从已保存的材料里，形成待你确认的理解。</h2></div><p>选择一个维度查看其分析与依据；它不会影响下方的录入位置。</p></header><div className="dimension-grid">{dimensionCards.map(({ section, materials, insight }) => <button className={focus === section ? 'selected' : ''} key={section} onClick={() => setFocus(section)}><b>{section}</b><p>{insight?.body || (materials.length ? '已有生命材料，可生成初步分析。' : intro[section] || '等待相关材料，形成更具体的理解。')}</p><small>{insight ? '查看待确认理解　›' : '查看维度分析　›'}</small></button>)}</div><article className="dimension-detail"><div><span>{focus} · 维度分析</span><h2>{focusedInsight?.title || '尚未形成结论'}</h2><p>{focusedInsight?.body || (focusedMaterials.length ? '这部分已有材料。你可以生成一段只基于这些材料的初步分析，并决定它是否符合你的经验。' : '这个维度还没有可分析的生命材料。下方录入区可独立选择任何维度补充内容。')}</p></div><div>{focusedMaterials.length ? <button className="primary" onClick={() => void generateInsight()}>{focusedInsight ? '重新生成分析' : '生成初步分析'} <b>→</b></button> : null}<details><summary>查看 {focusedMaterials.length} 条可追溯材料</summary>{focusedMaterials.map((item) => <p key={item.id}>· {item.text}</p>)}</details></div></article></section><section className="independent-recorder"><header><div><span>生命材料录入</span><h2>独立记录，不受上方洞察卡影响。</h2></div><button className="text-button" onClick={() => void ask()}>{guiding ? '正在生成问题…' : '让 AI 引导我录入'}</button></header><label>记录到<select value={recordSection} onChange={(event) => { setRecordSection(event.target.value); setQuestion(''); }}>{dimensions.map((section) => <option key={section}>{section}</option>)}</select></label>{question && <div className="record-question"><span>AI 提问</span><p>{question}</p><button onClick={() => void ask()}>换一个问题　↻</button></div>}<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={`聊聊${personId === 'self' ? '自己的经历' : `你记得的${labels[personId]}`}……`}/><div className="recorder-actions"><small>材料保存后，才能被上方「维度洞察」用于形成分析。</small><button className="primary" onClick={() => void save()}>收进生命材料库 <b>→</b></button></div></section></div>;
}
