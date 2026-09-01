import { type ReactNode, useEffect, useState } from 'react';
import { AssessmentResult, FamilyPatternTest } from './components/FamilyPatternTest';
import { ParentArchive } from './components/ParentArchive';
import { api } from './lib/api';
import { freshJourney } from './lib/demo';
import type { FamilyPatternAssessment, Insight, JourneyData, View } from './types';
import wechatQr from './assets/wechat-qr.jpg';

const nav: Array<[View, string, string]> = [['home', '首页', '⌂'], ['parents', '父母档案', '◫'], ['dilemma', '困惑洞察', '◌']];
const INSIGHTS_PER_PAGE = 4;

function highlightInsightText(text: string, keyword: string) {
  if (!keyword) return text;
  const parts: ReactNode[] = [];
  const normalizedText = text.toLocaleLowerCase();
  const normalizedKeyword = keyword.toLocaleLowerCase();
  let cursor = 0;
  let matchAt = normalizedText.indexOf(normalizedKeyword, cursor);
  while (matchAt !== -1) {
    if (matchAt > cursor) parts.push(text.slice(cursor, matchAt));
    parts.push(<mark key={`${matchAt}-${cursor}`}>{text.slice(matchAt, matchAt + keyword.length)}</mark>);
    cursor = matchAt + keyword.length;
    matchAt = normalizedText.indexOf(normalizedKeyword, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export default function App() {
  const [data, setData] = useState<JourneyData>(freshJourney());
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>('assessment');
  const [retest, setRetest] = useState(false);
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
  return <div className="app-shell dashboard-shell"><aside><Brand /><nav>{nav.map(([key, title, icon]) => <button key={key} className={view === key ? 'selected' : ''} onClick={() => setView(key)}><i>{icon}</i>{title}</button>)}</nav><button className="device-clear" onClick={() => void clearAll()}>清除本机资料</button><button className="theme-toggle" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>{theme === 'dark' ? '切换日间' : '切换夜间'}</button></aside><main>{view === 'home' && <Home data={data} setView={setView} onRestart={() => { setRetest(true); setView('assessment'); }} />} {view === 'parents' && <ParentArchive data={data} persist={persist} toast={toast} />} {view === 'dilemma' && <DilemmaInsight data={data} persist={persist} toast={toast} />} {view === 'assessment' && <section className="page"><FamilyPatternTest assessment={retest ? undefined : data.familyAssessment} startAtTest={retest} onComplete={(assessment) => { setRetest(false); void saveAssessment(assessment); }} onContinueParents={() => setView('parents')} /></section>}</main>{notice && <div className="toast">{notice}</div>}<div className="mobile-nav">{nav.map(([key, title, icon]) => <button key={key} className={view === key ? 'selected' : ''} onClick={() => setView(key)}><i>{icon}</i>{title}</button>)}</div></div>;
}

function Brand() { return <div className="brand"><b>寻根之旅</b><span>原生家庭考古</span></div>; }

function Home({ data, setView, onRestart }: { data: JourneyData; setView: (view: View) => void; onRestart: () => void }) {
  const assessment = data.familyAssessment!;
  return <div className="page mvp-home"><div className="home-breadcrumb">寻根之旅 · 原生家庭考古</div><section className="home-flow"><span>探索路径</span><div><b>01</b>关系模式测试<i /></div><div><b>02</b>记录父母故事<i /></div><div><b>03</b>获得困惑洞察</div></section><section className="home-assessment-full"><AssessmentResult assessment={assessment} onRestart={onRestart} /></section><section className="parent-discovery"><div><span>追本溯源</span><h2>想更了解这些模式<br />是怎样形成的吗？</h2><p>从父亲与母亲的真实故事开始，慢慢看见他们如何成为今天的他们，也看见这些经历如何进入你的生命。</p></div><button className="primary" onClick={() => setView('parents')}>去探索父母 <b>→</b></button></section><section className="one-on-one-mvp"><div><span>1v1 深度咨询</span><h2>如果你想有人陪你<br />把这些关系再往深处走。</h2><p>扫码添加微信，预约 1v1 咨询。</p></div><img src={wechatQr} alt="1v1 咨询微信二维码" /></section><p className="local-note">当前资料仅保存在这台设备的浏览器中。更换设备、浏览器或清除浏览器数据后，资料可能无法恢复。</p></div>;
}

function DilemmaInsight({ data, persist, toast }: { data: JourneyData; persist: (next: JourneyData) => Promise<void>; toast: (message: string) => void }) {
  const [question, setQuestion] = useState(''); const [loading, setLoading] = useState(false); const [historySearch, setHistorySearch] = useState(''); const [historyPage, setHistoryPage] = useState(1); const [expandedInsightIds, setExpandedInsightIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const insights = data.insights.filter((item) => !(item.kind === 'dilemma' && item.title === '一次时空洞察'));
    if (insights.length !== data.insights.length) void persist({ ...data, insights });
  }, [data, persist]);
  const results = data.insights.filter((item) => item.kind === 'dilemma' && item.title !== '一次时空洞察');
  const normalizedSearch = historySearch.trim().toLocaleLowerCase();
  const matchedResults = results.filter((item) => !normalizedSearch || `${item.title}\n${item.body}`.toLocaleLowerCase().includes(normalizedSearch));
  const totalPages = Math.max(1, Math.ceil(matchedResults.length / INSIGHTS_PER_PAGE));
  const currentPage = Math.min(historyPage, totalPages);
  const pageResults = matchedResults.slice((currentPage - 1) * INSIGHTS_PER_PAGE, currentPage * INSIGHTS_PER_PAGE);
  function updateHistorySearch(value: string) { setHistorySearch(value); setHistoryPage(1); }
  function toggleInsight(itemId: string) { setExpandedInsightIds((current) => { const next = new Set(current); if (next.has(itemId)) next.delete(itemId); else next.add(itemId); return next; }); }
  async function generate() { if (!question.trim()) return; setLoading(true); try { const output = await api.deepInsight(question.trim(), data.materials, data.familyAssessment, data.people, data.profile); const next: Insight = { ...output, id: crypto.randomUUID(), kind: 'dilemma', status: 'confirmed', title: question.trim(), sourceIds: output.sourceIds || [] }; await persist({ ...data, insights: [next, ...data.insights] }); setQuestion(''); setHistoryPage(1); } catch (error) { toast(error instanceof Error ? error.message : '暂时无法生成洞察，请稍后再试。'); } finally { setLoading(false); } }
  return <div className="page dilemma-page"><span className="eyebrow">困惑洞察</span><h1>回归源头，去理解&洞察你当下的困惑</h1><p className="page-copy">你提供的父母资料越详细，答案越有洞见。</p><section className="dilemma"><label>从原生家庭去洞察<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：为什么别人一否定我，我就特别难受？" /></label><button className="primary" disabled={loading || !question.trim()} onClick={() => void generate()}>{loading ? '正在整理…' : '从原生家庭去洞察'} <b>→</b></button></section>{results.length ? <section className="dilemma-history"><div className="dilemma-history-head"><h2>历史洞察</h2><label className="insight-search"><input aria-label="搜索历史洞察" value={historySearch} onChange={(event) => updateHistorySearch(event.target.value)} placeholder="搜索问题或答案关键词" /></label></div><p className="insight-result-count">{normalizedSearch ? `找到 ${matchedResults.length} 条相关洞察` : `共 ${matchedResults.length} 条洞察`}</p>{pageResults.length ? pageResults.map((item) => { const isLong = item.body.length > 520; const expanded = expandedInsightIds.has(item.id) || Boolean(normalizedSearch); return <article key={item.id}><section className="insight-question"><span>你的问题</span><h3>{highlightInsightText(item.title, historySearch.trim())}</h3></section><section className="insight-answer"><span>智能洞察</span><p className={isLong && !expanded ? 'is-collapsed' : ''}>{highlightInsightText(item.body, historySearch.trim())}</p>{isLong && <button className="text-button insight-toggle" onClick={() => toggleInsight(item.id)}>{expanded ? '收起洞察' : '展开完整洞察'} <b>{expanded ? '↑' : '↓'}</b></button>}</section></article>; }) : <p className="history-empty">没有找到相关的历史洞察，试试更短的关键词。</p>}{totalPages > 1 && <nav className="insight-pagination" aria-label="历史洞察分页"><button disabled={currentPage === 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}>上一页</button><span>第 {currentPage} / {totalPages} 页</span><button disabled={currentPage === totalPages} onClick={() => setHistoryPage((page) => Math.min(totalPages, page + 1))}>下一页</button></nav>}</section> : <p className="empty-copy">写下一个正在困扰你的真实问题，第一份个性化洞察会保留在这台设备上。</p>}</div>;
}
