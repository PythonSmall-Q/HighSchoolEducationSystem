# 部署指南

本文档详细说明如何将高中教育管理系统部署到 Cloudflare Workers。

## 📋 部署前准备

### 1. 注册 Cloudflare 账号

访问 [Cloudflare](https://dash.cloudflare.com/sign-up) 注册免费账号。

### 2. 安装 Wrangler CLI

Wrangler 是 Cloudflare Workers 的官方 CLI 工具。

\`\`\`bash
npm install -g wrangler
\`\`\`

### 3. 登录 Cloudflare

\`\`\`bash
wrangler login
\`\`\`

这将打开浏览器，授权 Wrangler 访问你的 Cloudflare 账号。

## 🗄️ 创建 D1 数据库

### 1. 创建数据库实例

\`\`\`bash
wrangler d1 create education-db
\`\`\`

命令执行后会返回类似以下信息：

\`\`\`
✅ Successfully created DB 'education-db'!

[[d1_databases]]
binding = "DB"
database_name = "education-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
\`\`\`

### 2. 更新 wrangler.toml

将返回的 \`database_id\` 复制到 \`wrangler.toml\` 文件中：

\`\`\`toml
[[d1_databases]]
binding = "DB"
database_name = "education-db"
database_id = "你的-database-id"  # 在这里粘贴
\`\`\`

### 3. 初始化数据库结构

\`\`\`bash
# 初始化远程数据库
wrangler d1 execute education-db --file=./schema.sql

# 验证数据库已创建
wrangler d1 execute education-db --command="SELECT * FROM users"
\`\`\`

## 🔐 配置环境变量

### 1. 生成安全的 JWT Secret

使用以下命令生成随机字符串：

\`\`\`bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | %{ Get-Random -Max 256 }))

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
\`\`\`

### 2. 更新 wrangler.toml

\`\`\`toml
[vars]
ENVIRONMENT = "production"
JWT_SECRET = "你生成的随机字符串"
\`\`\`

## 🚀 部署应用

### 1. 安装项目依赖

\`\`\`bash
npm install
\`\`\`

### 2. 部署到 Cloudflare Workers

\`\`\`bash
npm run deploy
# 或
wrangler deploy
\`\`\`

部署成功后，会显示你的应用 URL：

\`\`\`
✨ Published high-school-education-system
   https://high-school-education-system.你的账号.workers.dev
\`\`\`

### 3. 验证部署

访问显示的 URL，你应该能看到登录页面。

## 🧪 测试部署

### 1. 测试登录

使用默认管理员账号登录：

- 用户名：\`admin\`
- 密码：\`admin123\`

### 2. 测试 API

\`\`\`bash
# 测试登录 API
curl -X POST https://你的应用.workers.dev/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'
\`\`\`

如果返回包含 \`token\` 的 JSON，说明部署成功。

## 🔄 本地开发

### 1. 启动本地开发环境

\`\`\`bash
npm run dev
# 或
wrangler dev
\`\`\`

### 2. 使用本地数据库

\`\`\`bash
# 创建本地数据库
npm run db:init
# 或
wrangler d1 execute education-db --file=./schema.sql --local
\`\`\`

本地开发时访问 \`http://localhost:8787\`

## 📊 监控和日志

### 查看实时日志

\`\`\`bash
wrangler tail
\`\`\`

### Cloudflare Dashboard

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) 查看：

- Workers 分析数据
- 请求日志
- 错误报告
- D1 数据库统计

## 🔧 常见问题

### 问题 1：部署失败

**错误**：\`Error: Authentication error\`

**解决**：
\`\`\`bash
wrangler logout
wrangler login
\`\`\`

### 问题 2：数据库连接失败

**错误**：\`D1_ERROR: no such table: users\`

**解决**：确保已执行数据库初始化
\`\`\`bash
wrangler d1 execute education-db --file=./schema.sql
\`\`\`

### 问题 3：JWT 验证失败

**错误**：\`Unauthorized\`

**解决**：检查 \`wrangler.toml\` 中的 \`JWT_SECRET\` 是否正确配置

### 问题 4：超过免费额度

Cloudflare Workers 免费套餐限制：
- 每天 100,000 请求
- D1: 5GB 存储，每天 5M 行读取

**解决**：升级到付费套餐或优化查询

## 📈 性能优化

### 1. 启用缓存

在 Workers 代码中添加缓存：

\`\`\`typescript
// 缓存静态内容
const cache = caches.default;
const cacheResponse = await cache.match(request);
if (cacheResponse) {
  return cacheResponse;
}
\`\`\`

### 2. 数据库索引

确保 \`schema.sql\` 中的索引已创建，提高查询性能。

### 3. 减少数据库查询

使用批量查询和事务减少往返次数。

## 🔒 安全加固

### 1. 修改默认密码

首次部署后，立即登录管理员账号并修改密码：

\`\`\`sql
-- 通过 wrangler d1 execute 执行
UPDATE users 
SET password_hash = '新密码的哈希值' 
WHERE username = 'admin';
\`\`\`

### 2. 启用速率限制

在 Cloudflare Dashboard 中配置：
- Workers > 你的应用 > Settings > Rate Limiting

### 3. 配置 WAF 规则

在 Cloudflare Dashboard 中配置 Web Application Firewall。

## 🌍 自定义域名

### 1. 添加域名

在 Cloudflare Dashboard 中：
1. Workers & Pages > 你的应用
2. Settings > Domains & Routes
3. Add Custom Domain

### 2. 配置 DNS

添加 CNAME 记录指向 Workers 域名。

## 📦 更新部署

### 更新代码

\`\`\`bash
# 1. 修改代码
# 2. 测试
npm run dev

# 3. 部署更新
npm run deploy
\`\`\`

### 更新数据库

\`\`\`bash
# 1. 备份数据库
wrangler d1 backup create education-db

# 2. 执行迁移
wrangler d1 execute education-db --file=./migration.sql

# 3. 验证
wrangler d1 execute education-db --command="SELECT COUNT(*) FROM users"
\`\`\`

## 🗑️ 回滚部署

### 回滚 Workers

\`\`\`bash
# 查看部署历史
wrangler deployments list

# 回滚到指定版本
wrangler rollback [deployment-id]
\`\`\`

### 恢复数据库

\`\`\`bash
# 列出备份
wrangler d1 backup list education-db

# 恢复备份
wrangler d1 backup restore education-db [backup-id]
\`\`\`

## 📞 获取帮助

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [社区支持](https://community.cloudflare.com/)

## ✅ 部署检查清单

- [ ] 创建 Cloudflare 账号
- [ ] 安装并登录 Wrangler CLI
- [ ] 创建 D1 数据库
- [ ] 更新 wrangler.toml 配置
- [ ] 生成并配置 JWT Secret
- [ ] 初始化数据库结构
- [ ] 首次部署应用
- [ ] 测试登录功能
- [ ] 修改默认管理员密码
- [ ] 配置自定义域名（可选）
- [ ] 设置监控和日志
- [ ] 配置备份策略

---

**祝部署顺利！** 🎉
