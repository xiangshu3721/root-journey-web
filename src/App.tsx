import { useEffect, useState } from 'react';
import { AssessmentResult, FamilyPatternTest } from './components/FamilyPatternTest';
import { ParentArchive } from './components/ParentArchive';
import { api } from './lib/api';
import { freshJourney } from './lib/demo';
import type { FamilyPatternAssessment, Insight, JourneyData, View } from './types';
import wechatQr from './assets/wechat-qr.jpg';

const nav: Array<[View, string, string]> = [['home', '首页', '⌂'], ['parents', '父母档案', '◫'], ['dilemma', '困惑洞察', '◌']];

export default function App() {
  const [data, setData] = useState<JourneyData>(freshJourney());
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>('assessment');
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('root-journey-theme') === 'dark' ? 'dark' : 'light');

  useEffect(() => { void api.load().then((saved) => { if (saved) { const base = freshJourney(); const next = { ...base, ...saved, people: { father: { ...base.people.father, ...saved.people?.father }, mother: { ...base.people.mother, ...saved.people?.mother } }, materials: saved.materials || [], insights: saved.insights || [] }; setData(next); setView(next.familyAssessment ? 'home' : 'assessment'); } setReady(true); }); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('root-journey-theme', theme); }, [theme]);
  async function persist(next: JourneyData) { setData(next); await api.save(next); }
  function toast(message: string) { setNotice(message); window.setTimeout(() => setNotice(''), 2600); }
  async function saveAssessment(assessment: FamilyPatternAssessment) {
    const openEntries = Object.entries(assessment.openAnswers || {}).filter(([, text]) => text.trim());
    const materials = [...data.materials];
    for (const [section, text] of openEntries) {
      const raw = { id: crypto.randomUUID(), personId: 'family' as const, section: `测试开放线索 · ${section}`, text: text.trim(), source: 'write' as const, createdAt: new Date().toISOString(), evidenceType: 'raw' as const, isRaw: true };
      const segments = await api.structureMaterial(raw.text, 'mother');
      materials.unshift(raw, ...segments.map((segment) => ({ id: crypto.randomUUID(), personId: segment.personId, section: `测试开放线索 · ${section}`, text: segment.text, source: 'write' as const, createdAt: raw.createdAt, evidenceType: segment.evidenceType, rawEntryId: raw.id })));
    }
    await persist({ ...data, familyAssessment: assessment, materials });
    toast('测试结果已保存在这台设备。');
  }
  async function clearAll() { if (!window.confirm('确定清除这台设备上的全部测试、档案和洞察吗？此操作无法恢复。')) return; await api.clear(); setData(freshJourney()); setView('assessment'); toast('本机资料已清除。'); }

  if (!ready) return <div className="assessment-shell"><Brand /><p className="loading-copy">正在读取这台设备上的资料…</p></div>;
  if (!data.familyAssessment) return <div className="assessment-shell"><Brand /><FamilyPatternTest onComplete={(assessment) => void saveAssessment(assessment)} onContinueParents={() => setView('parents')} /></div>;
  return <div className="app-shell dashboard-shell"><aside><Brand /><nav>{nav.map(([key, title, icon]) => <button key={key} className={view === key ? 'selected' : ''} onClick={() => setView(key)}><i>{icon}</i>{title}</button>)}</nav><button className="device-clear" onClick={() => void clearAll()}>清除本机资料</button><button className="theme-toggle" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>{theme === 'dark' ? '切换日间' : '切换夜间'}</button></aside><main>{view === 'home' && <Home data={data} setView={setView} />} {view === 'parents' && <ParentArchive data={data} persist={persist} toast={toast} />} {view === 'dilemma' && <DilemmaInsight data={data} persist={persist} toast={toast} />} {view === 'assessment' && <section className="page"><FamilyPatternTest assessment={data.familyAssessment} onComplete={(assessment) => void saveAssessment(assessment)} onContinueParents={() => setView('parents')} /></section>}</main>{notice && <div className="toast">{notice}</div>}<div className="mobile-nav">{nav.map(([key, title, icon]) => <button key={key} className={view === key ? 'selected' : ''} onClick={() => setView(key)}><i>{icon}</i>{title}</button>)}</div></div>;
}

function Brand() { return <div className="brand"><b>寻根之旅</b><span>原生家庭考古</span></div>; }

function Home({ data, setView }: { data: JourneyData; setView: (view: View) => void }) {
  const assessment = data.familyAssessment!;
  return <div className="page mvp-home"><div className="home-breadcrumb">寻根之旅 · 原生家庭考古</div><section className="home-flow"><span>探索路径</span><div><b>01</b>关系模式测试<i /></div><div><b>02</b>记录父母故事<i /></div><div><b>03</b>获得困惑洞察</div></section><section className="home-assessment-full"><AssessmentResult assessment={assessment} onRestart={() => setView('assessment')} /></section><section className="parent-discovery"><div><span>追本溯源</span><h2>想更了解这些模式<br />是怎样形成的吗？</h2><p>从父亲与母亲的真实故事开始，慢慢看见他们如何成为今天的他们，也看见这些经历如何进入你的生命。</p></div><button className="primary" onClick={() => setView('parents')}>去探索父母 <b>→</b></button></section><section className="one-on-one-mvp"><div><span>1v1 深度咨询</span><h2>如果你想有人陪你<br />把这些关系再往深处走。</h2><p>扫码添加微信，预约 1v1 咨询。</p></div><img src={wechatQr} alt="1v1 咨询微信二维码" /></section><p className="local-note">当前资料仅保存在这台设备的浏览器中。更换设备、浏览器或清除浏览器数据后，资料可能无法恢复。</p></div>;
}

function DilemmaInsight({ data, persist, toast }: { data: JourneyData; persist: (next: JourneyData) => Promise<void>; toast: (message: string) => void }) {
  const [question, setQuestion] = useState(''); const [loading, setLoading] = useState(false); const results = data.insights.filter((item) => item.kind === 'dilemma');
  async function generate() { if (!question.trim()) return; setLoading(true); try { const output = await api.deepInsight(question.trim(), data.materials, data.familyAssessment); const next: Insight = { ...output, id: crypto.randomUUID(), kind: 'dilemma', status: 'confirmed', title: question.trim(), sourceIds: output.sourceIds || [] }; await persist({ ...data, insights: [next, ...data.insights] }); setQuestion(''); } catch { toast('暂时无法生成洞察，请稍后再试。'); } finally { setLoading(false); } }
  return <div className="page dilemma-page"><span className="eyebrow">困惑洞察</span><h1>把现在的困惑，<br />放回真实的故事里理解。</h1><p className="page-copy">系统会优先使用与你的问题相关的父亲、母亲材料和测试结果；材料较少时，也会清楚标出不确定的部分。</p><section className="dilemma"><label>我此刻最想弄明白的事<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：为什么别人一否定我，我就特别难受？" /></label><button className="primary" disabled={loading || !question.trim()} onClick={() => void generate()}>{loading ? '正在整理…' : '生成困惑洞察'} <b>→</b></button></section>{results.length ? <section className="dilemma-history"><h2>历史洞察</h2>{results.map((item) => <article key={item.id}><span>{new Date().toLocaleDateString('zh-CN')}</span><h3>{item.title}</h3><p>{item.body}</p>{item.sourceIds.length > 0 && <details><summary>查看本次引用的材料</summary>{data.materials.filter((material) => item.sourceIds.includes(material.id)).map((material) => <p key={material.id}>· {material.text}</p>)}</details>}</article>)}</section> : <p className="empty-copy">写下一个正在困扰你的真实问题，第一份个性化洞察会保留在这台设备上。</p>}</div>;
}
