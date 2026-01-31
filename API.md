# API 使用文档

本文档详细说明系统所有 API 端点的使用方法。

## 🔐 认证

除了登录接口，所有 API 都需要在请求头中携带 JWT Token：

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## 📝 公开接口

### 登录

**POST** \`/api/login\`

登录并获取访问令牌。

**请求体：**
\`\`\`json
{
  "username": "admin",
  "password": "admin123"
}
\`\`\`

**响应：**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "name": "系统管理员"
  }
}
\`\`\`

---

## 🎓 学生端接口

### 获取课表

**GET** \`/api/student/schedule?semesterId=1\`

获取学生的课程表。

**查询参数：**
- \`semesterId\`（可选）：学期 ID，不提供则返回当前学期

**响应：**
\`\`\`json
[
  {
    "id": 1,
    "day_of_week": 1,
    "period_start": 1,
    "period_end": 2,
    "course_name": "数学",
    "course_code": "MATH101",
    "room_number": "101",
    "building": "教学楼A",
    "teacher_name": "张老师",
    "is_substitute": 0,
    "is_rescheduled": 0
  }
]
\`\`\`

### 获取成绩

**GET** \`/api/student/grades?semesterId=1\`

获取学生的成绩列表。

**查询参数：**
- \`semesterId\`（可选）：学期 ID

**响应：**
\`\`\`json
[
  {
    "id": 1,
    "course_name": "数学",
    "course_code": "MATH101",
    "regular_score": 85.0,
    "midterm_score": 88.0,
    "final_score": 90.0,
    "total_score": 88.1,
    "needs_makeup": 0,
    "semester_name": "2025-2026学年第二学期",
    "teacher_name": "张老师"
  }
]
\`\`\`

### 获取年级排名

**GET** \`/api/student/ranking?semesterId=1\`

获取学生在年级中的排名信息。

**查询参数：**
- \`semesterId\`（必需）：学期 ID

**响应：**
\`\`\`json
{
  "rank": 15,
  "totalStudents": 200,
  "percentile": 92.5,
  "avgScore": 88.1
}
\`\`\`

### 获取成绩趋势

**GET** \`/api/student/grade-trend\`

获取历史学期的成绩变化趋势。

**响应：**
\`\`\`json
[
  {
    "semester_name": "2025-2026学年第一学期",
    "start_date": "2025-09-01",
    "course_name": "数学",
    "total_score": 85.5
  },
  {
    "semester_name": "2025-2026学年第二学期",
    "start_date": "2026-02-01",
    "course_name": "数学",
    "total_score": 88.1
  }
]
\`\`\`

### 获取评教题目

**GET** \`/api/student/evaluation/questions\`

获取当前可用的评教题目。

**响应：**
\`\`\`json
[
  {
    "id": 1,
    "question_text": "教师授课内容清晰易懂",
    "question_type": "rating",
    "order_number": 1
  },
  {
    "id": 5,
    "question_text": "您对该教师的其他意见和建议",
    "question_type": "text",
    "order_number": 5
  }
]
\`\`\`

### 获取待评教课程

**GET** \`/api/student/evaluation/courses?semesterId=1\`

获取需要评教的课程列表。

**查询参数：**
- \`semesterId\`（必需）：学期 ID

**响应：**
\`\`\`json
[
  {
    "course_id": 1,
    "course_name": "数学",
    "teacher_id": 1,
    "teacher_name": "张老师",
    "is_evaluated": 0
  }
]
\`\`\`

### 提交评教

**POST** \`/api/student/evaluation/submit\`

提交对教师的评教。

**请求体：**
\`\`\`json
{
  "teacherId": 1,
  "courseId": 1,
  "semesterId": 1,
  "answers": [
    {
      "questionId": 1,
      "ratingScore": 5
    },
    {
      "questionId": 5,
      "textAnswer": "老师讲课很好"
    }
  ]
}
\`\`\`

**响应：**
\`\`\`json
{
  "success": true
}
\`\`\`

---

## 👨‍🏫 教师端接口

### 获取课表

**GET** \`/api/teacher/schedule?semesterId=1\`

获取教师的授课安排。

**查询参数：**
- \`semesterId\`（可选）：学期 ID

**响应：**
\`\`\`json
[
  {
    "id": 1,
    "day_of_week": 1,
    "period_start": 1,
    "period_end": 2,
    "course_name": "数学",
    "course_code": "MATH101",
    "class_name": "高一(1)班",
    "grade": 10,
    "room_number": "101",
    "building": "教学楼A",
    "is_substitute": 0,
    "is_rescheduled": 0
  }
]
\`\`\`

### 获取班级学生名单

**GET** \`/api/teacher/class-students?classId=1\`

获取指定班级的学生名单。

**查询参数：**
- \`classId\`（必需）：班级 ID

**响应：**
\`\`\`json
[
  {
    "id": 1,
    "student_number": "2024001",
    "name": "张三",
    "email": "zhangsan@example.com",
    "class_name": "高一(1)班",
    "grade": 10
  }
]
\`\`\`

### 上传成绩

**POST** \`/api/teacher/upload-grades\`

批量上传或更新学生成绩。

**请求体：**
\`\`\`json
{
  "courseId": 1,
  "semesterId": 1,
  "grades": [
    {
      "studentId": 1,
      "regularScore": 85.0,
      "midtermScore": 88.0,
      "finalScore": 90.0
    },
    {
      "studentId": 2,
      "regularScore": 78.0,
      "midtermScore": 82.0,
      "finalScore": 85.0
    }
  ]
}
\`\`\`

**响应：**
\`\`\`json
{
  "success": true,
  "gradesUploaded": 2
}
\`\`\`

### 查看评教结果

**GET** \`/api/teacher/evaluation-results?courseId=1&semesterId=1\`

查看学生对该课程的评教结果汇总。

**查询参数：**
- \`courseId\`（必需）：课程 ID
- \`semesterId\`（必需）：学期 ID

**响应：**
\`\`\`json
[
  {
    "question_text": "教师授课内容清晰易懂",
    "question_type": "rating",
    "avg_rating": 4.5,
    "response_count": 30
  },
  {
    "question_text": "您对该教师的其他意见和建议",
    "question_type": "text",
    "avg_rating": null,
    "response_count": 25
  }
]
\`\`\`

### 提交调课申请

**POST** \`/api/teacher/reschedule-request\`

提交调课申请。

**请求体：**
\`\`\`json
{
  "scheduleId": 1,
  "reason": "临时有事需要调课",
  "requestType": "temporary",
  "originalDate": "2026-03-15",
  "newDate": "2026-03-16",
  "newDayOfWeek": 2,
  "newPeriodStart": 3,
  "newPeriodEnd": 4,
  "newClassroomId": 2
}
\`\`\`

**响应：**
\`\`\`json
{
  "success": true,
  "requestId": 1
}
\`\`\`

### 提交代课申请

**POST** \`/api/teacher/substitute-request\`

提交代课申请。

**请求体：**
\`\`\`json
{
  "scheduleId": 1,
  "substituteTeacherId": 2,
  "reason": "病假需要代课",
  "substituteDate": "2026-03-15"
}
\`\`\`

**响应：**
\`\`\`json
{
  "success": true,
  "requestId": 1
}
\`\`\`

### 获取申请记录

**GET** \`/api/teacher/requests\`

获取教师的所有调课和代课申请记录。

**响应：**
\`\`\`json
{
  "rescheduleRequests": [
    {
      "id": 1,
      "course_name": "数学",
      "class_name": "高一(1)班",
      "reason": "临时有事",
      "request_type": "temporary",
      "status": "pending",
      "created_at": "2026-03-10T10:00:00Z"
    }
  ],
  "substituteRequests": [
    {
      "id": 1,
      "course_name": "数学",
      "class_name": "高一(1)班",
      "substitute_teacher_name": "李老师",
      "reason": "病假",
      "substitute_date": "2026-03-15",
      "status": "approved",
      "created_at": "2026-03-10T10:00:00Z"
    }
  ]
}
\`\`\`

---

## 🛡️ 管理员端接口

### 获取待审核申请

**GET** \`/api/admin/pending-requests\`

获取所有待审核的调课和代课申请。

**响应：**
\`\`\`json
{
  "rescheduleRequests": [
    {
      "id": 1,
      "teacher_name": "张老师",
      "course_name": "数学",
      "class_name": "高一(1)班",
      "reason": "临时有事",
      "request_type": "temporary",
      "created_at": "2026-03-10T10:00:00Z"
    }
  ],
  "substituteRequests": [
    {
      "id": 1,
      "original_teacher_name": "张老师",
      "substitute_teacher_name": "李老师",
      "course_name": "数学",
      "reason": "病假",
      "substitute_date": "2026-03-15",
      "created_at": "2026-03-10T10:00:00Z"
    }
  ]
}
\`\`\`

### 审核调课申请

**POST** \`/api/admin/review-reschedule\`

审核调课申请。

**请求体：**
\`\`\`json
{
  "requestId": 1,
  "status": "approved",
  "adminNote": "同意调课"
}
\`\`\`

\`status\` 可选值：\`approved\` 或 \`rejected\`

**响应：**
\`\`\`json
{
  "success": true
}
\`\`\`

### 审核代课申请

**POST** \`/api/admin/review-substitute\`

审核代课申请。

**请求体：**
\`\`\`json
{
  "requestId": 1,
  "status": "approved",
  "adminNote": "同意代课"
}
\`\`\`

**响应：**
\`\`\`json
{
  "success": true
}
\`\`\`

### 获取成绩统计

**GET** \`/api/admin/grade-statistics?semesterId=1\`

获取全校成绩统计数据。

**查询参数：**
- \`semesterId\`（可选）：学期 ID

**响应：**
\`\`\`json
{
  "overall": {
    "total_students": 500,
    "total_courses": 10,
    "avg_score": 78.5,
    "makeup_count": 25
  },
  "distribution": [
    {
      "score_range": "优秀 (90-100)",
      "count": 120
    },
    {
      "score_range": "良好 (80-89)",
      "count": 180
    }
  ],
  "courseAverages": [
    {
      "course_name": "数学",
      "avg_score": 82.5,
      "student_count": 500
    }
  ],
  "makeupStudents": [
    {
      "student_name": "张三",
      "student_number": "2024001",
      "class_name": "高一(1)班",
      "course_name": "数学",
      "total_score": 55.0
    }
  ]
}
\`\`\`

### 管理评教题目

**GET** \`/api/admin/evaluation-questions\`

获取所有评教题目。

**POST** \`/api/admin/evaluation-questions\`

创建、更新或删除评教题目。

**请求体（创建）：**
\`\`\`json
{
  "action": "create",
  "questionText": "教师教学方法是否灵活",
  "questionType": "rating",
  "orderNumber": 6
}
\`\`\`

**请求体（更新）：**
\`\`\`json
{
  "action": "update",
  "id": 1,
  "questionText": "教师授课内容是否清晰",
  "questionType": "rating",
  "orderNumber": 1,
  "isActive": true
}
\`\`\`

**请求体（删除）：**
\`\`\`json
{
  "action": "delete",
  "id": 1
}
\`\`\`

### 管理评教期

**GET** \`/api/admin/evaluation-periods\`

获取所有评教期。

**POST** \`/api/admin/evaluation-periods\`

创建或切换评教期。

**请求体（创建）：**
\`\`\`json
{
  "action": "create",
  "semesterId": 1,
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-06-30T23:59:59Z"
}
\`\`\`

**请求体（切换）：**
\`\`\`json
{
  "action": "toggle",
  "id": 1,
  "isActive": true
}
\`\`\`

### 创建用户

**POST** \`/api/admin/create-user\`

创建新的学生或教师账号。

**请求体（学生）：**
\`\`\`json
{
  "username": "student001",
  "password": "password123",
  "role": "student",
  "name": "张三",
  "email": "zhangsan@example.com",
  "additionalInfo": {
    "studentNumber": "2024001",
    "classId": 1,
    "grade": 10
  }
}
\`\`\`

**请求体（教师）：**
\`\`\`json
{
  "username": "teacher001",
  "password": "password123",
  "role": "teacher",
  "name": "李老师",
  "email": "liteacher@example.com",
  "additionalInfo": {
    "teacherNumber": "T001",
    "department": "数学组",
    "title": "高级教师"
  }
}
\`\`\`

**响应：**
\`\`\`json
{
  "success": true,
  "userId": 10
}
\`\`\`

---

## ⚠️ 错误响应

所有接口在发生错误时返回以下格式：

**状态码 401（未授权）：**
\`\`\`json
{
  "error": "Unauthorized"
}
\`\`\`

**状态码 404（未找到）：**
\`\`\`json
{
  "error": "Not found"
}
\`\`\`

**状态码 500（服务器错误）：**
\`\`\`json
{
  "error": "Internal server error"
}
\`\`\`

**其他业务错误：**
\`\`\`json
{
  "error": "具体错误信息"
}
\`\`\`

---

## 📚 使用示例

### JavaScript/Fetch

\`\`\`javascript
// 登录
const loginResponse = await fetch('https://你的应用.workers.dev/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const { token } = await loginResponse.json();

// 使用 token 调用其他 API
const scheduleResponse = await fetch('https://你的应用.workers.dev/api/student/schedule', {
  headers: { 'Authorization': \`Bearer \${token}\` }
});
const schedule = await scheduleResponse.json();
\`\`\`

### cURL

\`\`\`bash
# 登录
curl -X POST https://你的应用.workers.dev/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'

# 使用 token
TOKEN="你的token"
curl https://你的应用.workers.dev/api/student/schedule \\
  -H "Authorization: Bearer $TOKEN"
\`\`\`

### Python/Requests

\`\`\`python
import requests

# 登录
response = requests.post(
    'https://你的应用.workers.dev/api/login',
    json={'username': 'admin', 'password': 'admin123'}
)
token = response.json()['token']

# 使用 token
headers = {'Authorization': f'Bearer {token}'}
schedule = requests.get(
    'https://你的应用.workers.dev/api/student/schedule',
    headers=headers
).json()
\`\`\`

---

**提示**：所有日期时间使用 ISO 8601 格式（如 \`2026-03-15T10:00:00Z\`）
