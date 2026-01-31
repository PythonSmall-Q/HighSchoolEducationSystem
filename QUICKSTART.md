# 快速开始指南

本指南将帮助您在 5 分钟内快速部署并运行高中教育管理系统。

## ⚡ 快速部署步骤

### 第一步：准备工作（1分钟）

1. 确保已安装 Node.js 18 或更高版本
2. 注册 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费）

### 第二步：安装依赖（1分钟）

打开终端，在项目目录下运行：

\`\`\`bash
npm install
npm install -g wrangler  # 安装 Cloudflare CLI 工具
wrangler login           # 登录 Cloudflare 账号
\`\`\`

### 第三步：创建数据库（1分钟）

\`\`\`bash
# 创建 D1 数据库
wrangler d1 create education-db
\`\`\`

复制返回的 \`database_id\`，编辑 \`wrangler.toml\` 文件：

\`\`\`toml
[[d1_databases]]
binding = "DB"
database_name = "education-db"
database_id = "粘贴你的database_id"  # 在这里粘贴
\`\`\`

### 第四步：初始化数据库（1分钟）

\`\`\`bash
# 创建数据库表结构
wrangler d1 execute education-db --file=./schema.sql

# （可选）填充示例数据
wrangler d1 execute education-db --file=./sample-data.sql
\`\`\`

### 第五步：部署应用（1分钟）

\`\`\`bash
npm run deploy
\`\`\`

部署成功后，会显示您的应用 URL，例如：
\`\`\`
✨ https://high-school-education-system.你的账号.workers.dev
\`\`\`

### 第六步：开始使用 ✅

访问显示的 URL，使用默认管理员账号登录：

- **用户名**：\`admin\`
- **密码**：\`admin123\`

如果导入了示例数据，还可以使用：

- **教师账号**：\`teacher_zhang\` / \`teacher123\`
- **学生账号**：\`student_001\` / \`student123\`

---

## 🖥️ 本地开发

如果您想在本地开发或测试，执行以下步骤：

\`\`\`bash
# 1. 初始化本地数据库
npm run db:init

# 2. （可选）填充示例数据
wrangler d1 execute education-db --file=./sample-data.sql --local

# 3. 启动开发服务器
npm run dev
\`\`\`

访问 http://localhost:8787

---

## 📱 系统功能概览

### 学生端
- ✅ 查看课表
- ✅ 查看成绩（平时、期中、期末）
- ✅ 年级排名查询
- ✅ 成绩趋势分析
- ✅ 期末评教

### 教师端
- ✅ 查看课表
- ✅ 下载班级名单
- ✅ 上传成绩
- ✅ 查看评教结果
- ✅ 调课申请
- ✅ 代课申请

### 管理员端
- ✅ 评教管理
- ✅ 审核调课/代课申请
- ✅ 全校成绩统计
- ✅ 用户管理

---

## 🔧 常见问题

### Q: 部署失败，提示认证错误
A: 运行 \`wrangler logout\` 然后 \`wrangler login\` 重新登录

### Q: 数据库连接失败
A: 检查 \`wrangler.toml\` 中的 \`database_id\` 是否正确填写

### Q: 忘记管理员密码
A: 查看 \`schema.sql\` 文件，重新执行数据库初始化

### Q: 如何更新应用
A: 修改代码后，再次运行 \`npm run deploy\`

### Q: 如何查看日志
A: 运行 \`wrangler tail\` 查看实时日志

---

## 📚 下一步

- 📖 阅读 [完整文档](README.md)
- 🚀 查看 [部署指南](DEPLOYMENT.md)
- 💻 学习 [开发文档](DEVELOPMENT.md)
- 🔌 查阅 [API 文档](API.md)

---

## 🆘 需要帮助？

- 查看 [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- 提交 [GitHub Issue](../../issues)
- 访问 [Cloudflare 社区](https://community.cloudflare.com/)

---

**恭喜！您已成功部署高中教育管理系统！** 🎉

现在可以：
1. 🔐 登录系统体验功能
2. 👥 创建学生和教师账号
3. 📊 录入课程和成绩数据
4. 🎓 开始使用完整的教育管理功能

⚠️ **重要提醒**：首次登录后请立即修改管理员密码！
