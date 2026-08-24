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
    if (path.endsWith('/ai/cheap-summary')) return send(res, 200, { id: randomUUID(), kind: 'summary', status: 'pending', title: '一段待你确认的理解', body: await askModel('整理单段访谈材料；不超过 160 字，使用“可能”“暂时”等措辞。', body), sourceIds: [body.material?.id].filter(Boolean) });
    if (path.endsWith('/ai/system-hypothesis')) return send(res, 200, { id: randomUUID(), kind: 'hypothesis', status: 'pending', title: '一条待验证的影响链', body: await askModel('基于已有材料，提出一条家庭系统影响链；不超过 180 字，明确它等待用户核对。', body), sourceIds: (body.materials || []).slice(0, 8).map((item) => item.id) });
    if (path.endsWith('/ai/inner-chat')) return send(res, 200, { reply: await askModel('以“内在角色”的温和陪伴口吻回应用户。不要模仿现实父母，不要做诊断；不超过 120 字，先回应感受再邀请觉察。', body) });
    if (path.endsWith('/ai/deep-insight')) return send(res, 200, { id: randomUUID(), kind: 'dilemma', status: 'pending', title: '从原生家庭视角的一种可能理解', body: await askModel('针对当前困惑生成可追溯洞见；不超过 240 字，并明确这不是定论。', body), sourceIds: (body.materials || []).slice(0, 8).map((item) => item.id) });
    if (path.endsWith('/asr/transcribe')) return send(res, 501, { message: '请配置腾讯 ASR 后启用此接口。' });
    return send(res, 404, { message: '未找到此接口' });
  } catch (error) { return send(res, 500, { message: error instanceof Error ? error.message : '服务器错误' }); }
});
server.listen(Number(process.env.PORT || 9000), '0.0.0.0');
