# 部署指南

本文档详细说明如何将高中教育管理系统部署到生产环境。系统采用**前后端分离架构**，可独立部署和扩展。

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│               前端 (静态文件)                                  │
│  frontend.html + frontend-app.js                           │
│  部署到: Cloudflare Pages / S3 / CDN / 任何静态服务器        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (CORS)
                         │
┌────────────────────────▼────────────────────────────────────┐
│              后端 API (Cloudflare Workers)                   │
│  src/index.ts + src/api/ + src/auth.ts                    │
│  部署到: Cloudflare Workers (高可用、边缘计算)              │
│  数据库: Cloudflare D1 (SQLite)                            │
└─────────────────────────────────────────────────────────────┘
```

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

### 📍 步骤 1: 部署后端 (Cloudflare Workers)

#### 1.1 编译项目

\`\`\`bash
npm install
npx tsc --noEmit  # 验证 TypeScript
\`\`\`

#### 1.2 部署到 Cloudflare Workers

\`\`\`bash
npm run deploy
# 或
wrangler deploy
\`\`\`

部署成功后，会显示你的后端 API URL：

\`\`\`
✨ Published high-school-education-system
   https://high-school-education-system.你的账号.workers.dev
\`\`\`

**保存此 URL，前端需要配置此 API 端点。**

#### 1.3 验证后端部署

\`\`\`bash
# 测试登录 API
curl -X POST https://high-school-education-system.你的账号.workers.dev/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'

# 应返回类似:
# {"token":"eyJhbGc...","user":{"id":"...","username":"admin","role":"admin"}}
\`\`\`

---

### 📍 步骤 2: 部署前端 (选择以下任一方式)

前端是独立的静态文件，可部署到多个平台。选择最适合你的方案：

#### 方案 A: Cloudflare Pages (推荐，与后端同平台)

##### A1. 创建 GitHub 仓库（如果尚未创建）

\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/HighSchoolEducationSystem.git
git push -u origin main
\`\`\`

##### A2. 连接到 Cloudflare Pages

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择 **Pages** > **创建项目**
3. 连接到你的 GitHub 仓库
4. 配置构建设置:
   - **构建命令**: \`npm run build\` (或留空)
   - **输出目录**: \`src\` (因为前端文件在 src/ 目录)
5. 点击 **部署**

前端将部署到: \`https://yourproject.pages.dev\`

##### A3. 配置前端 API 端点

编辑 \`src/frontend-app.js\`，修改 API 基础 URL：

\`\`\`javascript
// 在文件顶部，修改 apiBaseUrl
const apiBaseUrl = 'https://high-school-education-system.你的账号.workers.dev';
// 或使用环境变量来动态配置
\`\`\`

重新推送到 GitHub，Pages 会自动重新部署。

---

#### 方案 B: AWS S3 + CloudFront

##### B1. 上传文件到 S3

\`\`\`bash
# 安装 AWS CLI (如果未安装)
# npm install -g aws-cli

# 配置 AWS 凭证
aws configure

# 创建 S3 存储桶
aws s3 mb s3://your-education-system-bucket --region us-east-1

# 上传前端文件
aws s3 cp src/frontend.html s3://your-education-system-bucket/index.html
aws s3 cp src/frontend-app.js s3://your-education-system-bucket/frontend-app.js
\`\`\`

##### B2. 配置 S3 用于静态网站

\`\`\`bash
# 设置存储桶策略允许公开访问
aws s3api put-bucket-policy --bucket your-education-system-bucket --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::your-education-system-bucket/*"
  }]
}'

# 启用静态网站托管
aws s3api put-bucket-website --bucket your-education-system-bucket --website-configuration '{
  "IndexDocument": {"Suffix": "index.html"},
  "ErrorDocument": {"Key": "index.html"}
}'
\`\`\`

---

#### 方案 C: 其他静态服务器

前端文件也可部署到任何静态服务器：
- Vercel
- Netlify
- GitHub Pages
- 自建 Nginx / Apache 服务器

**部署步骤**:
1. 上传 \`src/frontend.html\` 到服务器
2. 上传 \`src/frontend-app.js\` 到同一目录
3. 配置服务器返回 \`index.html\` 作为默认文件
4. 修改 \`frontend-app.js\` 中的 API 端点

---

### 📍 步骤 3: 配置前后端连接

#### 3.1 修改前端 API 配置

编辑 \`src/frontend-app.js\`，找到以下代码并更新：

\`\`\`javascript
// 在 frontend-app.js 顶部查找或添加
const apiBaseUrl = 'https://high-school-education-system.你的账号.workers.dev';

// API 调用函数会自动使用此 URL
async function apiCall(method, endpoint, data = null) {
  const url = \`\${apiBaseUrl}\${endpoint}\`;
  // ... 其他代码
}
\`\`\`

#### 3.2 验证 CORS 配置

后端已配置 CORS 头，允许来自任何来源的请求：

\`\`\`typescript
// 在 src/index.ts 中配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
\`\`\`

如需限制前端域名，可修改 \`Access-Control-Allow-Origin\`：

\`\`\`typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourproject.pages.dev',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
\`\`\`

---

## 🚀 部署应用 (旧版本 - 已合并到上方)

## 🧪 测试部署

### 1. 测试后端 API

#### 1.1 测试登录端点

\`\`\`bash
# 用管理员默认账号登录
curl -X POST https://high-school-education-system.你的账号.workers.dev/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'

# 成功应返回:
# {"token":"eyJhbGc...","user":{"id":"xxx","username":"admin","role":"admin"}}
\`\`\`

#### 1.2 测试其他 API 端点

\`\`\`bash
# 获取学生时间表 (需要有效的 token)
curl -X GET https://high-school-education-system.你的账号.workers.dev/api/student/schedule \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

### 2. 测试前端

1. 访问前端 URL（根据部署方案选择）:
   - Cloudflare Pages: \`https://yourproject.pages.dev\`
   - S3 + CloudFront: \`https://your-cloudfront-domain.com\`
   - 其他: 对应的前端部署地址

2. 测试登录功能:
   - 用户名: \`admin\`
   - 密码: \`admin123\`

3. 测试各角色功能:
   - **管理员**: 创建课程、管理时间表、创建学生/教师账号
   - **教师**: 查看班级学生、上传成绩、查看评教结果
   - **学生**: 查看时间表、查看成绩、查看排名、参与评教

### 3. 前后端连接测试

打开浏览器开发者工具 (F12)，查看 **Network** 标签：

1. 登录时应看到请求发送到你的后端 API 端点
2. 所有 API 调用应返回 200 或 201 状态码
3. Authorization header 应包含有效的 JWT token

## 🔄 本地开发

### 1. 启动本地开发环境

\`\`\`bash
# 启动后端 (Workers) - 默认 http://localhost:8787
npm run dev
# 或
wrangler dev
\`\`\`

### 2. 配置前端指向本地后端

编辑 \`src/frontend-app.js\`，修改 API 基础 URL：

\`\`\`javascript
// 开发环境: 指向本地后端
const apiBaseUrl = 'http://localhost:8787';

// 生产环境: 指向远程后端
// const apiBaseUrl = 'https://high-school-education-system.你的账号.workers.dev';
\`\`\`

### 3. 访问前端

在浏览器打开前端文件：
- 直接打开: \`file:///path/to/src/frontend.html\` (简单但不推荐，可能有 CORS 问题)
- 使用本地服务器：
  \`\`\`bash
  # 使用 Python (Python 3)
  python -m http.server 8000 --directory src
  
  # 或使用 Node.js (需要 http-server)
  npx http-server src -p 8000
  
  # 或使用 VS Code Live Server 扩展
  \`\`\`
  然后访问 \`http://localhost:8000\`

### 4. 使用本地数据库

首次运行时初始化本地数据库：

\`\`\`bash
# 创建本地 D1 数据库并初始化表结构
wrangler d1 execute education-db --file=./schema.sql --local
\`\`\`

开发时会自动使用 \`.wrangler/state/v3/d1/\` 下的本地数据库。

### 5. 调试技巧

打开浏览器开发者工具查看：
- **Console**: JavaScript 错误和日志
- **Network**: API 请求和响应
- **Application > Local Storage**: JWT token 存储
- **Application > IndexedDB**: 如果使用了本地存储

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

### 问题 1: CORS 错误 (浏览器开发者工具显示 CORS 错误)

**错误**: \`Access to XMLHttpRequest has been blocked by CORS policy\`

**原因**: 前端和后端部署在不同的域名上。

**解决**:
1. 确认后端 \`src/index.ts\` 已配置 CORS 头:
   \`\`\`typescript
   'Access-Control-Allow-Origin': '*',
   \`\`\`
2. 或者限制到前端域名:
   \`\`\`typescript
   'Access-Control-Allow-Origin': 'https://yourproject.pages.dev',
   \`\`\`
3. 重新部署后端

### 问题 2: 前端无法连接到后端

**错误**: 在浏览器 Console 中看到 "Failed to fetch" 或 "Network error"

**原因**: 前端配置的 API 端点错误。

**解决**:
1. 检查 \`src/frontend-app.js\` 中的 \`apiBaseUrl\` 是否正确
2. 确认后端已成功部署并可访问 (在浏览器中访问 API 端点)
3. 检查网络连接和防火墙设置

### 问题 3: 前端文件无法加载

**错误**: 页面显示空白或 404 错误

**原因**: 前端部署路径或文件名错误。

**解决**:
- **Cloudflare Pages**: 确保 \`src/frontend.html\` 被上传且命名正确
- **S3**: 确保 \`index.html\` 进行了重定向配置 (ErrorDocument 指向 index.html)
- **其他服务器**: 确保 web 服务器配置正确返回 \`index.html\`

### 问题 4: 部署失败 - 后端

**错误**: \`Error: Authentication error\`

**解决**:
\`\`\`bash
wrangler logout
wrangler login
\`\`\`

### 问题 5: 数据库连接失败

**错误**: \`D1_ERROR: no such table: users\`

**解决**: 确保已执行数据库初始化
\`\`\`bash
wrangler d1 execute education-db --file=./schema.sql
\`\`\`

### 问题 6: JWT 验证失败

**错误**: \`Unauthorized\` 响应

**解决**: 检查以下几点:
1. \`wrangler.toml\` 中的 \`JWT_SECRET\` 是否已正确配置
2. 登录后是否正确保存了 token
3. API 调用时是否在 Authorization header 中包含了 token
4. Token 是否已过期 (有效期 3600 秒)

### 问题 7: TypeScript 编译错误

**错误**: \`npm run deploy\` 时显示 TypeScript 错误

**解决**:
\`\`\`bash
# 检查编译
npx tsc --noEmit

# 查看详细错误
npx tsc
\`\`\`

常见的类型错误:
- 在 API 函数缺少某个参数类型
- API 返回值与前端期望的类型不匹配
- 检查 \`src/types.ts\` 中的接口定义是否正确

### 问题 8: 超过免费额度

Cloudflare Workers 和 D1 免费套餐限制：
- **Workers**: 每天 100,000 请求
- **D1**: 5GB 存储，每天 500 万行读取

**解决**: 升级到付费套餐或优化查询

### 问题 9: 前端登录后仍显示登录页面

**错误**: 登录成功但页面未更新

**原因**: Token 未正确保存或前端 API 端点不正确。

**解决**:
1. 打开浏览器开发者工具的 **Application** 标签
2. 检查 **Local Storage** 中是否有 \`token\` 和 \`currentUser\` 字段
3. 检查登录请求是否返回 200 状态码和有效的 token
4. 查看 Console 中是否有 JavaScript 错误

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

首次部署后，立即登录管理员账号并修改密码。

使用前端界面修改密码，或通过 API：

\`\`\`bash
# 通过 Workers 脚本修改 (需要通过前端登录后使用)
curl -X POST https://high-school-education-system.你的账号.workers.dev/api/change-password \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{"oldPassword":"admin123","newPassword":"你的新密码"}'
\`\`\`

### 2. JWT Secret 安全性

- 在 \`wrangler.toml\` 中使用强随机密钥（至少 32 字节）
- **永远不要**在代码中硬编码或提交到 Git
- 使用 \`.gitignore\` 排除 \`wrangler.toml\` (如果包含敏感信息)

生成安全的 JWT Secret：

\`\`\`bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# OpenSSL (Linux/Mac)
openssl rand -base64 32

# PowerShell (Windows)
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
\`\`\`

### 3. 限制 CORS 来源

在生产环境中，限制 CORS 只允许你的前端域名：

\`\`\`typescript
// src/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',  // 仅你的前端
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
\`\`\`

### 4. 启用 Cloudflare WAF

在 Cloudflare Dashboard 中配置 Web Application Firewall：
1. 选择你的 Workers 应用
2. **Security** > **WAF**
3. 启用 Cloudflare 提供的规则集

### 5. 定期更新依赖

\`\`\`bash
npm update
npm audit fix
npm run deploy
\`\`\`

### 6. 数据库备份

定期备份 D1 数据库：

\`\`\`bash
# 创建备份
wrangler d1 backup create education-db

# 列出备份
wrangler d1 backup list education-db

# 恢复备份
wrangler d1 backup restore education-db [backup-id]
\`\`\`

### 7. 日志监控

启用 Cloudflare 日志并定期检查：

\`\`\`bash
# 查看实时日志
wrangler tail

# 在 Dashboard 中查看分析
# https://dash.cloudflare.com/ > Workers > 你的应用 > Analytics
\`\`\`

## ✅ 部署检查清单

### 后端部署

- [ ] 创建 Cloudflare 账号
- [ ] 安装并登录 Wrangler CLI (\`wrangler login\`)
- [ ] 创建 D1 数据库 (\`wrangler d1 create education-db\`)
- [ ] 更新 \`wrangler.toml\` 配置:
  - [ ] 添加数据库 ID
  - [ ] 配置 \`JWT_SECRET\` (安全的随机字符串)
  - [ ] 设置环境变量

- [ ] 初始化数据库结构 (\`wrangler d1 execute education-db --file=./schema.sql\`)
- [ ] 编译 TypeScript (\`npx tsc --noEmit\`)
- [ ] 部署后端 (\`npm run deploy\`)
- [ ] 验证后端部署 (测试 API 端点)
- [ ] **保存后端 URL** (例: https://high-school-education-system.你的账号.workers.dev)

### 前端部署

选择以下任一部署方案：

#### Cloudflare Pages 方案
- [ ] 推送代码到 GitHub 仓库
- [ ] 在 Cloudflare Dashboard 连接 GitHub 仓库
- [ ] 配置构建设置 (输出目录: \`src\`)
- [ ] 部署前端
- [ ] **保存前端 URL** (例: https://yourproject.pages.dev)

#### AWS S3 + CloudFront 方案
- [ ] 创建 S3 存储桶
- [ ] 上传 frontend.html 和 frontend-app.js
- [ ] 配置 S3 静态网站托管
- [ ] 创建 CloudFront 分布
- [ ] **保存前端 URL** (CloudFront 域名)

#### 其他部署方案 (Vercel/Netlify/自建服务器)
- [ ] 上传前端文件到服务器
- [ ] 配置服务器返回 index.html (SPA 配置)
- [ ] **保存前端 URL**

### 连接和验证

- [ ] 修改 \`src/frontend-app.js\` 的 \`apiBaseUrl\` (指向后端 URL)
- [ ] 重新部署前端 (如果已修改)
- [ ] 访问前端 URL
- [ ] 测试管理员登录 (username: admin, password: admin123)
- [ ] 测试各个角色功能 (学生、教师、管理员)
- [ ] 检查浏览器 Console 无错误

### 生产准备

- [ ] 修改所有默认密码
- [ ] 配置生产环境的 JWT_SECRET (强随机密钥)
- [ ] 限制 CORS 来源到前端域名
- [ ] 设置数据库备份策略
- [ ] 启用 Cloudflare WAF
- [ ] 配置监控和告警
- [ ] 准备灾难恢复计划

---

## 📊 性能优化

### 1. 数据库索引

确保 \`schema.sql\` 中已创建关键索引，提高查询性能：

\`\`\`sql
CREATE INDEX idx_student_user_id ON students(user_id);
CREATE INDEX idx_grade_student_id ON grades(student_id);
CREATE INDEX idx_schedule_teacher_id ON schedules(teacher_id);
\`\`\`

### 2. API 缓存

在 Workers 中添加缓存：

\`\`\`typescript
// 缓存静态数据 (如评教问题)
if (endpoint === '/api/admin/evaluation-questions') {
  const cache = caches.default;
  const response = await cache.match(request);
  if (response) return response;
  
  // 获取数据后缓存 24 小时
  const newResponse = new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=86400'
    }
  });
  request.waitUntil(cache.put(request, newResponse.clone()));
  return newResponse;
}
\`\`\`

### 3. 前端优化

- 压缩 \`frontend-app.js\` 和 \`frontend.html\`
- 启用 Gzip 压缩
- 使用 CDN 分发静态文件

---

## 📈 监控和维护

### 1. Cloudflare 分析

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) 查看：
- 请求数量和响应时间
- 错误率
- 缓存命中率

### 2. 实时日志

\`\`\`bash
wrangler tail --format pretty
\`\`\`

### 3. 数据库监控

\`\`\`bash
# 查看数据库大小
wrangler d1 info education-db

# 执行优化查询
wrangler d1 execute education-db --command="ANALYZE;"
\`\`\`

---

## 🔄 更新和回滚

### 更新后端

\`\`\`bash
# 1. 修改代码
# 2. 编译测试
npx tsc --noEmit

# 3. 部署更新
npm run deploy
\`\`\`

### 更新前端

根据部署方案：
- **Cloudflare Pages**: Git push 自动触发重新部署
- **S3**: 使用 AWS CLI \`aws s3 sync\` 同步文件
- **自建**: 手动上传文件

### 回滚部署

#### 回滚后端

\`\`\`bash
# 查看部署历史
wrangler deployments list

# 回滚到上一个版本
wrangler rollback
\`\`\`

#### 恢复数据库

\`\`\`bash
# 列出备份
wrangler d1 backup list education-db

# 恢复指定备份
wrangler d1 backup restore education-db [backup-id]
\`\`\`

## 📞 获取帮助

### 官方文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

### 其他资源

- [Cloudflare Community](https://community.cloudflare.com/)
- [Cloudflare 状态页面](https://www.cloudflarestatus.com/)

### 项目问题排查

查看项目根目录的其他文档：
- [README.md](README.md) - 项目概览和功能描述
- [API.md](API.md) - API 端点详细文档
- [DEVELOPMENT.md](DEVELOPMENT.md) - 本地开发指南
- [QUICKSTART.md](QUICKSTART.md) - 快速开始

---

## 📋 架构文件清单

项目的分离架构包含以下文件：

### 后端文件 (Cloudflare Workers API)

```
src/
├── index.ts                 # API 路由和请求处理 (135 行)
├── auth.ts                  # JWT 认证和密码管理
├── types.ts                 # TypeScript 类型定义
└── api/
    ├── student.ts           # 学生 API 端点
    ├── teacher.ts           # 教师 API 端点
    └── admin.ts             # 管理员 API 端点 (20+ 函数)
```

### 前端文件 (静态网站)

```
src/
├── frontend.html            # HTML 和 CSS (500+ 行)
├── frontend-app.js          # JavaScript 应用逻辑 (780 行)
```

### 配置文件

```
wrangler.toml               # Cloudflare Workers 配置
package.json                # npm 依赖和脚本
tsconfig.json               # TypeScript 配置
schema.sql                  # D1 数据库初始化脚本
```

---

**祝部署顺利！** 🎉

如有问题或建议，欢迎提出 Issue 或 PR。
