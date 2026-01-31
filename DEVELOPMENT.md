# 开发者指南

本文档面向希望参与开发或自定义系统的开发者。

## 🏗️ 项目结构

\`\`\`
HighSchoolEducationSystem/
├── src/
│   ├── index.ts          # Workers 入口文件，路由处理
│   ├── types.ts          # TypeScript 类型定义
│   ├── auth.ts           # 认证和授权逻辑
│   └── api/
│       ├── student.ts    # 学生 API 处理函数
│       ├── teacher.ts    # 教师 API 处理函数
│       └── admin.ts      # 管理员 API 处理函数
├── schema.sql            # 数据库 Schema
├── sample-data.sql       # 示例数据
├── package.json
├── tsconfig.json
├── wrangler.toml         # Cloudflare Workers 配置
├── README.md
├── DEPLOYMENT.md         # 部署文档
├── API.md                # API 文档
└── DEVELOPMENT.md        # 本文档
\`\`\`

## 🚀 开发环境搭建

### 1. 克隆项目

\`\`\`bash
git clone <repository-url>
cd HighSchoolEducationSystem
\`\`\`

### 2. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 3. 本地数据库初始化

\`\`\`bash
# 初始化数据库结构
npm run db:init

# 填充示例数据
wrangler d1 execute education-db --file=./sample-data.sql --local
\`\`\`

### 4. 启动开发服务器

\`\`\`bash
npm run dev
\`\`\`

访问 http://localhost:8787

## 💻 开发流程

### 添加新 API 端点

1. **在相应的 API 文件中添加处理函数**

\`\`\`typescript
// src/api/student.ts
export async function getNewFeature(env: Env, user: JWTPayload) {
  const query = \`SELECT * FROM some_table WHERE user_id = ?\`;
  const result = await env.DB.prepare(query).bind(user.userId).all();
  return result.results;
}
\`\`\`

2. **在 index.ts 中添加路由**

\`\`\`typescript
// src/index.ts
if (path === '/api/student/new-feature' && hasRole(authUser, 'student')) {
  const data = await studentApi.getNewFeature(env, authUser);
  return jsonResponse(data, 200, corsHeaders);
}
\`\`\`

3. **测试 API**

\`\`\`bash
curl http://localhost:8787/api/student/new-feature \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### 修改数据库结构

1. **修改 schema.sql**

\`\`\`sql
-- 添加新表
CREATE TABLE IF NOT EXISTS new_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);
\`\`\`

2. **应用到本地数据库**

\`\`\`bash
npm run db:init
\`\`\`

3. **应用到生产数据库**

\`\`\`bash
npm run db:migrate
\`\`\`

### 更新前端界面

前端代码嵌入在 \`src/index.ts\` 的 \`getIndexHTML()\` 函数中。

修改 HTML/CSS/JavaScript 后重启开发服务器即可看到效果。

## 🧪 测试

### 手动测试

1. **登录测试**

\`\`\`bash
curl -X POST http://localhost:8787/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'
\`\`\`

2. **API 测试**

\`\`\`bash
TOKEN="your-token-here"

# 获取学生课表
curl http://localhost:8787/api/student/schedule \\
  -H "Authorization: Bearer $TOKEN"

# 获取成绩
curl http://localhost:8787/api/student/grades \\
  -H "Authorization: Bearer $TOKEN"
\`\`\`

### 数据库查询测试

\`\`\`bash
# 查询本地数据库
wrangler d1 execute education-db --command="SELECT * FROM users" --local

# 查询生产数据库
wrangler d1 execute education-db --command="SELECT * FROM users"
\`\`\`

## 🔍 调试技巧

### 1. 查看 Workers 日志

\`\`\`bash
# 本地开发：直接在终端查看
npm run dev

# 生产环境：使用 wrangler tail
wrangler tail
\`\`\`

### 2. 添加调试日志

\`\`\`typescript
console.log('Debug info:', someVariable);
console.error('Error occurred:', error);
\`\`\`

### 3. 使用浏览器开发者工具

打开浏览器控制台查看：
- 网络请求
- JavaScript 错误
- API 响应

### 4. VS Code 调试

虽然 Workers 不支持断点调试，但可以：
- 使用 TypeScript 类型检查
- 在本地测试业务逻辑
- 使用 console.log 输出关键信息

## 📦 常用命令

\`\`\`bash
# 开发
npm run dev                    # 启动开发服务器
npm run deploy                 # 部署到生产环境

# 数据库
npm run db:init                # 初始化本地数据库
npm run db:migrate             # 初始化生产数据库
wrangler d1 execute education-db --command="SQL语句" --local  # 执行本地 SQL
wrangler d1 execute education-db --command="SQL语句"         # 执行生产 SQL

# Wrangler
wrangler login                 # 登录 Cloudflare
wrangler logout                # 登出
wrangler tail                  # 查看生产日志
wrangler deployments list      # 查看部署历史
wrangler rollback              # 回滚部署
\`\`\`

## 🎨 代码风格

### TypeScript

- 使用 TypeScript 严格模式
- 所有函数都要有类型声明
- 使用 async/await 而不是 Promise.then()
- 使用 const 声明常量

\`\`\`typescript
// ✅ 好
async function getUser(id: number): Promise<User | null> {
  const result = await db.query('SELECT * FROM users WHERE id = ?', id);
  return result.first();
}

// ❌ 差
function getUser(id) {
  return db.query('SELECT * FROM users WHERE id = ?', id).then(r => r.first());
}
\`\`\`

### SQL

- 使用参数化查询防止 SQL 注入
- 表名使用小写 + 下划线
- 索引命名：\`idx_表名_字段名\`

\`\`\`typescript
// ✅ 好
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).all();

// ❌ 差（SQL 注入风险）
const result = await env.DB.prepare(
  \`SELECT * FROM users WHERE id = \${userId}\`
).all();
\`\`\`

### API 设计

- RESTful 风格
- 使用合适的 HTTP 方法
- 返回标准 JSON 格式
- 错误信息要清晰

\`\`\`typescript
// ✅ 好
if (!user) {
  return jsonResponse({ error: 'User not found' }, 404);
}

// ❌ 差
if (!user) {
  return jsonResponse({ msg: 'err' }, 200);
}
\`\`\`

## 🔐 安全最佳实践

### 1. 认证和授权

- 所有非公开 API 都要验证 JWT
- 检查用户角色权限
- Token 设置合理的过期时间

\`\`\`typescript
const authUser = await authenticateRequest(request, env);
if (!authUser || !hasRole(authUser, 'admin')) {
  return jsonResponse({ error: 'Unauthorized' }, 401);
}
\`\`\`

### 2. 输入验证

- 验证所有用户输入
- 检查数据类型和范围
- 使用白名单验证

\`\`\`typescript
const { courseId, semesterId } = data;
if (!courseId || typeof courseId !== 'number') {
  throw new Error('Invalid courseId');
}
\`\`\`

### 3. 密码处理

- 永远不要明文存储密码
- 使用强哈希算法
- 实施密码复杂度要求

\`\`\`typescript
const passwordHash = await hashPassword(password);
// 存储 passwordHash，而不是 password
\`\`\`

### 4. SQL 注入防护

- 始终使用参数化查询
- 永远不要拼接 SQL 字符串

\`\`\`typescript
// ✅ 安全
env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id)

// ❌ 危险
env.DB.prepare(\`SELECT * FROM users WHERE id = \${id}\`)
\`\`\`

## 📊 性能优化

### 1. 数据库查询优化

- 使用索引加速查询
- 避免 SELECT *
- 使用批量操作

\`\`\`typescript
// ✅ 好
SELECT id, name, email FROM users WHERE id = ?

// ❌ 差
SELECT * FROM users WHERE id = ?
\`\`\`

### 2. 减少数据库往返

- 使用 JOIN 合并查询
- 批量插入/更新

\`\`\`typescript
// ✅ 好：一次查询
SELECT u.*, s.student_number 
FROM users u 
JOIN students s ON u.id = s.user_id

// ❌ 差：多次查询
const user = await getUser(id);
const student = await getStudent(user.id);
\`\`\`

### 3. 缓存策略

- 缓存不频繁变化的数据
- 使用 Cloudflare Cache API

\`\`\`typescript
const cache = caches.default;
const cachedResponse = await cache.match(request);
if (cachedResponse) {
  return cachedResponse;
}
\`\`\`

## 🐛 常见问题

### 问题：CORS 错误

**原因**：跨域请求被阻止

**解决**：确保所有响应都包含 CORS 头

\`\`\`typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
\`\`\`

### 问题：JWT 验证失败

**原因**：Token 过期或格式错误

**解决**：检查 Token 生成和验证逻辑，确保 JWT_SECRET 一致

### 问题：数据库连接失败

**原因**：database_id 未配置或错误

**解决**：检查 wrangler.toml 中的 database_id

## 📚 学习资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [SQLite 教程](https://www.sqlitetutorial.net/)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支：\`git checkout -b feature/amazing-feature\`
3. 提交更改：\`git commit -m 'Add amazing feature'\`
4. 推送到分支：\`git push origin feature/amazing-feature\`
5. 提交 Pull Request

## 📝 待办事项

- [ ] 添加单元测试
- [ ] 添加集成测试
- [ ] 实现更复杂的权限系统
- [ ] 添加数据导入/导出功能
- [ ] 实现成绩分析图表
- [ ] 添加通知系统
- [ ] 支持文件上传（头像、作业等）
- [ ] 实现更好的密码加密（bcrypt）
- [ ] 添加 API 限流
- [ ] 实现数据备份自动化

---

**祝开发愉快！** 🚀
