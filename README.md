# 寻根之旅·原生家庭考古

独立响应式 Web 1.0，使用 React + TypeScript + Vite。默认以 `VITE_DEMO_MODE=true` 在浏览器本地运行，便于审核完整交互；生产环境通过 CloudBase FREE 承接短信认证、PostgreSQL、Storage 与云函数。

## 本地运行

```bash
cd root-journey-web
npm install
cp .env.example .env
npm run dev
```

演示登录验证码为 `123456`。

## CloudBase 部署职责

| 层 | 职责 |
|---|---|
| Auth | 手机号验证码、用户会话与身份令牌 |
| PostgreSQL | 档案、材料、洞见、内在角色、报告；所有业务表以 `user_id` 配合 RLS 隔离 |
| Storage | 头像、照片、语音、PDF；按用户目录私有存储并使用短期签名 URL |
| 云函数 | 验证短信、材料读写、ASR 代理、模型编排与 PDF 生成 |
| 便宜 LLM | 访谈追问、材料摘要、分类、待确认小结 |
| 强模型 | 当前困惑深度洞见、生命地图报告；只能读取用户已授权材料 |

`cloudfunctions/root-journey-api` 是 HTTP 云函数骨架；密钥仅配置在函数环境变量。`database/schema.sql` 包含首版 PG 表及行级安全策略。

## 接入 DeepSeek（云函数侧）

所有 AI 能力目前统一使用 DeepSeek：引导问题、材料小结、家庭系统影响链、内在角色对话与当前困惑洞见。请在 CloudBase 控制台进入“云函数 → root-journey-api → 函数配置 → 编辑 → 环境变量”，新增：

| key | value |
|---|---|
| `DEEPSEEK_API_KEY` | 你的 DeepSeek API Key |
| `DEEPSEEK_MODEL` | `deepseek-chat` |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com/chat/completions`（可不填，代码已有默认值） |

保存后重新部署 `cloudfunctions/root-journey-api`。密钥只留在云函数中，绝不要放入 `.env.local`、前端代码或分享链接。未配置密钥时，演示环境会继续显示本地的安全回退文案，便于审核流程。

## 产品安全边界

所有 AI 输出均为待确认理解，必须携带来源材料 ID；不得作为心理诊断、医疗建议或对父母的事实断言。生产函数应在任意深度分析前执行危机文本拦截，并返回专业求助提示。
