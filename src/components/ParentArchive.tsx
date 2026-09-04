import { useRef, useState } from 'react';
import { areaList } from '@vant/area-data';
import { api } from '../lib/api';
import { createMaterial } from '../lib/demo';
import { nextParentQuestion, type ParentQuestion } from '../lib/parentQuestionBank';
import type { Insight, JourneyData, PersonId } from '../types';

const fields: Array<[keyof JourneyData['people']['father'], string, string]> = [
  ['education', '教育经历', ''], ['work', '工作经历', ''], ['marriage', '婚姻经历', ''],
  ['lifeEvents', '重要人生事件', '例如：疾病、重大挫折或重要转折'], ['keyInteractions', '与我的关键互动事件', '']
];
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; onresult: ((event: any) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; };
type RecognitionConstructor = new () => Recognition;
const archiveCards = [['TA 的来时路', ['人生背景', '成长经历与关键事件', '未完成的人生']], ['TA 的内在世界', ['性格与处事方式', '核心价值观', '最看重什么', '最害怕什么', '内在最深的需要']], ['TA 与人相处的方式', ['爱的表达', '情绪表达', '沟通与冲突', '边界与控制']], ['TA 心里的家庭', ['家庭 / 婚姻观与东方家庭文化影响', 'TA 对孩子的期待']], ['TA 眼中的我', ['TA 如何看待我']], ['TA 留给我的东西', ['TA 对我的影响']]] as const;
const provinces = Object.entries(areaList.province_list);
const citiesFor = (provinceCode: string) => Object.entries(areaList.city_list).filter(([code]) => code.startsWith(provinceCode.slice(0, 2)));
const countiesFor = (cityCode: string) => Object.entries(areaList.county_list).filter(([code]) => code.startsWith(cityCode.slice(0, 4)));
const codeFor = (items: Array<[string, string]>, value: string) => items.find(([, name]) => value.includes(name))?.[0] || '';

export function ParentArchive({ data, persist, toast }: { data: JourneyData; persist: (next: JourneyData) => Promise<void>; toast: (message: string) => void }) {
  const [personId, setPersonId] = useState<PersonId>('mother');
  const [text, setText] = useState(''); const [question, setQuestion] = useState<ParentQuestion | null>(null); const [questionText, setQuestionText] = useState(''); const [suggestedIds, setSuggestedIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false); const [listening, setListening] = useState(false); const [showBasics, setShowBasics] = useState(false); const recognition = useRef<Recognition | null>(null);
  const recorderRef = useRef<HTMLTextAreaElement | null>(null);
  const person = data.people[personId];
  const materials = data.materials.filter((item) => item.personId === personId);
  const portrait = data.insights.find((item) => item.kind === 'portrait' && item.title.startsWith(`${personId === 'mother' ? '母亲' : '父亲'} ·`) && item.portraitVersion === 3);
  const legacyLifeEvents = [person.lifeEvents, person.majorIllness, person.setbacks].filter(Boolean).join('\n');
  function update(key: keyof typeof person, value: string) { void persist({ ...data, people: { ...data.people, [personId]: { ...person, [key]: value } } }); }
  function updateLifeEvents(value: string) { void persist({ ...data, people: { ...data.people, [personId]: { ...person, lifeEvents: value, majorIllness: '', setbacks: '' } } }); }
  async function ask() { const next = nextParentQuestion(personId, materials, suggestedIds); setSuggestedIds((current) => new Set(current).add(next.id)); setQuestion(next); setQuestionText(await api.interviewQuestion(personId, next, materials)); }
  async function organize(nextMaterials = data.materials) { const relevant = nextMaterials.filter((item) => item.personId === personId && !item.isRaw); const output = await api.parentPortrait(personId, relevant); const parentLabel = personId === 'mother' ? '母亲' : '父亲'; const nextPortrait: Insight | undefined = output ? { id: crypto.randomUUID(), kind: 'portrait', status: 'confirmed', title: `${parentLabel} · 结构化档案`, body: '基于已录入材料形成的结构化档案。', portraitSections: output.sections, portraitSummary: output.summary, portraitExtras: output.extras, portraitVersion: 3, sourceIds: relevant.map((item) => item.id), materialSignature: relevant.map((item) => item.id).sort().join('|') } : undefined; await persist({ ...data, materials: nextMaterials, insights: nextPortrait ? [nextPortrait, ...data.insights.filter((item) => !(item.kind === 'portrait' && item.title.startsWith(`${parentLabel} ·`)))] : data.insights }); return Boolean(nextPortrait); }
  async function save(source: 'write' | 'voice' = 'write') { if (!text.trim()) return; setSaving(true); try { const binding = question ? { questionId: question.id, questionText: questionText || question.text, questionModule: question.module, questionDimension: question.dimension } : {}; const raw = createMaterial(personId, question ? `问题记录 · ${question.dimension}` : '自由记录原文', text.trim(), source, { evidenceType: 'raw', isRaw: true, ...binding }); const segments = await api.structureMaterial(raw.text, personId); const structured = segments.map((segment) => createMaterial(segment.personId, question ? `问题记录 · ${question.dimension}` : '自由记录', segment.text, source, { evidenceType: segment.evidenceType, rawEntryId: raw.id, ...binding })); const complete = await organize([...structured, raw, ...data.materials]); setText(''); setQuestion(null); setQuestionText(''); setSuggestedIds(new Set()); toast(complete ? '原始记录已保存，档案已更新。' : '原始记录已保存，系统将在下次整理时补充档案。'); } finally { setSaving(false); } }
  function remove(recordId: string) { void persist({ ...data, materials: data.materials.filter((item) => item.id !== recordId && item.rawEntryId !== recordId) }); }
  function voice() { const SpeechRecognition = (window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition; if (!SpeechRecognition) { toast('当前浏览器暂不支持语音转写，请使用文本输入。'); return; } const instance = new SpeechRecognition(); recognition.current = instance; instance.lang = 'zh-CN'; instance.continuous = false; instance.interimResults = false; instance.onresult = (event) => setText((current) => `${current}${current ? '\n' : ''}${Array.from(event.results).map((item: any) => item[0]?.transcript || '').join('')}`); instance.onerror = () => { setListening(false); toast('语音识别未完成，请再试一次。'); }; instance.onend = () => setListening(false); setListening(true); instance.start(); }
  function focusRecorder() { window.requestAnimationFrame(() => recorderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); window.setTimeout(() => recorderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180); }
  function switchPerson(id: PersonId) { setPersonId(id); setText(''); setQuestion(null); setQuestionText(''); setSuggestedIds(new Set()); setShowBasics(false); }
  return <div className="page parent-archive">
    <span className="eyebrow">父母档案</span><h1>随时记录，关于你父母的点滴回忆。</h1>
    <div className="person-tabs">{(['mother', 'father'] as PersonId[]).map((id) => <button key={id} className={personId === id ? 'selected' : ''} onClick={() => switchPerson(id)}><i className={id}>{data.people[id].avatar}</i>{id === 'mother' ? '母亲档案' : '父亲档案'}</button>)}</div>
    <section className="parent-identity"><i className={personId}>{person.avatar}</i><div className="identity-copy"><b>{person.nickname}</b><span>信息可随时补充，不填不会影响自由记录。</span></div><div className="identity-actions"><button className="text-button" aria-expanded={showBasics} onClick={() => setShowBasics((current) => !current)}>{showBasics ? '收起基础信息' : '添加 / 修改基础信息'}</button></div></section>
    {showBasics && <section className="parent-basics"><div className="basic-form"><h2>{personId === 'mother' ? '母亲的基础信息' : '父亲的基础信息'}</h2><div>
      <label>称呼<input value={person.nickname} onChange={(event) => update('nickname', event.target.value)} /></label>
      <label>出生日期<input type="date" value={normalizeDate(person.birthDate)} onChange={(event) => update('birthDate', event.target.value)} /></label>
      <label className="address-field">出生地<AreaPicker value={person.birthplace} onChange={(value) => update('birthplace', value)} /></label>
      <label className="address-field">主要成长地<AreaPicker value={person.growthPlace} onChange={(value) => update('growthPlace', value)} /></label>
      {fields.map(([key, title, placeholder]) => <label key={String(key)}>{title}<input value={key === 'lifeEvents' ? legacyLifeEvents : String(person[key] || '')} placeholder={placeholder} onChange={(event) => key === 'lifeEvents' ? updateLifeEvents(event.target.value) : update(key, event.target.value)} /></label>)}
    </div></div></section>}
    <section className="parent-recorder"><header><div><span>自由记录</span><h2>记录 TA 的故事、想法、话语、感受等。</h2></div><button className="text-button" onClick={() => void ask()}>给我一个问题</button></header>{question && <div className="record-question"><span>{question.module} · {question.dimension}</span><p>{questionText || question.text}</p><button onClick={() => void ask()}>换一个维度的问题　↻</button></div>}<textarea ref={recorderRef} value={text} onFocus={focusRecorder} onChange={(event) => setText(event.target.value)} placeholder={question ? '围绕这个问题，写下你记得的具体故事、话语或感受…' : `关于${personId === 'mother' ? '母亲' : '父亲'}，我记得……`} /><div className="record-actions"><button type="button" className={listening ? 'voice-button recording-button listening' : 'voice-button recording-button'} onClick={voice} aria-label={listening ? '正在录音' : '开始录音'} title={listening ? '正在录音' : '语音输入'}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8.5 22h7" /></svg></button><button className="primary" disabled={!text.trim() || saving} onClick={() => void save(listening ? 'voice' : 'write')}>{saving ? '正在整理…' : '保存并整理'} <b>→</b></button></div></section>
    {portrait && <section className="archive-portrait"><span>AI 已整理的结构化档案</span><h2>{portrait.portraitSummary || `${person.nickname}的当前人物理解`}</h2><div className="archive-cards">{archiveCards.map(([title, dimensions]) => <article key={title}><h3>{title}</h3>{dimensions.map((dimension) => <section key={dimension}><b>{dimension}</b><p>{portrait.portraitSections?.[dimension] || '这部分还需要更多真实故事。'}</p></section>)}</article>)}</div>{Object.values(portrait.portraitExtras || {}).some(Boolean) && <div className="archive-extras">{Object.entries(portrait.portraitExtras || {}).filter(([, value]) => Boolean(value)).map(([title, value]) => <article key={title}><b>{title}</b><p>{value}</p></article>)}</div>}</section>}
    <section className="material-list"><h3>原始记录</h3>{materials.filter((item) => item.isRaw).length ? materials.filter((item) => item.isRaw).map((item) => <article key={item.id}><span>{new Date(item.createdAt).toLocaleDateString('zh-CN')} · {item.source === 'voice' ? '语音转写' : '文字记录'}</span>{item.questionText && <><b>{item.questionModule} · {item.questionDimension}</b><p className="bound-question">问：{item.questionText}</p></>}<p>{item.text}</p><button className="text-button" onClick={() => remove(item.id)}>删除</button></article>) : <p>还没有原始记录。</p>}</section>
  </div>;
}

function normalizeDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/(\d{4})\s*年\D*(\d{1,2})\s*月\D*(\d{1,2})\s*日/);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : '';
}

function AreaPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const provinceCode = codeFor(provinces, value); const provinceName = areaList.province_list[provinceCode] || '';
  const cities = provinceCode ? citiesFor(provinceCode) : []; const cityCode = codeFor(cities, value); const cityName = areaList.city_list[cityCode] || '';
  const counties = cityCode ? countiesFor(cityCode) : []; const countyCode = codeFor(counties, value); const countyName = areaList.county_list[countyCode] || '';
  const save = (province: string, city = '', county = '') => onChange([province, city, county].filter(Boolean).join(' / '));
  return <span className="area-picker"><button type="button" className="area-picker-trigger" onClick={() => setOpen((current) => !current)}>{value || '选择省、市、区'}<b>{open ? '收起' : '选择'}</b></button>{open && <span className="area-picker-panel"><select value={provinceCode} onChange={(event) => save(areaList.province_list[event.target.value] || '')}><option value="">选择省份</option>{provinces.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>{provinceCode && <select value={cityCode} onChange={(event) => save(provinceName, areaList.city_list[event.target.value] || '')}><option value="">选择城市</option>{cities.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>}{cityCode && <select value={countyCode} onChange={(event) => save(provinceName, cityName, areaList.county_list[event.target.value] || '')}><option value="">选择区 / 县</option>{counties.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>}<button type="button" className="area-picker-done" onClick={() => setOpen(false)}>完成</button></span>}</span>;
}
