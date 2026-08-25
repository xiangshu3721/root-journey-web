import { useState } from 'react';
import { api } from '../lib/api';
import { createMaterial } from '../lib/demo';
import type { JourneyData } from '../types';

export function QuickRecord({ data }: { data: JourneyData }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  async function save() { if (!text.trim()) return; const material = createMaterial('mother', '生命故事', text.trim(), 'write'); await api.save({ ...data, materials: [material, ...data.materials] }); setText(''); setSaved(true); }
  return <section className="quick-record"><span>下一步最值得补充</span><h2>“母亲年轻时，最想要什么？”</h2><textarea value={text} onChange={(event) => { setText(event.target.value); setSaved(false); }} placeholder="直接写下你记得的故事、她说过的话，或你想进一步了解的部分…"/><div><small>{saved ? '已收进母亲的生命故事。' : '这段材料会收进母亲的「生命故事」档案。'}</small><button className="primary" onClick={() => void save()}>收进生命档案 <b>→</b></button></div></section>;
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
