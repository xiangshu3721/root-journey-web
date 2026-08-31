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
const portraitTopics = ['人生背景', '成长经历与关键事件', '未完成的人生', '性格与处事方式', '核心价值观', '最看重什么', '最害怕什么', '内在最深的需要', '爱的表达', '情绪表达', '沟通与冲突', '边界与控制', '家庭 / 婚姻观与东方家庭文化影响', 'TA 对孩子的期待', 'TA 如何看待我', 'TA 对我的影响'];
const portraitExtras = ['TA 常说的话', 'TA 身上的矛盾', '是什么塑造了 TA'];
const isSafePortraitText = (value) => typeof value === 'string' && value.trim().length >= 8 && value.trim().length <= 180 && !/(请基于|任务[:：]|材料[:：]|输出|生成结构化|覆盖[:：]|维度可能呈现|不诊断|不下定论|当前材料提示|等待用户核对|材料未提及|未提供|信息不足|材料仅显示|材料显示|从材料看|从这些记录看|从你记录|偏执型人格|人格障碍|精神状态不佳|死本能|病态|未能如愿|未能实现|未被明确提及|未明确提及|是否实现)/.test(value);
const isSafeDynamicInsight = (value) => typeof value === 'string' && value.trim().length >= 18 && value.trim().length <= 150 && !/(请基于|任务[:：]|材料[:：]|输出|生成结构化|不诊断|不下定论|等待用户核对|当前材料提示|从这段关于|暂时看到一种为了适应环境|值得继续被补充和核对|不是被匆忙定义|这只是一个等待你核对)/.test(value);
const parseObject = (content) => { try { return JSON.parse((content.match(/\{[\s\S]*\}/) || [content])[0]); } catch { return {}; } };
const cleanPortraitText = (value) => value.trim().replace(/^(?:从(?:这些)?(?:材料|记录)看|材料(?:仅)?显示)[，,:：\s]*/u, '').replace(/[，,]?\s*(?:具体职业与家庭结构|其他背景信息)未提及。?$/u, '').trim();
async function askModel(task, payload) {
  const url = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';
  const key = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  if (!key) throw new Error('DeepSeek 尚未配置：请在云函数环境变量添加 DEEPSEEK_API_KEY');
  const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.35, messages: [{ role: 'user', content: instruction(task, payload) }] }) });
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
    if (path.endsWith('/ai/structure-material')) {
      const task = `把一段自由记录拆成可被后续理解使用的最小信息单元。只返回 JSON，不要 Markdown：{"segments":[{"personId":"mother|father|self|family","evidenceType":"fact|experience|interpretation|hypothesis","text":"忠实、简短的中文转述"}]}。
分类规则：
1. fact 是可观察的人生经历、关系、行为、原话或背景；experience 是用户自己经历到的关系感受；interpretation 是用户对含义或影响的理解；hypothesis 是未经验证的标签、推测或判断。
2. 一句话同时涉及父亲、母亲、自己或家庭时必须拆开。例如“父亲是木工”归 father/fact；“我觉得世界充满恨”归 self/experience 或 self/interpretation。
3. 绝不把“人格、精神疾病、死本能”等标签改写为事实；此类内容必须归 hypothesis，并保留为“用户的判断/担心”。
4. 不增加原文没有的信息，不做分析、不安慰、不诊断。每段 8 至 180 字，最多 16 段。`;
      const parsed = parseObject(await askModel(task, body));
      const allowedSubjects = ['mother', 'father', 'self', 'family'];
      const allowedTypes = ['fact', 'experience', 'interpretation', 'hypothesis'];
      const segments = Array.isArray(parsed.segments) ? parsed.segments.slice(0, 16).filter((item) => allowedSubjects.includes(item?.personId) && allowedTypes.includes(item?.evidenceType) && typeof item?.text === 'string' && item.text.trim().length >= 6).map((item) => ({ personId: item.personId, evidenceType: item.evidenceType, text: item.text.trim().slice(0, 360) })) : [];
      return send(res, 200, { segments });
    }
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
    if (path.endsWith('/ai/deep-insight')) {
      const task = `针对用户的当前困惑，给出一次性、个性化的原生家庭视角洞察。只使用请求中的测试结果与父母材料；绝不杜撰父母的经历或把所有问题归因于原生家庭。用自然、温和、像在真正理解用户的中文，不要输出任务说明或心理学术语。
输出按以下 6 段组织，用短标题和换行：
1. 你现在真正卡在哪里（先直接回应问题）
2. 从你的家庭材料里，我看到了什么（只选相关材料）
3. 过去和现在可能怎样连起来（用清晰的“过去→现在”路径）
4. 一个不一样的角度（避免重复“原生家庭影响了你”）
5. 过去和现在有什么不同（承认当下现实也在参与）
6. 可以继续观察什么（给一个具体问题）
若父母材料很少，仍回答当前困惑，但必须说明“基于目前材料，这只是一个可能方向”，并在最后给 1 至 2 个可选补充方向。不能编造用户童年发生过的细节、父母的动机、用户当下关系或身边人的反应；“过去和现在有什么不同”只能写成用户现在拥有更多选择/可以重新观察，不可断言现实已经改善。禁止诊断、归罪、人格标签与医疗建议。不要使用 Markdown 标记。总字数 260 至 520 字。`;
      const materials = body.materials || [];
      const insight = (await askModel(task, { question: body.question, assessment: body.assessment, materials })).replace(/\*\*/g, '');
      return send(res, 200, { id: randomUUID(), kind: 'dilemma', status: 'confirmed', title: '从原生家庭视角的一次理解', body: insight, sourceIds: materials.slice(0, 10).map((item) => item.id) });
    }
    if (path.endsWith('/ai/parent-portrait')) {
      const person = body.personId === 'father' ? '父亲' : '母亲';
      const task = `仅根据已分层材料，整理${person}的“内在${person}画像”。必须只返回 JSON 对象，不能使用 Markdown，格式为：{"summary":"一句话人物画像","sections":{"${portraitTopics[0]}":"..."},"extras":{"TA 常说的话":"..."}}。sections 的键必须且只能来自：${portraitTopics.map((topic) => `“${topic}”`).join('、')}；extras 的键只能来自：${portraitExtras.map((topic) => `“${topic}”`).join('、')}。每个值为 8 至 120 字的具体理解，必须能被材料支持；没有可靠材料的键填空字符串 ""。
材料中 evidenceType=fact 可用于描述明确写出的经历、行为或原话；experience 只能写成“用户感受到/经历到”；interpretation 可作为待核对的理解；hypothesis 不能当作事实、成因或诊断依据。
严禁常识性补全：不能仅因“长女、有弟妹”就写照顾弟妹、做家务、被迫早熟；不能仅因学历或读书愿望就写失学原因、家庭条件、未能实现或人生遗憾；不能仅因善良、斗争、观察力就推断爱的表达、愤怒方式、对孩子期待或家庭价值观。没有明确行为或原话就留空。
summary 需是一句完整、有人味的画像，30 至 70 字；没有足够材料时 summary 填空字符串。不得把“想要、梦寐以求”改写为“未实现、未能如愿”，不得在 summary 中增加材料没有写出的因果。extras 是辅助信息，没有依据则填空字符串。直接写画像结论，不要以“从材料看”“材料显示”“未提供”或“资料不足”开头，也不要描述你拿到了什么资料。禁止复述“偏执型人格、精神状态不佳、死本能”等诊断或病理化标签；不得因亲属地点、职业或身份而推断时代创伤或人格成因。禁止输出任务说明、材料说明、泛化套话、诊断或医疗判断。可以使用“可能”等克制措辞，但不要重复免责声明。`;
      const content = await askModel(task, { materials: body.materials || [] });
      const parsed = parseObject(content);
      const sourceSections = parsed.sections && typeof parsed.sections === 'object' ? parsed.sections : parsed;
      const sections = Object.fromEntries(portraitTopics.map((topic) => { const text = typeof sourceSections[topic] === 'string' ? cleanPortraitText(sourceSections[topic]) : ''; return [topic, isSafePortraitText(text) ? text : '']; }).filter(([, text]) => text));
      const summary = typeof parsed.summary === 'string' && isSafePortraitText(cleanPortraitText(parsed.summary)) ? cleanPortraitText(parsed.summary) : '';
      const extras = Object.fromEntries(portraitExtras.map((topic) => { const text = parsed.extras && typeof parsed.extras[topic] === 'string' ? cleanPortraitText(parsed.extras[topic]) : ''; return [topic, isSafePortraitText(text) ? text : '']; }).filter(([, text]) => text));
      return send(res, 200, { summary, sections, extras });
    }
    if (path.endsWith('/asr/transcribe')) return send(res, 501, { message: '请配置腾讯 ASR 后启用此接口。' });
    return send(res, 404, { message: '未找到此接口' });
  } catch (error) { return send(res, 500, { message: error instanceof Error ? error.message : '服务器错误' }); }
});
server.listen(Number(process.env.PORT || 9000), '0.0.0.0');
