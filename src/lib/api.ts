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
const deepseekApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined;
const deepseekApiUrl = (import.meta.env.VITE_DEEPSEEK_API_URL as string | undefined) || 'https://api.deepseek.com/chat/completions';
const deepseekModel = (import.meta.env.VITE_DEEPSEEK_MODEL as string | undefined) || 'deepseek-chat';

const shortText = (value: string, limit = 700) => value.trim().slice(0, limit);
const parentContext = (person: Person) => ({
  name: shortText(person.name, 80), nickname: shortText(person.nickname, 80), birthDate: shortText(person.birthDate, 40), birthplace: shortText(person.birthplace, 120), growthPlace: shortText(person.growthPlace, 120), education: shortText(person.education, 180), work: shortText(person.work, 180), marriage: shortText(person.marriage, 220), wealth: shortText(person.wealth, 180), majorIllness: shortText(person.majorIllness, 180), setbacks: shortText(person.setbacks, 500), lifeEvents: shortText(person.lifeEvents, 700), keyInteractions: shortText(person.keyInteractions, 700)
});

async function generateDeepInsight(question: string, materials: Material[], assessment?: FamilyPatternAssessment, people?: Record<PersonId, Person>, profile?: BasicProfile) {
  if (!deepseekApiKey) throw new Error('请先配置本机 DeepSeek API，再生成智能洞察。');
  const sourceMaterials = materials.filter((item) => !item.isRaw).slice(0, 60).map(({ id, personId, section, text, evidenceType }) => ({ id, personId, section, text: text.slice(0, 600), evidenceType }));
  const userContext = profile ? { gender: shortText(profile.gender, 30), birthYear: shortText(profile.birthYear, 20), birthplace: shortText(profile.birthplace, 120), siblings: shortText(profile.siblings, 200), lifeStages: profile.lifeStages.map((item) => shortText(item, 120)) } : null;
  const prompt = `你是一位温和、可靠的心理教育陪伴者。请综合用户的当前问题、个人背景、原生家庭关系模式测试、父母基础信息和已录入材料，写一篇可以直接呈现在“智能洞察”中的中文回答。每次都必须针对当前问题和相关材料重新理解，绝不能复用其他问题的回答或套用固定结论。\n\n请尽可能帮助用户，但始终从用户的感受、处境和选择出发。回答应自然覆盖：\n- 此刻困惑的核心，以及它在当下给用户带来的真实代价；\n- 困惑背后可能的情绪、情感需要或关系期待；\n- 与父母互动、家庭氛围或早年角色之间一条最相关、可核对的联系；\n- 一个能带来新视角的启发；\n- 1 至 2 个低风险、具体、可拒绝或调整的行动建议。\n\n只能依据提供的信息提出“可能、也许、值得核对”的理解，不编造父母经历、动机或用户未描述的事实；不要把所有现实问题归因于原生家庭。不要诊断、贴人格标签、归罪、说教或提供医疗建议。允许表达难过、愤怒、委屈和需要，不把它们当成道德问题。不要使用“材料不足”“从材料看”“引用材料”“任务说明”等流程语言。写成 4 至 5 个自然段，不要标题、编号或 Markdown。总字数 420 至 700 字。\n\n当前问题：${question}\n\n用户背景：${JSON.stringify(userContext)}\n\n关系模式测试：${JSON.stringify(assessment || null)}\n\n父亲基础信息：${JSON.stringify(people ? parentContext(people.father) : null)}\n\n母亲基础信息：${JSON.stringify(people ? parentContext(people.mother) : null)}\n\n已录入材料：${JSON.stringify(sourceMaterials)}`;
  const response = await fetch(deepseekApiUrl, {
    method: 'POST',
    headers: { authorization: `Bearer ${deepseekApiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: deepseekModel, temperature: 0.55, messages: [{ role: 'user', content: prompt }] })
  });
  if (!response.ok) throw new Error('DeepSeek 暂时无法生成洞察，请稍后再试。');
  const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const body = result.choices?.[0]?.message?.content?.trim();
  if (!body) throw new Error('DeepSeek 未返回有效洞察，请稍后再试。');
  return { body: body.replace(/\*\*/g, ''), sourceIds: sourceMaterials.map((item) => item.id) };
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
