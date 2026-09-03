'use strict';

const DEFAULT_ORIGIN = 'https://xiangshu3721.github.io';
const json = (statusCode, body, origin) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'Origin'
  },
  body: JSON.stringify(body)
});

const safeText = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const parseBody = (event) => {
  const raw = event?.body || '{}';
  const body = event?.isBase64Encoded ? Buffer.from(raw, 'base64').toString('utf8') : raw;
  return typeof body === 'string' ? JSON.parse(body) : body;
};
const originFor = (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin || '';
  const allowed = (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGIN).split(',').map((item) => item.trim());
  return allowed.includes(origin) ? origin : allowed[0];
};
const parentContext = (person) => ({
  name: safeText(person?.name, 80), nickname: safeText(person?.nickname, 80), birthDate: safeText(person?.birthDate, 40), birthplace: safeText(person?.birthplace, 120), growthPlace: safeText(person?.growthPlace, 120), education: safeText(person?.education, 180), work: safeText(person?.work, 180), marriage: safeText(person?.marriage, 220), wealth: safeText(person?.wealth, 180), majorIllness: safeText(person?.majorIllness, 180), setbacks: safeText(person?.setbacks, 500), lifeEvents: safeText(person?.lifeEvents, 700), keyInteractions: safeText(person?.keyInteractions, 700)
});
const parseModelJson = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
};
const safeDilemma = (value) => {
  const text = (input, limit = 240) => safeText(input, limit);
  const modules = Array.isArray(value?.modules) ? value.modules.slice(0, 4).map((module) => ({
    id: ['agency', 'emotion', 'relationship', 'value'].includes(module?.id) ? module.id : 'agency', name: text(module?.name, 20), association: Math.max(0, Math.min(100, Number(module?.association) || 0)), role: ['核心课题', '伴随课题', '辅助课题', '深层课题'].includes(module?.role) ? module.role : '辅助课题', direction: text(module?.direction, 120)
  })).filter((module) => module.name && module.direction) : [];
  const mode = value?.mode || {};
  const requiredMode = ['event', 'interpretation', 'emotion', 'need', 'response', 'result', 'belief'];
  const expectedIds = ['agency', 'emotion', 'relationship', 'value'];
  if (!text(value?.coreInsight) || modules.length !== 4 || requiredMode.some((key) => !text(mode[key])) || new Set(modules.map((module) => module.id)).size !== 4) return null;
  const totalAssociation = modules.reduce((sum, module) => sum + module.association, 0);
  if (totalAssociation !== 100) return null;
  return {
    coreInsight: text(value.coreInsight, 300), mode: Object.fromEntries(requiredMode.map((key) => [key, text(mode[key], 120)])),
    formation: { connection: text(value?.formation?.connection, 320), clues: Array.isArray(value?.formation?.clues) ? value.formation.clues.slice(0, 4).map((clue) => ({ label: text(clue?.label, 40), text: text(clue?.text, 160) })).filter((clue) => clue.label && clue.text) : [] },
    modules: expectedIds.map((id) => modules.find((module) => module.id === id)), newChoice: Array.isArray(value?.newChoice) ? value.newChoice.slice(0, 4).map((item) => text(item, 150)).filter(Boolean) : [], growthFocus: text(value?.growthFocus, 180)
  };
};
const dilemmaBody = (dilemma) => `${dilemma.coreInsight}\n\n自动模式：${Object.values(dilemma.mode).join(' → ')}\n\n成长课题：${dilemma.modules.map((module) => `${module.name} ${module.association}%`).join('；')}\n\n新的选择：${dilemma.newChoice.join('；')}\n\n持续练习：${dilemma.growthFocus}`;

exports.main_handler = async (event) => {
  const origin = originFor(event);
  if (event?.httpMethod === 'OPTIONS') return json(204, {}, origin);
  if (event?.httpMethod !== 'POST') return json(405, { message: '仅支持 POST 请求。' }, origin);

  try {
    const input = parseBody(event);
    const question = safeText(input.question, 700);
    if (!question) return json(400, { message: '请先写下你想洞察的问题。' }, origin);
    if (JSON.stringify(input).length > 150000) return json(413, { message: '本次材料过多，请精简后再试。' }, origin);
    if (!process.env.DEEPSEEK_API_KEY) return json(500, { message: '智能洞察服务尚未配置。' }, origin);

    const materials = Array.isArray(input.materials) ? input.materials.filter((item) => !item?.isRaw).slice(0, 60).map((item) => ({ id: safeText(item.id, 120), personId: safeText(item.personId, 20), section: safeText(item.section, 100), text: safeText(item.text, 600), evidenceType: safeText(item.evidenceType, 30) })) : [];
    const profile = input.profile ? { gender: safeText(input.profile.gender, 30), birthYear: safeText(input.profile.birthYear, 20), birthplace: safeText(input.profile.birthplace, 120), siblings: safeText(input.profile.siblings, 200), lifeStages: Array.isArray(input.profile.lifeStages) ? input.profile.lifeStages.map((item) => safeText(item, 120)).filter(Boolean).slice(0, 12) : [] } : null;
    const people = input.people || {};
    const reflections = Array.isArray(input.reflections) ? input.reflections.map((item) => safeText(item, 500)).filter(Boolean).slice(0, 2) : [];
    const prompt = `你是一位温和、可靠的心理教育陪伴者。请把用户的当下困惑翻译成其正在成长的生命课题。综合当前问题、补充回答、个人背景、关系模式测试、父母资料与已录入材料，但不要把所有问题归因于原生家庭。\n\n只能依据提供信息提出“可能、也许、值得核对”的理解，不编造父母经历、动机或用户未描述的事实。不要诊断、贴人格标签、归罪、说教或医疗建议。父母与家庭的关联必须使用克制的概率表述，并且只有存在具体线索时才写入 formation.clues；没有线索时 clues 返回 []，formation.connection 只写一条不归因的审慎说明。\n\n必须只输出一个合法 JSON 对象，不能有 Markdown、代码围栏或对象外文字。结构必须完全符合：\n{\n  "coreInsight":"一句直接、温和的核心洞察，50-110字",\n  "mode":{"event":"发生了什么","interpretation":"我怎么理解","emotion":"我有什么感受","need":"我真正需要什么","response":"我的自动反应","result":"最后的结果","belief":"被强化的旧信念"},\n  "formation":{"connection":"与过去资料的审慎关联，90-180字","clues":[{"label":"线索来源，如父亲档案或家庭氛围","text":"只写已提供资料中可核对的简短内容"}]},\n  "modules":[\n    {"id":"agency","name":"主体性","association":0,"role":"核心课题或伴随课题或辅助课题或深层课题","direction":"从外部评价回到内在判断等具体方向"},\n    {"id":"emotion","name":"情感力","association":0,"role":"核心课题或伴随课题或辅助课题或深层课题","direction":"允许和承载情绪等具体方向"},\n    {"id":"relationship","name":"关系力","association":0,"role":"核心课题或伴随课题或辅助课题或深层课题","direction":"区分意见与否定、表达需要等具体方向"},\n    {"id":"value","name":"价值力","association":0,"role":"核心课题或伴随课题或辅助课题或深层课题","direction":"将价值感从外部评价中拿回来等具体方向"}\n  ],\n  "newChoice":["下一次可以尝试的第一步","第二步","第三步"],\n  "growthFocus":"一句可持续练习的成长方向"\n}\n\n四个 modules 必须完整出现且 association 为 0-100 的整数，总和为 100；它们表示本次困惑的关联度，不是用户能力分数。mode 每项短于50字。newChoice 为 3 条、低风险、可自行调整的现实动作。\n\n当前问题：${question}\n\n补充回答：${JSON.stringify(reflections)}\n\n用户背景：${JSON.stringify(profile)}\n\n关系模式测试：${JSON.stringify(input.assessment || null)}\n\n父亲基础信息：${JSON.stringify(parentContext(people.father))}\n\n母亲基础信息：${JSON.stringify(parentContext(people.mother))}\n\n已录入材料：${JSON.stringify(materials)}`;
    const response = await fetch(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', temperature: 0.55, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) return json(502, { message: '智能洞察暂时无法生成，请稍后再试。' }, origin);
    const result = await response.json();
    const raw = result?.choices?.[0]?.message?.content?.trim();
    const dilemma = safeDilemma(parseModelJson(raw || ''));
    if (!dilemma) return json(502, { message: '智能洞察未返回有效内容，请稍后再试。' }, origin);
    return json(200, { body: dilemmaBody(dilemma), dilemma, sourceIds: materials.map((item) => item.id) }, origin);
  } catch {
    return json(400, { message: '请求格式不正确，请稍后再试。' }, origin);
  }
};
