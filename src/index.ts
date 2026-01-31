import { Env, JWTPayload } from './types';
import { authenticateRequest, createJWT, verifyPassword, hasRole } from './auth';
import * as studentApi from './api/student';
import * as teacherApi from './api/teacher';
import * as adminApi from './api/admin';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 公开路由：登录
      if (path === '/api/login' && request.method === 'POST') {
        const { username, password } = await request.json() as any;
        
        const user = await env.DB.prepare(`
          SELECT id, username, password_hash, role, name
          FROM users
          WHERE username = ?
        `).bind(username).first();
        
        if (!user) {
          return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
        }
        
        const isValid = await verifyPassword(password, user.password_hash as string);
        if (!isValid) {
          return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
        }
        
        const token = await createJWT({
          userId: user.id as number,
          username: user.username as string,
          role: user.role as string,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
        }, env.JWT_SECRET);
        
        return jsonResponse({
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name
          }
        }, 200, corsHeaders);
      }

      // 所有其他路由需要认证
      const authUser = await authenticateRequest(request, env);
      if (!authUser) {
        return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
      }

      // ========== 学生端 API ==========
      if (path === '/api/student/schedule' && hasRole(authUser, 'student')) {
        const semesterId = url.searchParams.get('semesterId');
        const data = await studentApi.getStudentSchedule(env, authUser, semesterId ? parseInt(semesterId) : undefined);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/student/grades' && hasRole(authUser, 'student')) {
        const semesterId = url.searchParams.get('semesterId');
        const data = await studentApi.getStudentGrades(env, authUser, semesterId ? parseInt(semesterId) : undefined);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/student/ranking' && hasRole(authUser, 'student')) {
        const semesterId = parseInt(url.searchParams.get('semesterId') || '1');
        const data = await studentApi.getStudentRanking(env, authUser, semesterId);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/student/grade-trend' && hasRole(authUser, 'student')) {
        const data = await studentApi.getGradeTrend(env, authUser);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/student/evaluation/questions' && hasRole(authUser, 'student')) {
        const data = await studentApi.getEvaluationQuestions(env);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/student/evaluation/courses' && hasRole(authUser, 'student')) {
        const semesterId = parseInt(url.searchParams.get('semesterId') || '1');
        const data = await studentApi.getCoursesForEvaluation(env, authUser, semesterId);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/student/evaluation/submit' && request.method === 'POST' && hasRole(authUser, 'student')) {
        const body = await request.json();
        const data = await studentApi.submitEvaluation(env, authUser, body);
        return jsonResponse(data, 200, corsHeaders);
      }

      // ========== 教师端 API ==========
      if (path === '/api/teacher/schedule' && hasRole(authUser, 'teacher')) {
        const semesterId = url.searchParams.get('semesterId');
        const data = await teacherApi.getTeacherSchedule(env, authUser, semesterId ? parseInt(semesterId) : undefined);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/teacher/class-students' && hasRole(authUser, 'teacher')) {
        const classId = parseInt(url.searchParams.get('classId') || '0');
        const data = await teacherApi.getClassStudents(env, authUser, classId);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/teacher/upload-grades' && request.method === 'POST' && hasRole(authUser, 'teacher')) {
        const body = await request.json();
        const data = await teacherApi.uploadGrades(env, authUser, body);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/teacher/evaluation-results' && hasRole(authUser, 'teacher')) {
        const courseId = parseInt(url.searchParams.get('courseId') || '0');
        const semesterId = parseInt(url.searchParams.get('semesterId') || '1');
        const data = await teacherApi.getEvaluationResults(env, authUser, courseId, semesterId);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/teacher/reschedule-request' && request.method === 'POST' && hasRole(authUser, 'teacher')) {
        const body = await request.json();
        const data = await teacherApi.submitRescheduleRequest(env, authUser, body);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/teacher/substitute-request' && request.method === 'POST' && hasRole(authUser, 'teacher')) {
        const body = await request.json();
        const data = await teacherApi.submitSubstituteRequest(env, authUser, body);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/teacher/requests' && hasRole(authUser, 'teacher')) {
        const data = await teacherApi.getTeacherRequests(env, authUser);
        return jsonResponse(data, 200, corsHeaders);
      }

      // ========== 管理员端 API ==========
      if (path === '/api/admin/evaluation-questions' && hasRole(authUser, 'admin')) {
        if (request.method === 'GET') {
          const data = await adminApi.manageEvaluationQuestions(env, 'list', {});
          return jsonResponse(data, 200, corsHeaders);
        } else if (request.method === 'POST') {
          const body = await request.json() as any;
          const data = await adminApi.manageEvaluationQuestions(env, body.action, body);
          return jsonResponse(data, 200, corsHeaders);
        }
      }

      if (path === '/api/admin/evaluation-periods' && hasRole(authUser, 'admin')) {
        if (request.method === 'GET') {
          const data = await adminApi.manageEvaluationPeriods(env, 'list', {});
          return jsonResponse(data, 200, corsHeaders);
        } else if (request.method === 'POST') {
          const body = await request.json() as any;
          const data = await adminApi.manageEvaluationPeriods(env, body.action, body);
          return jsonResponse(data, 200, corsHeaders);
        }
      }

      if (path === '/api/admin/pending-requests' && hasRole(authUser, 'admin')) {
        const data = await adminApi.getPendingRequests(env);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/review-reschedule' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json() as any;
        const data = await adminApi.reviewRescheduleRequest(env, body.requestId, body.status, body.adminNote);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/review-substitute' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json() as any;
        const data = await adminApi.reviewSubstituteRequest(env, body.requestId, body.status, body.adminNote);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/grade-statistics' && hasRole(authUser, 'admin')) {
        const semesterId = url.searchParams.get('semesterId');
        const data = await adminApi.getSchoolGradeStatistics(env, semesterId ? parseInt(semesterId) : undefined);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/create-user' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json();
        const data = await adminApi.createUser(env, body);
        return jsonResponse(data, 200, corsHeaders);
      }

      // 静态文件服务（前端页面）
      if (path === '/' || path === '/index.html') {
        return new Response(getIndexHTML(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });
      }

      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);

    } catch (error: any) {
      console.error('Error:', error);
      return jsonResponse({ error: error.message || 'Internal server error' }, 500, corsHeaders);
    }
  }
};

function jsonResponse(data: any, status: number = 200, additionalHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  });
}

// 简单的首页 HTML
function getIndexHTML(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>高中教育管理系统</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Microsoft YaHei", Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px; width: 90%; max-width: 1200px; }
    h1 { color: #667eea; text-align: center; margin-bottom: 30px; font-size: 32px; }
    .login-form { max-width: 400px; margin: 0 auto; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; color: #333; font-weight: bold; }
    input, select { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; transition: border-color 0.3s; }
    input:focus, select:focus { outline: none; border-color: #667eea; }
    button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: transform 0.2s; }
    button:hover { transform: translateY(-2px); }
    .dashboard { display: none; }
    .dashboard.active { display: block; }
    .nav-tabs { display: flex; gap: 10px; margin-bottom: 30px; border-bottom: 2px solid #ddd; }
    .nav-tab { padding: 12px 24px; background: none; border: none; cursor: pointer; font-size: 16px; color: #666; border-bottom: 3px solid transparent; transition: all 0.3s; }
    .nav-tab.active { color: #667eea; border-bottom-color: #667eea; font-weight: bold; }
    .content-section { display: none; }
    .content-section.active { display: block; }
    .card { background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #667eea; }
    .card h3 { color: #667eea; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #667eea; color: white; font-weight: bold; }
    tr:hover { background: #f5f5f5; }
    .logout-btn { background: #dc3545; margin-top: 20px; }
    .error { color: #dc3545; margin-top: 10px; text-align: center; }
    .success { color: #28a745; margin-top: 10px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎓 高中教育管理系统</h1>
    
    <div id="loginSection" class="login-form">
      <div class="form-group">
        <label>用户名</label>
        <input type="text" id="username" placeholder="请输入用户名">
      </div>
      <div class="form-group">
        <label>密码</label>
        <input type="password" id="password" placeholder="请输入密码">
      </div>
      <button onclick="login()">登录</button>
      <div id="loginError" class="error"></div>
      <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; font-size: 14px;">
        <strong>测试账号：</strong><br>
        管理员: admin / admin123<br>
        （首次使用请先创建学生和教师账号）
      </div>
    </div>

    <div id="dashboardSection" class="dashboard">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>欢迎，<span id="userName"></span></h2>
        <button class="logout-btn" onclick="logout()">退出登录</button>
      </div>

      <div class="nav-tabs" id="navTabs"></div>
      <div id="contentArea"></div>
    </div>
  </div>

  <script>
    let currentUser = null;
    let authToken = null;

    async function login() {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('loginError');
      errorDiv.textContent = '';

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        authToken = data.token;
        currentUser = data.user;
        showDashboard();
      } catch (error) {
        errorDiv.textContent = error.message;
      }
    }

    function logout() {
      authToken = null;
      currentUser = null;
      document.getElementById('loginSection').style.display = 'block';
      document.getElementById('dashboardSection').classList.remove('active');
    }

    function showDashboard() {
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('dashboardSection').classList.add('active');
      document.getElementById('userName').textContent = currentUser.name;
      loadDashboardContent();
    }

    function loadDashboardContent() {
      const navTabs = document.getElementById('navTabs');
      const contentArea = document.getElementById('contentArea');
      
      if (currentUser.role === 'student') {
        navTabs.innerHTML = \`
          <button class="nav-tab active" onclick="showTab('schedule')">我的课表</button>
          <button class="nav-tab" onclick="showTab('grades')">成绩查询</button>
          <button class="nav-tab" onclick="showTab('evaluation')">期末评教</button>
        \`;
        loadStudentSchedule();
      } else if (currentUser.role === 'teacher') {
        navTabs.innerHTML = \`
          <button class="nav-tab active" onclick="showTab('schedule')">我的课表</button>
          <button class="nav-tab" onclick="showTab('students')">班级名单</button>
          <button class="nav-tab" onclick="showTab('grades')">成绩管理</button>
          <button class="nav-tab" onclick="showTab('requests')">调课代课</button>
        \`;
        loadTeacherSchedule();
      } else if (currentUser.role === 'admin') {
        navTabs.innerHTML = \`
          <button class="nav-tab active" onclick="showTab('requests')">待审核申请</button>
          <button class="nav-tab" onclick="showTab('statistics')">成绩统计</button>
          <button class="nav-tab" onclick="showTab('evaluation')">评教管理</button>
          <button class="nav-tab" onclick="showTab('users')">用户管理</button>
        \`;
        loadPendingRequests();
      }
    }

    function showTab(tab) {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      
      if (currentUser.role === 'student') {
        if (tab === 'schedule') loadStudentSchedule();
        else if (tab === 'grades') loadStudentGrades();
        else if (tab === 'evaluation') loadEvaluation();
      } else if (currentUser.role === 'teacher') {
        if (tab === 'schedule') loadTeacherSchedule();
        else if (tab === 'students') loadClassStudents();
        else if (tab === 'grades') loadGradeManagement();
        else if (tab === 'requests') loadTeacherRequests();
      } else if (currentUser.role === 'admin') {
        if (tab === 'requests') loadPendingRequests();
        else if (tab === 'statistics') loadStatistics();
        else if (tab === 'evaluation') loadEvaluationManagement();
        else if (tab === 'users') loadUserManagement();
      }
    }

    async function apiCall(endpoint, options = {}) {
      options.headers = {
        ...options.headers,
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json'
      };
      const response = await fetch(endpoint, options);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }
      return response.json();
    }

    // 学生功能
    async function loadStudentSchedule() {
      const data = await apiCall('/api/student/schedule');
      const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      let html = '<div class="card"><h3>📅 我的课表</h3><table><tr><th>星期</th><th>节次</th><th>课程</th><th>教室</th><th>教师</th><th>备注</th></tr>';
      data.forEach(item => {
        const note = item.is_substitute ? '(代课)' : item.is_rescheduled ? '(已调课)' : '';
        html += \`<tr><td>\${days[item.day_of_week]}</td><td>\${item.period_start}-\${item.period_end}</td><td>\${item.course_name}</td><td>\${item.building} \${item.room_number}</td><td>\${item.teacher_name}</td><td style="color: #dc3545;">\${note}</td></tr>\`;
      });
      html += '</table></div>';
      document.getElementById('contentArea').innerHTML = html;
    }

    async function loadStudentGrades() {
      const data = await apiCall('/api/student/grades');
      let html = '<div class="card"><h3>📊 成绩查询</h3><table><tr><th>课程</th><th>平时成绩</th><th>期中成绩</th><th>期末成绩</th><th>总评</th><th>状态</th></tr>';
      data.forEach(item => {
        const status = item.needs_makeup ? '<span style="color: #dc3545;">需补考</span>' : '<span style="color: #28a745;">通过</span>';
        html += \`<tr><td>\${item.course_name}</td><td>\${item.regular_score || '-'}</td><td>\${item.midterm_score || '-'}</td><td>\${item.final_score || '-'}</td><td><strong>\${item.total_score || '-'}</strong></td><td>\${status}</td></tr>\`;
      });
      html += '</table></div>';
      document.getElementById('contentArea').innerHTML = html;
    }

    async function loadEvaluation() {
      const courses = await apiCall('/api/student/evaluation/courses?semesterId=1');
      let html = '<div class="card"><h3>✍️ 期末评教</h3>';
      if (courses.length === 0) {
        html += '<p>暂无需要评教的课程</p>';
      } else {
        html += '<p>请对以下课程的教师进行评教：</p><ul>';
        courses.forEach(course => {
          const status = course.is_evaluated ? '✅ 已评教' : '⏳ 待评教';
          html += \`<li>\${course.course_name} - \${course.teacher_name} (\${status})</li>\`;
        });
        html += '</ul>';
      }
      html += '</div>';
      document.getElementById('contentArea').innerHTML = html;
    }

    // 教师功能
    async function loadTeacherSchedule() {
      const data = await apiCall('/api/teacher/schedule');
      const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      let html = '<div class="card"><h3>📅 我的课表</h3><table><tr><th>星期</th><th>节次</th><th>课程</th><th>班级</th><th>教室</th><th>备注</th></tr>';
      data.forEach(item => {
        const note = item.is_substitute ? '(代课)' : item.is_rescheduled ? '(已调课)' : '';
        html += \`<tr><td>\${days[item.day_of_week]}</td><td>\${item.period_start}-\${item.period_end}</td><td>\${item.course_name}</td><td>\${item.class_name}</td><td>\${item.building} \${item.room_number}</td><td style="color: #dc3545;">\${note}</td></tr>\`;
      });
      html += '</table></div>';
      document.getElementById('contentArea').innerHTML = html;
    }

    function loadClassStudents() {
      document.getElementById('contentArea').innerHTML = '<div class="card"><h3>👥 班级名单</h3><p>请先选择班级...</p></div>';
    }

    function loadGradeManagement() {
      document.getElementById('contentArea').innerHTML = '<div class="card"><h3>📝 成绩管理</h3><p>上传成绩功能...</p></div>';
    }

    function loadTeacherRequests() {
      document.getElementById('contentArea').innerHTML = '<div class="card"><h3>📋 调课代课申请</h3><p>查看申请记录和提交新申请...</p></div>';
    }

    // 管理员功能
    async function loadPendingRequests() {
      const data = await apiCall('/api/admin/pending-requests');
      let html = '<div class="card"><h3>⏳ 待审核的调课申请</h3>';
      if (data.rescheduleRequests.length === 0) {
        html += '<p>暂无待审核的调课申请</p>';
      } else {
        html += '<table><tr><th>教师</th><th>课程</th><th>班级</th><th>原因</th><th>类型</th><th>提交时间</th></tr>';
        data.rescheduleRequests.forEach(req => {
          html += \`<tr><td>\${req.teacher_name}</td><td>\${req.course_name}</td><td>\${req.class_name}</td><td>\${req.reason}</td><td>\${req.request_type === 'temporary' ? '临时' : '长期'}</td><td>\${new Date(req.created_at).toLocaleString()}</td></tr>\`;
        });
        html += '</table>';
      }
      html += '</div>';

      html += '<div class="card"><h3>⏳ 待审核的代课申请</h3>';
      if (data.substituteRequests.length === 0) {
        html += '<p>暂无待审核的代课申请</p>';
      } else {
        html += '<table><tr><th>原教师</th><th>代课教师</th><th>课程</th><th>原因</th><th>日期</th><th>提交时间</th></tr>';
        data.substituteRequests.forEach(req => {
          html += \`<tr><td>\${req.original_teacher_name}</td><td>\${req.substitute_teacher_name}</td><td>\${req.course_name}</td><td>\${req.reason}</td><td>\${req.substitute_date}</td><td>\${new Date(req.created_at).toLocaleString()}</td></tr>\`;
        });
        html += '</table>';
      }
      html += '</div>';
      
      document.getElementById('contentArea').innerHTML = html;
    }

    async function loadStatistics() {
      const data = await apiCall('/api/admin/grade-statistics');
      let html = \`<div class="card"><h3>📊 全校成绩统计</h3>
        <p>总学生数: <strong>\${data.overall.total_students}</strong> | 
        总课程数: <strong>\${data.overall.total_courses}</strong> | 
        平均分: <strong>\${data.overall.avg_score?.toFixed(2)}</strong> | 
        需补考: <strong style="color: #dc3545;">\${data.overall.makeup_count}</strong></p>
      </div>\`;

      html += '<div class="card"><h3>📈 分数段分布</h3><table><tr><th>分数段</th><th>人次</th></tr>';
      data.distribution.forEach(item => {
        html += \`<tr><td>\${item.score_range}</td><td>\${item.count}</td></tr>\`;
      });
      html += '</table></div>';

      html += '<div class="card"><h3>📚 各科平均分</h3><table><tr><th>课程</th><th>平均分</th><th>学生数</th></tr>';
      data.courseAverages.forEach(item => {
        html += \`<tr><td>\${item.course_name}</td><td>\${item.avg_score?.toFixed(2)}</td><td>\${item.student_count}</td></tr>\`;
      });
      html += '</table></div>';

      document.getElementById('contentArea').innerHTML = html;
    }

    function loadEvaluationManagement() {
      document.getElementById('contentArea').innerHTML = '<div class="card"><h3>✍️ 评教管理</h3><p>管理评教题目和评教期...</p></div>';
    }

    function loadUserManagement() {
      document.getElementById('contentArea').innerHTML = '<div class="card"><h3>👤 用户管理</h3><p>创建和管理用户...</p></div>';
    }
  </script>
</body>
</html>
  `.trim();
}
