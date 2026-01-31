# 🎓 高中教育管理系统

基于 **Cloudflare Workers** 和 **D1 数据库**的现代化高中教育管理系统，提供学生、教师、管理员三端完整功能。

## ✨ 核心特性

### 🎨 前端界面
- 现代化响应式设计，支持移动端
- 渐变背景、动画效果、卡片式布局
- 模态对话框、徽章组件、统计卡片
- 平滑过渡动画和悬停效果

### 👨‍🎓 学生端功能
- **课表查询**：查看个人课程表，显示调课/代课状态
- **成绩查询**：查看各科成绩（平时/期中/期末/总评）
- **排名分析**：查看年级排名、百分比和平均分
- **期末评教**：对每位授课老师进行11项评教（5项评分+6项文本）
- **补考提醒**：自动识别需补考学生（总评<60分 且 年级后5%）

### 👨‍🏫 教师端功能
- **课表管理**：查看个人教学课表
- **班级名单**：查看所教班级的学生名单
- **成绩管理**：录入和管理学生成绩
  - 支持有/无期中考试的课程（不同权重计算）
  - 平时30% + 期中20% + 期末50%（有期中）
  - 平时30% + 期末70%（无期中）
- **补考管理**：查看需补考学生并录入补考成绩
- **调课申请**：提交调课/代课申请
- **评教结果**：查看学生评教反馈

### 👨‍💼 管理员端功能
- **数据概览**：全校学生数、课程数、平均分、补考人数统计
- **排课管理**：创建、修改、删除课程表，自动检测时间冲突
- **申请审核**：审核教师的调课/代课申请
- **补考审批**：二级审批流程
  1. 审批补考资格（总评<60 且 年级后5%）
  2. 审批补考成绩（教师录入后）
- **成绩统计**：
  - 分数段分布（90-100, 80-89, 70-79, 60-69, <60）
  - 各科平均分排行
- **评教管理**：管理评教题目和评教期
- **用户管理**：创建和管理用户账号
- **批量操作**：批量创建学生账号
- **课程设置**：设置课程是否有期中考试

### 🔐 通用功能
- JWT 身份认证，24小时有效期
- 基于角色的权限控制（RBAC）
- 所有用户可修改密码（需验证旧密码）
- 密码 SHA-256 加密存储

## 🏗️ 技术架构

### 后端技术栈
- **Cloudflare Workers**：边缘计算平台，全球分布式部署
- **Cloudflare D1**：SQLite 边缘数据库
- **TypeScript**：类型安全的开发体验
- **Web Crypto API**：密码加密和 JWT 签名

### 数据库设计
- 14张核心表：用户、学生、教师、课程、班级、教室、学期、课程表、成绩、评教、申请等
- 外键约束保证数据完整性
- 索引优化查询性能

### API 设计
- RESTful API 设计
- 30+ API 端点
- 参数化查询防止 SQL 注入
- 统一错误处理和响应格式

## 📦 项目结构

```
HighSchoolEducationSystem/
├── src/
│   ├── index.ts              # Workers 入口、路由处理
│   ├── types.ts              # TypeScript 类型定义
│   ├── auth.ts               # 认证授权逻辑
│   ├── api/
│   │   ├── student.ts        # 学生端 API
│   │   ├── teacher.ts        # 教师端 API
│   │   └── admin.ts          # 管理员端 API
│   ├── frontend.html         # 前端 HTML 模板（仅参考）
│   └── frontend-app.js       # 前端 JavaScript（嵌入到 index.ts）
├── database/
│   ├── schema.sql            # 数据库表结构
│   └── sample-data.sql       # 示例数据
├── wrangler.toml             # Cloudflare 配置
├── package.json              # 项目依赖
└── README.md                 # 本文件
```

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装 Node.js (推荐 v18+)
# 安装 Cloudflare CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 克隆项目
git clone <repository-url>
cd HighSchoolEducationSystem

# 安装依赖
npm install
```

### 2. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create education-db

# 记录输出的 database_id，更新到 wrangler.toml 的 [[d1_databases]] 部分
```

更新 `wrangler.toml`：
```toml
[[d1_databases]]
binding = "DB"
database_name = "education-db"
database_id = "你的-database-id"
```

### 3. 初始化数据库

```bash
# 执行建表 SQL
wrangler d1 execute education-db --file=./database/schema.sql

# 导入示例数据（可选）
wrangler d1 execute education-db --file=./database/sample-data.sql
```

### 4. 设置 JWT 密钥

```bash
# 生成随机密钥（或使用你自己的）
echo "your-super-secret-jwt-key-change-this-in-production" | wrangler secret put JWT_SECRET
```

### 5. 本地开发

```bash
# 启动本地开发服务器
npm run dev

# 访问 http://localhost:8787
```

### 6. 部署到生产环境

```bash
# 构建并部署
npm run deploy

# 部署成功后，访问 Cloudflare 提供的 URL
# 例如：https://education-system.your-subdomain.workers.dev
```

## 🧪 测试账号

### 管理员
- 用户名：`admin`
- 密码：`admin123`

### 教师示例
- 用户名：`teacher1`
- 密码：`teacher123`

### 学生示例
- 用户名：`student001`
- 密码：`student123`

## 📚 API 文档

### 公开接口

#### POST /api/login
登录认证，返回 JWT token。

**请求体：**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "name": "系统管理员"
  }
}
```

### 学生端 API（需 student 角色）

- `GET /api/student/schedule` - 查询课表
- `GET /api/student/grades` - 查询成绩
- `GET /api/student/ranking?semesterId=1` - 查询排名
- `GET /api/student/grade-trend` - 成绩趋势
- `GET /api/student/evaluation/questions` - 获取评教题目
- `GET /api/student/evaluation/courses?semesterId=1` - 需评教的课程
- `POST /api/student/evaluation/submit` - 提交评教

### 教师端 API（需 teacher 角色）

- `GET /api/teacher/schedule` - 查询课表
- `GET /api/teacher/classes` - 我的班级
- `GET /api/teacher/students?scheduleId=1` - 班级学生名单
- `POST /api/teacher/upload-grades` - 上传成绩
- `GET /api/teacher/makeup-students` - 需补考学生
- `POST /api/teacher/upload-makeup-scores` - 上传补考成绩
- `POST /api/teacher/request-reschedule` - 申请调课
- `POST /api/teacher/request-substitute` - 申请代课
- `GET /api/teacher/requests` - 我的申请记录

### 管理员端 API（需 admin 角色）

- `GET /api/admin/grade-statistics` - 成绩统计
- `GET /api/admin/pending-requests` - 待审核申请
- `POST /api/admin/review-reschedule` - 审核调课
- `POST /api/admin/review-substitute` - 审核代课
- `GET /api/admin/pending-makeup-requests` - 待审批补考申请
- `POST /api/admin/approve-makeup` - 审批补考资格
- `GET /api/admin/pending-makeup-scores` - 待审批补考成绩
- `POST /api/admin/approve-makeup-score` - 审批补考成绩
- `POST /api/admin/schedules` - 创建课程表
- `DELETE /api/admin/schedules?scheduleId=1` - 删除课程表
- `GET /api/admin/schedules` - 查询课程表
- `GET /api/admin/courses` - 所有课程
- `POST /api/admin/update-course` - 更新课程设置
- `GET /api/admin/teachers` - 所有教师
- `GET /api/admin/classes` - 所有班级
- `GET /api/admin/classrooms` - 所有教室
- `POST /api/admin/batch-create-students` - 批量创建学生

### 通用 API（所有角色）

- `POST /api/change-password` - 修改密码

## 🔧 高级配置

### 自定义评教题目

编辑 `database/schema.sql` 中的 `evaluation_questions` 表数据：

```sql
INSERT INTO evaluation_questions (question_text, question_type) VALUES
  ('您对老师的教学方法满意吗？', 'rating'),
  ('您对老师的课堂管理满意吗？', 'rating'),
  ('请描述老师教学的优点', 'text');
```

### 自定义成绩权重

在 `src/api/teacher.ts` 的 `uploadGrades()` 函数中修改：

```typescript
// 有期中考试：平时30% + 期中20% + 期末50%
const totalScore = regularScore * 0.3 + midtermScore * 0.2 + finalScore * 0.5;

// 无期中考试：平时30% + 期末70%
const totalScore = regularScore * 0.3 + finalScore * 0.7;
```

### 自定义补考条件

在 `src/api/student.ts` 的 `getStudentRanking()` 函数中修改：

```typescript
const requiresMakeup = avgScore < 60 && isBottom5Percent;
// 改为：const requiresMakeup = avgScore < 50 && isBottom10Percent;
```

## 📊 数据库架构

### 核心表结构

```
users (用户表)
  ├── students (学生详情)
  └── teachers (教师详情)

courses (课程表)
  └── schedules (课程表)
      ├── grades (成绩记录)
      └── evaluations (评教记录)

classes (班级表)
classrooms (教室表)
semesters (学期表)

reschedule_requests (调课申请)
substitute_requests (代课申请)
```

### 关键字段说明

**courses 表：**
- `has_midterm_exam`: BOOLEAN - 是否有期中考试

**grades 表：**
- `makeup_approved`: BOOLEAN - 补考资格是否批准
- `makeup_score`: REAL - 补考成绩
- `makeup_passed`: BOOLEAN - 补考是否通过
- `makeup_approved_final`: BOOLEAN - 补考成绩是否批准

**evaluation_questions 表：**
- 共11题：5题rating（评分）+ 6题text（文本）

## 🐛 常见问题

### Q: 提示 "Unauthorized" 无法访问 API？
A: 确保请求头包含正确的 JWT token：`Authorization: Bearer <token>`

### Q: 为什么创建课程表提示时间冲突？
A: 系统会检查教师、班级、教室是否有时间冲突，确保同一时间段没有重复排课。

### Q: 补考学生为什么需要两次审批？
A: 
1. 第一次审批：管理员确认学生符合补考条件（<60分 且 后5%）
2. 第二次审批：教师录入补考成绩后，管理员审核成绩是否有效

### Q: 如何批量导入学生数据？
A: 使用 `/api/admin/batch-create-students` 接口，传入学生数组：
```json
{
  "students": [
    {"studentNumber": "20240001", "name": "张三", "grade": 10, "classId": 1},
    {"studentNumber": "20240002", "name": "李四", "grade": 10, "classId": 1}
  ]
}
```

### Q: 前端页面样式错乱？
A: 确保浏览器支持 CSS3 和现代 JavaScript。推荐使用最新版 Chrome/Edge/Firefox。

## 🔒 安全建议

1. **JWT 密钥**：生产环境务必使用强随机字符串（至少32位）
2. **密码策略**：建议增加密码复杂度要求
3. **HTTPS**：Cloudflare Workers 自动提供 HTTPS
4. **访问控制**：确保角色权限正确配置
5. **输入验证**：所有用户输入都经过验证和清理

## 🎯 未来规划

- [ ] 增加家长端功能
- [ ] 消息通知系统（邮件/短信）
- [ ] 考勤管理模块
- [ ] 作业管理系统
- [ ] 成绩导出（Excel/PDF）
- [ ] 数据可视化仪表板
- [ ] 移动端 APP（React Native）
- [ ] 实时聊天功能（WebSocket）

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请在 GitHub 上提交 Issue。

---

**注意：** 本系统为教育管理演示项目，生产环境使用前请进行充分测试和安全加固。
