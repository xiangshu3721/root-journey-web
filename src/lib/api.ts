import type { Insight, JourneyData, Material, PersonId } from '../types';
import { cloudbaseAuth, cloudbaseConfigured } from './cloudbase';
const KEY = 'root-journey-demo-v1';
const baseUrl = import.meta.env.VITE_CLOUDBASE_FUNCTION_URL as string | undefined;
const demo = import.meta.env.VITE_DEMO_MODE !== 'false';
const fallbackQuestions: Record<PersonId, string[]> = {
  mother: ['如果从母亲的童年开始讲起，你最想先了解她与谁的关系？', '你记得母亲年轻时最想拥有、却未必得到的是什么吗？', '在你印象里，母亲如何表达爱、担心或不满？', '母亲承担过哪些不该由她一个人承担的责任？'],
  father: ['你记得父亲小时候的家庭、父母或兄弟姐妹是什么样的吗？', '父亲年轻时最想要的生活是什么？他后来得到或失去了什么？', '当父亲压力很大时，他通常会怎么做？', '你最早从父亲身上学会了什么关于责任的事？']
};
const familyQuestions = [
  '回想一个三个人都在场的家庭片段：当时每个人在做什么、感受什么？',
  '在你的家里，谁最常承担责任？谁的需要最容易被忽略？',
  '父母发生分歧或有压力时，你通常会怎么做？',
  '你从父亲和母亲身上，分别学会了什么关于爱、责任或成功的事？',
  '如果把家庭比作一个小系统，你觉得自己过去扮演了什么角色？'
];
let verificationInfo: { verification_id: string; is_user: boolean } | undefined;
let verifiedPhone = '';
const labelsForPerson = (personId: PersonId) => personId === 'mother' ? '母亲' : '父亲';
const normalizePhone = (phone: string) => phone.startsWith('+86') ? phone : `+86 ${phone.replace(/\D/g, '')}`;
async function call<T>(path: string, payload: unknown): Promise<T> { if (!cloudbaseConfigured || !baseUrl) throw new Error('CloudBase 服务尚未配置'); const res = await fetch(`${baseUrl}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!res.ok) throw new Error('服务暂时不可用'); return res.json() as Promise<T>; }
export const api = {
  async sendCode(phone: string) { if (demo) return; if (cloudbaseAuth) { verifiedPhone = normalizePhone(phone); verificationInfo = await cloudbaseAuth.getVerification({ phone_number: verifiedPhone }); return; } if (!baseUrl) return; await call('auth/send-code', { phone }); },
  async verifyCode(phone: string, code: string) { if (demo) { if (code !== '123456') throw new Error('演示环境验证码为 123456'); return { token: 'demo', phone }; } if (cloudbaseAuth) { if (!verificationInfo) throw new Error('请先获取验证码'); const normalized = normalizePhone(phone); if (normalized !== verifiedPhone) throw new Error('手机号已变更，请重新获取验证码'); await cloudbaseAuth.signInWithSms({ verificationInfo, verificationCode: code, phoneNum: normalized }); return { token: (await cloudbaseAuth.getAccessToken()).accessToken, phone: normalized }; } return call<{ token: string; phone: string }>('auth/verify-code', { phone, code }); },
  async logout() { if (!demo && cloudbaseAuth) await cloudbaseAuth.signOut(); },
  async load(): Promise<JourneyData | null> { if (!demo && baseUrl) return call<JourneyData>('journey/load', {}); const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as JourneyData : null; },
  async save(data: JourneyData) { if (!demo && baseUrl) return call('journey/save', data); localStorage.setItem(KEY, JSON.stringify(data)); },
  async interviewQuestion(personId: PersonId, section: string, materials: Material[]) { const fallback = fallbackQuestions[personId][Math.floor(Math.random() * fallbackQuestions[personId].length)]; if (!baseUrl) return fallback; try { const result = await call<{ question: string }>('ai/interview-question', { personId, section, materials: materials.slice(0, 6), fallback }); return result.question || fallback; } catch { return fallback; } },
  async familyQuestion(materials: Material[]) {
    const fallback = familyQuestions[Math.floor(Math.random() * familyQuestions.length)];
    if (!baseUrl) return fallback;
    try {
      const result = await call<{ question: string }>('ai/interview-question', { personId: 'family', section: '家庭自由录入（母亲、父亲与我自己）', materials: materials.slice(0, 10), fallback });
      return result.question || fallback;
    } catch { return fallback; }
  },
  async classifyMaterial(text: string, availableSectionsByPerson: Record<PersonId, string[]>) {
    const keywordGroups: Array<[string, RegExp]> = [
      ['家庭系统', /外婆|外公|爷爷|奶奶|祖辈|兄弟|姐妹|家里|父母|家庭/],
      ['生命故事', /小时候|童年|上学|毕业|结婚|离婚|工作|转折|年轻/],
      ['成长故事', /成长|青春期|小时候|那一年|后来/],
      ['教育经历', /学校|老师|上学|成绩|考试|大学|读书/],
      ['社会与工作经历', /工作|公司|职业|同事|老板|创业|收入/],
      ['性格特质', /性格|脾气|敏感|坚强|内向|外向|习惯/],
      ['优势与资源', /擅长|能力|优点|努力|资源|厉害/],
      ['局限与代价', /害怕|压抑|讨好|控制|焦虑|缺点|委屈/],
      ['价值观与三观', /认为|觉得|重要|应该|成功|金钱|责任/],
      ['生存方式', /压力|冲突|责任|爱|逃避|忍耐|保护/],
      ['关系与生存方式', /关系|亲密|朋友|伴侣|冲突|沟通/],
      ['我与原生家庭', /影响我|现在的我|原生家庭|我因此|我学会/],
      ['当前困惑与成长课题', /困惑|问题|改变|突破|不知道怎么办/],
      ['对我的影响', /影响我|现在|关系|工作|自我评价/]
    ];
    const personId: PersonId = /父亲|爸爸|父爱/.test(text) ? 'father' : 'mother';
    const availableSections = availableSectionsByPerson[personId];
    const fallback = keywordGroups.find(([section, pattern]) => availableSections.includes(section) && pattern.test(text))?.[0] || availableSections[availableSections.length - 1] || '其他';
    if (!baseUrl) return { personId, section: fallback, reason: `系统暂时归入「${labelsForPerson(personId)} · ${fallback}」，后续会随着更多材料持续校正。` };
    try {
      const result = await call<{ personId?: PersonId; section?: string; reason?: string }>('ai/classify-material', { text, sectionsByPerson: availableSectionsByPerson });
      const classifiedPerson = result.personId && availableSectionsByPerson[result.personId] ? result.personId : personId;
      const classifiedSections = availableSectionsByPerson[classifiedPerson];
      const section = result.section && classifiedSections.includes(result.section) ? result.section : classifiedSections[classifiedSections.length - 1] || fallback;
      return { personId: classifiedPerson, section, reason: result.reason || `系统暂时归入「${labelsForPerson(classifiedPerson)} · ${section}」，后续会随着更多材料持续校正。` };
    } catch {
      return { personId, section: fallback, reason: `系统暂时归入「${labelsForPerson(personId)} · ${fallback}」，后续会随着更多材料持续校正。` };
    }
  },
  async summarize(personId: PersonId, section: string, material: Material): Promise<Insight> { if (baseUrl) { try { return await call('ai/cheap-summary', { personId, section, material }); } catch { /* 演示环境保留本地回退 */ } } return { id: crypto.randomUUID(), kind: 'summary', status: 'pending', sourceIds: [material.id], title: '一段待你确认的理解', body: `从这段关于${personId === 'father' ? '父亲' : personId === 'mother' ? '母亲' : '自己'}的材料里，我暂时看到一种为了适应环境而形成的方式。它值得继续被补充和核对，而不是被匆忙定义。` }; },
  async deepInsight(question: string, materials: Material[]): Promise<Insight> { if (baseUrl) { try { return await call('ai/deep-insight', { question, materials }); } catch { /* 演示环境保留本地回退 */ } } return { id: crypto.randomUUID(), kind: 'dilemma', status: 'pending', sourceIds: materials.slice(0, 3).map((m) => m.id), title: '从原生家庭视角的一种可能理解', body: `关于“${question}”，目前材料提示：你可能很早学会先关注他人的期待与情绪。这不是定论；请根据自己的真实经验核对它是否成立。` }; },
  async parentPortrait(personId: PersonId, materials: Material[]) {
    if (!baseUrl) return null;
    try { return await call<{ sections?: Record<string, string> }>('ai/parent-portrait', { personId, materials }); } catch { return null; }
  },
  async systemHypothesis(materials: Material[]): Promise<Insight> { if (baseUrl) { try { return await call('ai/system-hypothesis', { materials }); } catch { /* 演示环境保留本地回退 */ } } return { id: crypto.randomUUID(), kind: 'hypothesis', status: 'pending', sourceIds: materials.slice(0, 3).map((m) => m.id), title: '一条待验证的影响链', body: '家庭中关于责任、期待与情绪表达的方式，可能让你更早学会关注他人的需要。这只是一个等待你核对的理解。' }; },
  async innerChat(role: string, message: string, materials: Material[]) { if (baseUrl) { try { return await call<{ reply: string }>('ai/inner-chat', { role, message, materials: materials.slice(0, 8) }); } catch { /* 演示环境保留本地回退 */ } } return { reply: '我在这里。我们不急着给出答案，可以先看见此刻真正的感受和需要。' }; }
};
