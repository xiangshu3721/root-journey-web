# 寻根之旅·原生家庭考古

独立响应式 Web 1.0，使用 React + TypeScript + Vite。资料与洞察均保存在当前浏览器中，不依赖云端账户、数据库或云函数。

## 本地运行

```bash
cd root-journey-web
npm install
cp .env.example .env
npm run dev
```

演示登录验证码为 `123456`。

## 数据与智能洞察

父母档案、测试结果与洞察历史均使用浏览器本地存储。清除浏览器数据或更换设备后，这些资料无法恢复。

父母档案、测试结果与洞察历史仍保存在浏览器本机。填写 `.env.local` 中的 `VITE_DEEPSEEK_API_KEY` 后，用户每次提交困惑时，浏览器会把当前问题、测试结果和已录入的父母材料直接发送给 DeepSeek，生成独立洞察并保存在本机历史中。此直连方式会将这些内容发送至 DeepSeek，密钥也会出现在浏览器构建产物中，只适合你授权的本地使用场景。

## 产品安全边界

所有洞察均为待确认的自我探索提示，不作为心理诊断、医疗建议或对父母的事实断言。

## Working rules

- 不要遍历整个代码库，除非确有必要。
- 优先修改与当前任务直接相关的文件。
- 不要重复读取已经读取过的文件。
- 不要主动进行大规模重构。
- 不要为了“小优化”修改无关文件。
- 完成功能后只运行必要测试。
- 不要自动启动多个子代理。
- 遇到不确定的问题，先提出最小实现方案。
- 默认优先采取最小改动原则。

Token efficiency is important.
Minimize repository exploration, tool calls,
repeated reads, and unnecessary reasoning.
