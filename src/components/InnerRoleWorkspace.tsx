import { FormEvent, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { InnerChatMessage, InnerRole, JourneyData } from '../types';

type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null; };
type RecognitionConstructor = new () => Recognition;

export function InnerRoleWorkspace({ data, persist, toast }: { data: JourneyData; persist: (next: JourneyData) => Promise<void>; toast: (message: string) => void }) {
  const [activeId, setActiveId] = useState<InnerRole['id']>('innerMother');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const active = data.innerRoles.find((role) => role.id === activeId) || data.innerRoles[0];
  const history = (data.innerChats || []).filter((item) => item.roleId === active.id);

  function editRole() {
    const name = prompt('角色昵称', active.name)?.trim();
    const avatar = prompt('角色头像文字', active.avatar)?.trim();
    if (!name || !avatar) return;
    void persist({ ...data, innerRoles: data.innerRoles.map((role) => role.id === active.id ? { ...role, name, avatar: avatar.slice(0, 2) } : role) });
    toast('角色基本信息已更新');
  }

  async function send(event?: FormEvent, source: InnerChatMessage['source'] = 'text') {
    event?.preventDefault();
    const content = message.trim();
    if (!content || sending) return;
    const mine: InnerChatMessage = { id: crypto.randomUUID(), roleId: active.id, author: 'user', text: content, source, createdAt: new Date().toISOString() };
    const withMine = { ...data, innerChats: [...(data.innerChats || []), mine] };
    setMessage('');
    setSending(true);
    await persist(withMine);
    try {
      const reply = await api.innerChat(active.name, content, data.materials);
      const theirs: InnerChatMessage = { id: crypto.randomUUID(), roleId: active.id, author: 'role', text: reply.reply, source: 'text', createdAt: new Date().toISOString() };
      await persist({ ...withMine, innerChats: [...(withMine.innerChats || []), theirs] });
    } catch {
      toast('暂时无法回应，请稍后再试。');
    } finally {
      setSending(false);
    }
  }

  function startVoice() {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast('当前浏览器暂不支持语音转写，请使用文本输入。'); return; }
    const instance = new SpeechRecognition();
    recognition.current = instance;
    instance.lang = 'zh-CN';
    instance.continuous = false;
    instance.interimResults = false;
    instance.onresult = (event) => { setMessage(Array.from(event.results).map((result: any) => result[0]?.transcript || '').join('').trim()); };
    instance.onerror = () => { toast('语音识别未完成，请再试一次。'); setListening(false); };
    instance.onend = () => setListening(false);
    setListening(true);
    instance.start();
  }

  return <div className="page inner-workspace">
    <span className="eyebrow">我的内在角色</span>
    <h1>和一直都在的<br />自己，好好说话。</h1>
    <p className="page-copy">这些角色来自你的生命材料，是陪伴与探索的视角，不代表现实父母的真实想法。</p>
    <div className="role-tabs" role="tablist" aria-label="内在角色">{data.innerRoles.map((role) => <button key={role.id} role="tab" aria-selected={active.id === role.id} className={active.id === role.id ? 'selected' : ''} onClick={() => setActiveId(role.id)}><i>{role.avatar}</i><span>{role.name}</span></button>)}</div>
    <section className="role-profile">
      <i>{active.avatar}</i><div><span>当前陪伴者</span><h2>{active.name}</h2><p>{active.trait}</p><small>基于：{active.basedOn.map((person) => person === 'mother' ? '母亲' : person === 'father' ? '父亲' : '我自己').join('、')}的生命材料</small></div><button className="text-button" onClick={editRole}>编辑角色信息</button>
    </section>
    <section className="role-chat" aria-live="polite">
      <header><div><span>{active.name}的对话</span><small>历史记录会保存在你的生命档案中</small></div><b>{history.length} 条对话</b></header>
      <div className="chat-history">{history.length ? history.map((item) => <article key={item.id} className={item.author === 'user' ? 'mine' : 'role'}><small>{item.author === 'user' ? '我' : active.name}{item.source === 'voice' ? ' · 语音转写' : ''}</small><p>{item.text}</p></article>) : <article className="role"><small>{active.name}</small><p>我在这里。此刻，你最想让我陪你一起看见什么？</p></article>}{sending && <article className="role waiting"><small>{active.name}</small><p>正在认真听你说…</p></article>}</div>
      <form className="chat-composer" onSubmit={(event) => void send(event)}><button type="button" className={listening ? 'voice-button listening' : 'voice-button'} onClick={startVoice} aria-label="语音输入">{listening ? '●' : '麦'}</button><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={listening ? '请开始说话…' : `对${active.name}说点什么…`} /><button className="primary" disabled={!message.trim() || sending}>发送 <b>→</b></button></form>
      <small className="voice-hint">支持文本输入；点击“麦”可将语音转成文字，再确认发送。</small>
    </section>
  </div>;
}
