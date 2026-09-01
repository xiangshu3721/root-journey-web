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
    const prompt = `你是一位温和、可靠的心理教育陪伴者。请综合用户的当前问题、个人背景、原生家庭关系模式测试、父母基础信息和已录入材料，写一篇可以直接呈现在“智能洞察”中的中文回答。每次都必须针对当前问题和相关材料重新理解，绝不能复用其他问题的回答或套用固定结论。\n\n请尽可能帮助用户，但始终从用户的感受、处境和选择出发。回答应自然覆盖：\n- 此刻困惑的核心，以及它在当下给用户带来的真实代价；\n- 困惑背后可能的情绪、情感需要或关系期待；\n- 与父母互动、家庭氛围或早年角色之间一条最相关、可核对的联系；\n- 一个能带来新视角的启发；\n- 1 至 2 个低风险、具体、可拒绝或调整的行动建议。\n\n只能依据提供的信息提出“可能、也许、值得核对”的理解，不编造父母经历、动机或用户未描述的事实；不要把所有现实问题归因于原生家庭。不要诊断、贴人格标签、归罪、说教或提供医疗建议。允许表达难过、愤怒、委屈和需要，不把它们当成道德问题。不要使用“材料不足”“从材料看”“引用材料”“任务说明”等流程语言。写成 4 至 5 个自然段，不要标题、编号或 Markdown。总字数 420 至 700 字。\n\n当前问题：${question}\n\n用户背景：${JSON.stringify(profile)}\n\n关系模式测试：${JSON.stringify(input.assessment || null)}\n\n父亲基础信息：${JSON.stringify(parentContext(people.father))}\n\n母亲基础信息：${JSON.stringify(parentContext(people.mother))}\n\n已录入材料：${JSON.stringify(materials)}`;
    const response = await fetch(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', temperature: 0.55, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) return json(502, { message: '智能洞察暂时无法生成，请稍后再试。' }, origin);
    const result = await response.json();
    const body = result?.choices?.[0]?.message?.content?.trim();
    if (!body) return json(502, { message: '智能洞察未返回有效内容，请稍后再试。' }, origin);
    return json(200, { body: body.replace(/\*\*/g, ''), sourceIds: materials.map((item) => item.id) }, origin);
  } catch {
    return json(400, { message: '请求格式不正确，请稍后再试。' }, origin);
  }
};
