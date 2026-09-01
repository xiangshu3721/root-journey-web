import type { BasicProfile, EvidenceType, FamilyPatternAssessment, Insight, JourneyData, Material, MaterialSubject, Person, PersonId } from '../types';
import { clearJourney, loadJourney, saveJourney } from './storage';

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
// 函数 URL 可以公开；DeepSeek Key 只存放在腾讯云函数的环境变量中。
const insightApiUrl = (import.meta.env.VITE_INSIGHT_API_URL as string | undefined)
  || 'https://1304965105-dxgfj5bl4i.ap-shanghai.tencentscf.com';

async function generateDeepInsight(question: string, materials: Material[], assessment?: FamilyPatternAssessment, people?: Record<PersonId, Person>, profile?: BasicProfile) {
  const response = await fetch(insightApiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question, materials, assessment, people, profile })
  });
  const result = await response.json() as { body?: string; sourceIds?: string[]; message?: string };
  if (!response.ok) throw new Error(result.message || '智能洞察暂时无法生成，请稍后再试。');
  if (!result.body) throw new Error('智能洞察未返回有效内容，请稍后再试。');
  return { body: result.body, sourceIds: result.sourceIds || [] };
}

export const api = {
  async load(): Promise<JourneyData | null> { return loadJourney(); },
  async save(data: JourneyData) { await saveJourney(data); },
  async clear() { await clearJourney(); },
  async interviewQuestion(_personId: PersonId, question: { text: string }, _materials: Material[]) { return question.text; },
  async familyQuestion(_materials: Material[]) { return familyQuestions[Math.floor(Math.random() * familyQuestions.length)]; },
  async structureMaterial(text: string, defaultSubject: PersonId) {
    const fallback: Array<{ personId: MaterialSubject; evidenceType: EvidenceType; text: string }> = [{ personId: defaultSubject, evidenceType: 'experience', text }];
    return fallback;
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
    const sections = availableSectionsByPerson[personId];
    const section = keywordGroups.find(([name, pattern]) => sections.includes(name) && pattern.test(text))?.[0] || sections[sections.length - 1] || '其他';
    return { personId, section, reason: `已归入「${labelsForPerson(personId)} · ${section}」，后续可手动调整。` };
  },
  async summarize(_personId: PersonId, _section: string, material: Material): Promise<Insight> { return { id: crypto.randomUUID(), kind: 'summary', status: 'rejected', sourceIds: [material.id], title: '暂未形成可确认理解', body: '' }; },
  async deepInsight(question: string, materials: Material[], assessment?: FamilyPatternAssessment, people?: Record<PersonId, Person>, profile?: BasicProfile): Promise<Insight> { const output = await generateDeepInsight(question, materials, assessment, people, profile); return { id: crypto.randomUUID(), kind: 'dilemma', status: 'confirmed', title: '从原生家庭视角的一次理解', ...output }; },
  async parentPortrait(_personId: PersonId, _materials: Material[], _feedback: Insight[] = []): Promise<{ sections: Record<string, string>; summary: string; extras: Record<string, string> } | null> { return null; },
  async dynamicInsights(_materials: Material[], _feedback: Insight[], _portraits: Insight[]) { return [] as Array<{ title: string; body: string }>; },
  async innerChat(_role: string, _message: string, _materials: Material[]) { return { reply: '我在这里。我们不急着给出答案，可以先看见此刻真正的感受和需要。' }; }
};
