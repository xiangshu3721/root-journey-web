# 腾讯云 SCF 洞察代理

该函数保存 DeepSeek Key，GitHub Pages 只向它发送洞察请求。

## 部署

1. 在腾讯云 SCF 控制台的上海地域创建函数，运行环境选择 Node.js 20.19，入口为 `index.main_handler`。
2. 上传本目录中的 `index.js`，或用 Serverless Cloud Framework 部署 `serverless.yml`。前端更新后，函数也需要同步上传，困惑洞察才会返回新的结构化六层结果。
3. 在函数环境变量中设置 `DEEPSEEK_API_KEY`。不要把该 Key 写入仓库或前端环境变量。
4. 启用函数 URL，并允许匿名调用。函数 URL 是固定的 HTTPS 地址。
5. 在 GitHub 仓库 Settings - Secrets and variables - Actions - Variables 中新增 `INSIGHT_API_URL`，值为该函数 URL；随后推送 `main` 触发 GitHub Pages 部署。

函数仅允许来自 GitHub Pages 和本地开发地址的浏览器跨域读取响应。若使用自有域名，请把该域名加入 `ALLOWED_ORIGINS`。
