import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { createMaterial } from '../lib/demo';
import type { JourneyData, PersonId } from '../types';

const people: { id: PersonId; archive: string }[] = [{ id: 'mother', archive: '母亲的「生命故事」' }, { id: 'father', archive: '父亲的「生命故事」' }, { id: 'self', archive: '自己的「成长故事」' }];
export function QuickRecord({ data }: { data: JourneyData }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [target, setTarget] = useState(() => people[Math.floor(Math.random() * people.length)]);
  const [question, setQuestion] = useState('正在为你生成一个问题…');
  useEffect(() => { let mounted = true; void api.interviewQuestion(target.id, target.id === 'self' ? '成长故事' : '生命故事', data.materials).then((next) => { if (mounted) setQuestion(next); }); return () => { mounted = false; }; }, []);
  async function save() { if (!text.trim()) return; const material = createMaterial(target.id, target.id === 'self' ? '成长故事' : '生命故事', text.trim(), 'write'); await api.save({ ...data, materials: [material, ...data.materials] }); setText(''); setSaved(true); }
  async function anotherQuestion() { const nextTarget = people[Math.floor(Math.random() * people.length)]; setTarget(nextTarget); setQuestion('正在为你生成另一个问题…'); setQuestion(await api.interviewQuestion(nextTarget.id, nextTarget.id === 'self' ? '成长故事' : '生命故事', data.materials)); }
  return <section className="quick-record"><span>下一步最值得补充 · AI 随机提问</span><h2>“{question}”</h2><button className="new-question" onClick={() => void anotherQuestion()}>换一个问题　↻</button><textarea value={text} onChange={(event) => { setText(event.target.value); setSaved(false); }} placeholder="直接写下你记得的故事、说过的话，或此刻浮现的感受…"/><div><small>{saved ? `已收进${target.archive}。` : `这段材料会收进${target.archive}。`}</small><button className="primary" onClick={() => void save()}>收进生命档案 <b>→</b></button></div></section>;
}

export function OneOnOneGuide({ data }: { data: JourneyData }) {
  const [qr, setQr] = useState(data.profile.wechatQr || '');
  function upload(file?: File) { if (!file || !file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = () => { const value = String(reader.result); setQr(value); void api.save({ ...data, profile: { ...data.profile, wechatQr: value } }); }; reader.readAsDataURL(file); }
  return <section className="one-on-one"><div><span>1v1 深度工作</span><h2>想找个人深入聊聊，<br/>进一步突破与升级？</h2><p>带着你的生命材料和关系模式图谱，进入更具体、更有支持的工作。</p></div><label className="qr-slot">{qr ? <img src={qr} alt="微信联系二维码"/> : <><b>微信二维码</b><small>上传后，用户可扫码联系</small></>}<input type="file" accept="image/*" onChange={(event) => upload(event.target.files?.[0])}/></label></section>;
}

const articles = [
  'https://mp.weixin.qq.com/s/IdbUghXZWuoL4-D0IjkG5Q',
  'https://mp.weixin.qq.com/s/Vtz5f9qsY_HttxyCbLsOZw',
  'https://mp.weixin.qq.com/s/jiWQSdOkHvDpq-fMpyiBuA'
];
export function JuesuGuide() { return <section className="juesu-guide"><div><span>觉塑 · 延伸阅读</span><h2>继续理解，也继续生长。</h2><p>从更多真实的生命议题里，找到适合自己此刻的视角。</p></div><div className="article-links">{articles.map((url, index) => <a href={url} target="_blank" rel="noreferrer" key={url}><small>公众号文章 0{index + 1}</small><b>阅读觉塑内容　›</b></a>)}</div></section>; }
