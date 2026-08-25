import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { createMaterial, sections, selfSections } from '../lib/demo';
import type { Insight, JourneyData, PersonId } from '../types';

const labels: Record<PersonId, string> = { mother: '母亲', father: '父亲', self: '我自己' };
const archiveSection = (item: string) => item === '家庭系统' ? ['家庭系统', '父亲的家庭系统'] : [item];
const intro: Record<string, string> = {
  家庭系统: '从关系、角色与家庭规则中，看见影响如何被传递。',
  生命故事: '沿着童年、教育、工作、婚姻与转折，理解人生如何展开。',
  成长故事: '回到成长中的关键片段，理解你如何成为今天的自己。',
  教育经历: '从学习环境与机会中，看见能力、期待与自我评价如何形成。',
  社会与工作经历: '理解现实角色、责任与价值感如何进入你的生命轨迹。',
  性格特质: '观察反复出现的气质、习惯与应对方式。',
  优势与资源: '识别支撑这个人的力量、能力与生命资源。',
  局限与代价: '看见曾经有用、如今可能带来代价的保护方式。',
  '擅长与不擅长': '理解能力边界、偏好与不必勉强成为的部分。',
  '价值观与三观': '探索什么被视为重要，以及这些信念如何影响选择。',
  生存方式: '看见面对压力、责任、爱与冲突时形成的策略。',
  '关系与生存方式': '理解你在关系中靠近、退开、承担或保护自己的方式。',
  '我与原生家庭': '回看家庭经验如何进入今天的关系、工作与自我评价。',
  '当前困惑与成长课题': '把今天的困惑放回生命脉络，寻找更具体的理解。',
  '对我的影响': '回看这些经验如何进入今天的关系、工作与自我评价。',
  其他: '保存尚未归类、但值得被看见的生命线索。'
};

export function ArchiveWorkspace({ data, persist, toast }: { data: JourneyData; persist: (next: JourneyData) => Promise<void>; toast: (message: string) => void }) {
  const [personId, setPersonId] = useState<PersonId>('mother');
  const dimensions = personId === 'self' ? selfSections : sections;
  const [focus, setFocus] = useState(dimensions[0]);
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [guiding, setGuiding] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [classificationMessage, setClassificationMessage] = useState('');
  const person = data.people[personId];
  const materialsFor = (section: string, source = data) => source.materials.filter((item) => item.personId === personId && archiveSection(section).includes(item.section));
  const insightFor = (section: string, source = data) => {
    const ids = new Set(materialsFor(section, source).map((item) => item.id));
    return source.insights.find((item) => item.kind === 'summary' && item.title.startsWith(`${section} ·`) && item.sourceIds.some((id) => ids.has(id)));
  };
  const focusedMaterials = materialsFor(focus);
  const focusedInsight = insightFor(focus);

  useEffect(() => {
    setFocus(dimensions[0]);
    setText('');
    setQuestion('');
    setClassificationMessage('');
  }, [personId]);

  useEffect(() => {
    const hasUnanalysedMaterial = focusedMaterials.some((material) => !focusedInsight?.sourceIds.includes(material.id));
    if (focusedMaterials.length && hasUnanalysedMaterial && !analyzing) void generateInsight(focus);
  }, [focus, personId, data.materials, data.insights]);

  async function generateInsight(section = focus, source = data) {
    const relevant = materialsFor(section, source);
    if (!relevant.length) return;
    setAnalyzing(true);
    try {
      const prompt = `请只基于以下材料，整理“${labels[personId]}”在「${section}」维度可能呈现的形成过程、关系方式或影响，并在结尾给出一个温和、可继续探索的提问。用待确认的理解表达，不诊断、不下定论。`;
      const insight = await api.deepInsight(prompt, relevant);
      const next: Insight = { ...insight, kind: 'summary', title: `${section} · 动态洞察`, sourceIds: relevant.map((item) => item.id) };
      await persist({ ...source, insights: [next, ...source.insights] });
    } catch {
      toast('暂时无法更新洞察，请稍后再试。');
    } finally {
      setAnalyzing(false);
    }
  }

  async function ask() {
    setGuiding(true);
    try {
      setQuestion(await api.interviewQuestion(personId, '开放录入', data.materials.filter((item) => item.personId === personId)));
    } finally {
      setGuiding(false);
    }
  }

  async function save() {
    if (!text.trim()) return;
    setClassifying(true);
    try {
      const classified = await api.classifyMaterial(personId, text.trim(), dimensions);
      const material = createMaterial(personId, classified.section, text.trim(), question ? 'interview' : 'write');
      await persist({ ...data, materials: [material, ...data.materials] });
      setFocus(classified.section);
      setClassificationMessage(`系统已初步归入「${classified.section}」：${classified.reason}`);
      setText('');
      setQuestion('');
      toast('已收进生命材料库，并将用于相应维度的动态理解。');
    } catch {
      toast('保存失败，请稍后再试。');
    } finally {
      setClassifying(false);
    }
  }

  function editIdentity() {
    const birthDate = prompt('出生年月日', person.birthDate) ?? person.birthDate;
    const birthplace = prompt('出生地', person.birthplace) ?? person.birthplace;
    void persist({ ...data, people: { ...data.people, [personId]: { ...person, birthDate, birthplace } } });
  }

  return <div className="page archive-workspace">
    <span className="eyebrow">人物档案</span>
    <h1>{person.name}如何成为<br />今天的{personId === 'self' ? '我' : personId === 'mother' ? '她' : '他'}</h1>
    <div className="person-tabs">{(['mother', 'father', 'self'] as PersonId[]).map((id) => <button className={personId === id ? 'selected' : ''} key={id} onClick={() => setPersonId(id)}><i className={id}>{data.people[id].avatar}</i>{labels[id]}</button>)}</div>
    <section className="identity"><i className={personId}>{person.avatar}</i><div><b>{person.nickname}</b><span>{person.birthDate || '尚未填写生日'} · {person.birthplace || '尚未填写出生地'}</span></div><button onClick={editIdentity}>编辑信息</button></section>

    <section className="tab-insights">
      <header><div><span>维度洞察</span><h2>材料会被持续理解，而不是由你手动归档。</h2></div><p>选择一个维度，查看 AI 基于已录入材料形成的待确认理解与依据。</p></header>
      <div className="dimension-tabs" role="tablist" aria-label="人物档案维度">{dimensions.map((section) => <button key={section} role="tab" aria-selected={focus === section} className={focus === section ? 'selected' : ''} onClick={() => setFocus(section)}>{section}</button>)}</div>
      <article className="tab-insight-panel">
        <span>{focus} · 动态洞察</span>
        {analyzing ? <><h2>正在从已录入材料中整理理解…</h2><p>系统只会把可追溯的材料用于分析，并保留它是一种待你确认的理解。</p></> : focusedInsight ? <><h2>{focusedInsight.title}</h2><p>{focusedInsight.body}</p></> : <><h2>还没有足以形成理解的材料</h2><p>{intro[focus] || '继续记录具体的经历、话语或感受，系统会自动归类，并在材料足够时形成这项洞察。'}</p></>}
        <div className="tab-insight-actions">
          {focusedMaterials.length > 0 && <button className="secondary" onClick={() => void generateInsight()} disabled={analyzing}>更新这项洞察　↻</button>}
          <details><summary>查看系统使用的 {focusedMaterials.length} 条材料</summary>{focusedMaterials.length ? focusedMaterials.map((item) => <p key={item.id}>· {item.text}</p>) : <p>暂时没有相关材料。</p>}</details>
        </div>
      </article>
    </section>

    <section className="free-recorder">
      <header><div><span>生命材料录入</span><h2>自由记录，系统会自动理解与归类。</h2></div><button className="text-button" onClick={() => void ask()}>{guiding ? '正在生成问题…' : '让 AI 引导我录入'}</button></header>
      {question && <div className="record-question"><span>AI 提问</span><p>{question}</p><button onClick={() => void ask()}>换一个问题　↻</button></div>}
      <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={`聊聊${personId === 'self' ? '自己的经历、感受或记得的故事' : `你记得的${labels[personId]}：一段故事、一句话或一个印象`}……`} />
      <div className="recorder-actions"><small>{classificationMessage || '不需要选择记录位置。保存后，系统会结合内容自动归类，并用于相应维度的洞察。'}</small><button className="primary" disabled={classifying || !text.trim()} onClick={() => void save()}>{classifying ? '正在理解材料…' : '收进生命材料库'} <b>→</b></button></div>
    </section>
  </div>;
}
