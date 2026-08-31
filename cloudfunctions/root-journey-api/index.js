/* CloudBase HTTP Function — zero external dependencies.
 * Add keys only in the CloudBase function environment. Never put secrets in Vite.
 */
const http = require('node:http');
const { randomUUID } = require('node:crypto');

const allowedOrigin = process.env.WEB_ORIGIN || '*';
const send = (res, status, payload) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': allowedOrigin, 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST, OPTIONS' });
  res.end(JSON.stringify(payload));
};
const bodyOf = (req) => new Promise((resolve, reject) => { let raw = ''; req.on('data', (chunk) => { raw += chunk; }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('请求数据不是有效 JSON')); } }); req.on('error', reject); });
const instruction = (task, payload) => `你是“寻根之旅·原生家庭考古”的 AI 生命档案师。只基于用户给出的材料提出可验证、待用户确认的理解；不诊断人格，不替人下结论，不许诺疗愈效果。表达温和、具体、简洁。任务：${task}\n材料：${JSON.stringify(payload)}`;
const portraitTopics = ['人生背景摘要', '成长经历', '性格倾向', '核心价值观', '最看重什么', '可能最害怕什么', '爱的表达方式', '愤怒表达方式', '冲突处理方式', '对家庭的理解', '对孩子的主要期待', '对我的主要态度', '常说的话 / 语言风格', '重要人生局限', '时代与家庭环境的影响'];
const isSafePortraitText = (value) => typeof value === 'string' && value.trim().length >= 8 && value.trim().length <= 180 && !/(请基于|任务[:：]|材料[:：]|输出|生成结构化|覆盖[:：]|维度可能呈现|不诊断|不下定论|当前材料提示|等待用户核对|材料未提及|未提供具体|信息不足)/.test(value);
const isSafeDynamicInsight = (value) => typeof value === 'string' && value.trim().length >= 18 && value.trim().length <= 150 && !/(请基于|任务[:：]|材料[:：]|输出|生成结构化|不诊断|不下定论|等待用户核对|当前材料提示|从这段关于|暂时看到一种为了适应环境|值得继续被补充和核对|不是被匆忙定义|这只是一个等待你核对)/.test(value);
const parseObject = (content) => { try { return JSON.parse((content.match(/\{[\s\S]*\}/) || [content])[0]); } catch { return {}; } };
async function askModel(task, payload) {
  const url = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';
  const key = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  if (!key) throw new Error('DeepSeek 尚未配置：请在云函数环境变量添加 DEEPSEEK_API_KEY');
  const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.7, messages: [{ role: 'user', content: instruction(task, payload) }] }) });
  if (!response.ok) throw new Error('模型服务暂时不可用');
  const result = await response.json();
  return result.choices?.[0]?.message?.content || '暂时无法生成内容，请稍后再试。';
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const path = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && path.endsWith('/health')) return send(res, 200, { ok: true, service: 'root-journey-api' });
  if (req.method !== 'POST') return send(res, 405, { message: '仅支持 POST 请求' });
  try {
    const body = await bodyOf(req);
    if (path.endsWith('/auth/send-code')) return send(res, 501, { message: '请先在 CloudBase 身份认证中启用短信登录；前端将直接调用 CloudBase Auth。' });
    if (path.endsWith('/auth/verify-code')) return send(res, 501, { message: '短信认证改由 CloudBase Auth SDK 完成，不由云函数自行签发 Token。' });
    if (path.endsWith('/ai/interview-question')) return send(res, 200, { question: await askModel('只提出一个适合继续录入的开放问题，不解释、不编号，问题应围绕指定人物与当前档案栏目。', body) });
    if (path.endsWith('/ai/classify-material')) {
      const sectionsByPerson = body.sectionsByPerson || { [body.personId]: body.sections || [] };
      const content = await askModel('判断这段家庭自由录入材料主要涉及 mother（母亲）、father（父亲）还是 self（用户自己）；再归入该人物对应 sections 中最贴近的一项。只返回 JSON，不要 Markdown，格式为 {"personId":"mother|father|self","section":"栏目名称","reason":"不超过40字的归类原因"}。section 必须完全等于该 personId 对应 sections 中的一项；无法判断时选择 self 和其“其他”或最后一项。', body);
      const parsed = parseObject(content);
      const personId = ['mother', 'father', 'self'].includes(parsed.personId) && sectionsByPerson[parsed.personId] ? parsed.personId : 'self';
      const sections = sectionsByPerson[personId] || [];
      const section = sections.includes(parsed.section) ? parsed.section : (sections.includes('其他') ? '其他' : sections[sections.length - 1]);
      return send(res, 200, { personId, section, reason: typeof parsed.reason === 'string' ? parsed.reason : '系统已完成初步归类，后续会随着更多材料持续校正。' });
    }
    if (path.endsWith('/ai/cheap-summary')) return send(res, 200, { id: randomUUID(), kind: 'summary', status: 'pending', title: '一段待你确认的理解', body: await askModel('整理单段访谈材料；不超过 160 字，使用“可能”“暂时”等措辞。', body), sourceIds: [body.material?.id].filter(Boolean) });
    if (path.endsWith('/ai/dynamic-insights')) {
      const task = `根据用户已录入的家庭经历、已有内在父母画像和用户对旧理解的反馈，生成 1 到 3 条不同的、可以让用户判断“符合 / 部分符合 / 不符合”的新理解。只返回 JSON，不要 Markdown：{"insights":[{"title":"不超过16字的主题","body":"30至120字的自然中文理解"}]}。
硬性要求：
1. 每条必须含有至少一个材料中可观察的具体行为、关系或反复互动，不能只写抽象心理学概念。
2. 可以克制地使用“可能”，但不要写“从材料看、暂时、需要补充核对、不是定论、等待确认”等流程或免责声明。
3. 不诊断、不贴人格标签、不归罪；重点说明父母的互动方式或家庭氛围，可能如何进入用户今天的感受、关系或选择。
4. 已被用户拒绝的理解不能换词重复；已被确认的理解可作为更细一层理解的依据。
5. 资料不足以形成具体理解时，返回 {"insights":[]}，绝对不要用套话填充。`;
      const parsed = parseObject(await askModel(task, body));
      const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3).filter((item) => typeof item?.title === 'string' && isSafeDynamicInsight(item?.body)).map((item) => ({ title: item.title.trim().slice(0, 24), body: item.body.trim() })) : [];
      return send(res, 200, { insights });
    }
    if (path.endsWith('/ai/system-hypothesis')) return send(res, 200, { id: randomUUID(), kind: 'hypothesis', status: 'pending', title: '一条待验证的影响链', body: '', sourceIds: (body.materials || []).slice(0, 8).map((item) => item.id) });
    if (path.endsWith('/ai/inner-chat')) return send(res, 200, { reply: await askModel('以“内在角色”的温和陪伴口吻回应用户。不要模仿现实父母，不要做诊断；不超过 120 字，先回应感受再邀请觉察。', body) });
    if (path.endsWith('/ai/deep-insight')) return send(res, 200, { id: randomUUID(), kind: 'dilemma', status: 'pending', title: '从原生家庭视角的一种可能理解', body: await askModel('针对当前困惑生成可追溯洞见；不超过 240 字，并明确这不是定论。', body), sourceIds: (body.materials || []).slice(0, 8).map((item) => item.id) });
    if (path.endsWith('/ai/parent-portrait')) {
      const person = body.personId === 'father' ? '父亲' : '母亲';
      const task = `仅根据材料，整理${person}的“内在${person}画像”。必须只返回 JSON 对象，不能使用 Markdown，键必须且只能是：${portraitTopics.map((topic) => `“${topic}”`).join('、')}。每个值为 8 至 120 字的具体理解，必须能被材料支持；没有可靠材料的键填空字符串 ""。禁止输出任务说明、材料说明、泛化套话、诊断或医疗判断。可以使用“可能”“从这些记录看”等克制措辞，但不要重复免责声明。`;
      const content = await askModel(task, { materials: body.materials || [] });
      const parsed = parseObject(content);
      const sections = Object.fromEntries(portraitTopics.map((topic) => [topic, isSafePortraitText(parsed[topic]) ? parsed[topic].trim() : '']).filter(([, text]) => text));
      return send(res, 200, { sections });
    }
    if (path.endsWith('/asr/transcribe')) return send(res, 501, { message: '请配置腾讯 ASR 后启用此接口。' });
    return send(res, 404, { message: '未找到此接口' });
  } catch (error) { return send(res, 500, { message: error instanceof Error ? error.message : '服务器错误' }); }
});
server.listen(Number(process.env.PORT || 9000), '0.0.0.0');
