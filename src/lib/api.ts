import type { EvidenceType, FamilyPatternAssessment, Insight, JourneyData, Material, MaterialSubject, PersonId } from '../types';
import { clearJourney, loadJourney, saveJourney } from './storage';
const baseUrl = import.meta.env.VITE_CLOUDBASE_FUNCTION_URL as string | undefined;
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
const labelsForPerson = (personId: PersonId) => personId === 'mother' ? '母亲' : '父亲';
async function call<T>(path: string, payload: unknown): Promise<T> { if (!baseUrl) throw new Error('CloudBase 服务尚未配置'); const res = await fetch(`${baseUrl}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) }); if (!res.ok) throw new Error('服务暂时不可用'); return res.json() as Promise<T>; }
export const api = {
  async load(): Promise<JourneyData | null> { return loadJourney(); },
  async save(data: JourneyData) { await saveJourney(data); },
  async clear() { await clearJourney(); },
  async interviewQuestion(personId: PersonId, section: string, materials: Material[]) { const fallback = fallbackQuestions[personId][Math.floor(Math.random() * fallbackQuestions[personId].length)]; if (!baseUrl) return fallback; try { const result = await call<{ question: string }>('ai/interview-question', { personId, section, materials: materials.slice(0, 6), fallback }); return result.question || fallback; } catch { return fallback; } },
  async familyQuestion(materials: Material[]) {
    const fallback = familyQuestions[Math.floor(Math.random() * familyQuestions.length)];
    if (!baseUrl) return fallback;
    try {
      const result = await call<{ question: string }>('ai/interview-question', { personId: 'family', section: '家庭自由录入（母亲、父亲与我自己）', materials: materials.slice(0, 10), fallback });
      return result.question || fallback;
    } catch { return fallback; }
  },
  async structureMaterial(text: string, defaultSubject: PersonId) {
    type Segment = { personId: MaterialSubject; evidenceType: EvidenceType; text: string };
    const fallback: Segment[] = [{ personId: defaultSubject, evidenceType: 'experience', text }];
    if (!baseUrl) return fallback;
    try {
      const result = await call<{ segments?: Array<Partial<Segment>> }>('ai/structure-material', { text, defaultSubject });
      const allowedSubjects: MaterialSubject[] = ['mother', 'father', 'self', 'family'];
      const allowedEvidence: EvidenceType[] = ['fact', 'experience', 'interpretation', 'hypothesis'];
      const segments = (result.segments || []).map((item) => ({
        personId: allowedSubjects.includes(item.personId as MaterialSubject) ? item.personId as MaterialSubject : defaultSubject,
        evidenceType: allowedEvidence.includes(item.evidenceType as EvidenceType) ? item.evidenceType as EvidenceType : 'experience' as EvidenceType,
        text: typeof item.text === 'string' ? item.text.trim() : ''
      })).filter((item) => item.text.length >= 6 && item.text.length <= 360);
      return segments.length ? segments : fallback;
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
  async summarize(personId: PersonId, section: string, material: Material): Promise<Insight> { if (baseUrl) { try { return await call('ai/cheap-summary', { personId, section, material }); } catch { /* 不用模板内容冒充洞见 */ } } return { id: crypto.randomUUID(), kind: 'summary', status: 'rejected', sourceIds: [material.id], title: '暂未形成可确认理解', body: '' }; },
  async deepInsight(question: string, materials: Material[], assessment?: FamilyPatternAssessment): Promise<Insight> { if (baseUrl) { try { return await call('ai/deep-insight', { question, materials: materials.filter((item) => !item.isRaw).slice(0, 24), assessment }); } catch { /* 本地回退只在服务不可用时使用 */ } } return { id: crypto.randomUUID(), kind: 'dilemma', status: 'confirmed', sourceIds: materials.filter((item) => !item.isRaw).slice(0, 3).map((m) => m.id), title: '从原生家庭视角的一种可能理解', body: `你正在面对“${question}”。目前还没有足够的父母材料形成具体连接；可以先记录一次父亲或母亲在类似情境中的真实回应，再回来看看其中是否有重复的关系经验。` }; },
  async parentPortrait(personId: PersonId, materials: Material[], feedback: Insight[] = []) {
    if (!baseUrl) return null;
    try {
      const result = await call<{ sections?: Record<string, string>; summary?: string; extras?: Record<string, string> }>('ai/parent-portrait', { personId, materials, feedback: feedback.map(({ title, body, status, sourceIds }) => ({ title, body, status, sourceIds })) });
      return Object.keys(result.sections || {}).length ? result : null;
    } catch (error) { console.warn('portrait request failed', error); return null; }
  },
  async dynamicInsights(materials: Material[], feedback: Insight[], portraits: Insight[]) {
    if (!baseUrl) return [] as Array<{ title: string; body: string }>;
    try {
      const result = await call<{ insights?: Array<{ title?: string; body?: string }> }>('ai/dynamic-insights', {
        materials,
        feedback: feedback.map(({ title, body, status, sourceIds }) => ({ title, body, status, sourceIds })),
        portraits: portraits.map(({ title, portraitSections, sourceIds }) => ({ title, portraitSections, sourceIds }))
      });
      return (result.insights || []).filter((item) => typeof item.title === 'string' && typeof item.body === 'string') as Array<{ title: string; body: string }>;
    } catch (error) { console.warn('dynamic insight request failed', error); return []; }
  },
  async innerChat(role: string, message: string, materials: Material[]) { if (baseUrl) { try { return await call<{ reply: string }>('ai/inner-chat', { role, message, materials: materials.slice(0, 8) }); } catch { /* 演示环境保留本地回退 */ } } return { reply: '我在这里。我们不急着给出答案，可以先看见此刻真正的感受和需要。' }; }
};
