// 全局变量
let currentUser = null;
let authToken = null;

// API 调用辅助函数
async function apiCall(endpoint, options = {}) {
  options.headers = {
    ...options.headers,
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// 登录功能
async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');
  errorDiv.textContent = '';
  errorDiv.className = '';

  if (!username || !password) {
    errorDiv.textContent = '请输入用户名和密码';
    errorDiv.className = 'error';
    return;
  }

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
    errorDiv.className = 'error';
  }
}

// 退出登录
function logout() {
  authToken = null;
  currentUser = null;
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('dashboardSection').classList.remove('active');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

// 显示仪表板
function showDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboardSection').classList.add('active');
  document.getElementById('userName').textContent = currentUser.name;
  loadDashboardContent();
}

// 加载仪表板内容
function loadDashboardContent() {
  const navTabs = document.getElementById('navTabs');
  
  if (currentUser.role === 'student') {
    navTabs.innerHTML = `
      <button class="nav-tab active" onclick="showTab('schedule')">📅 我的课表</button>
      <button class="nav-tab" onclick="showTab('grades')">📊 成绩查询</button>
      <button class="nav-tab" onclick="showTab('ranking')">🏆 排名分析</button>
      <button class="nav-tab" onclick="showTab('evaluation')">✍️ 期末评教</button>
    `;
    loadStudentSchedule();
  } else if (currentUser.role === 'teacher') {
    navTabs.innerHTML = `
      <button class="nav-tab active" onclick="showTab('schedule')">📅 我的课表</button>
      <button class="nav-tab" onclick="showTab('students')">👥 班级名单</button>
      <button class="nav-tab" onclick="showTab('grades')">📝 成绩管理</button>
      <button class="nav-tab" onclick="showTab('makeup')">🔄 补考管理</button>
      <button class="nav-tab" onclick="showTab('requests')">📋 调课代课</button>
      <button class="nav-tab" onclick="showTab('evaluation')">⭐ 评教结果</button>
    `;
    loadTeacherSchedule();
  } else if (currentUser.role === 'admin') {
    navTabs.innerHTML = `
      <button class="nav-tab active" onclick="showTab('overview')">📊 数据概览</button>
      <button class="nav-tab" onclick="showTab('schedules')">📅 排课管理</button>
      <button class="nav-tab" onclick="showTab('requests')">📋 申请审核</button>
      <button class="nav-tab" onclick="showTab('makeup')">🔄 补考审批</button>
      <button class="nav-tab" onclick="showTab('statistics')">📈 成绩统计</button>
      <button class="nav-tab" onclick="showTab('evaluation')">✍️ 评教管理</button>
      <button class="nav-tab" onclick="showTab('users')">👤 用户管理</button>
      <button class="nav-tab" onclick="showTab('courses')">📚 课程管理</button>
    `;
    loadAdminOverview();
  }
}

// 切换标签
function showTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  if (currentUser.role === 'student') {
    if (tab === 'schedule') loadStudentSchedule();
    else if (tab === 'grades') loadStudentGrades();
    else if (tab === 'ranking') loadStudentRanking();
    else if (tab === 'evaluation') loadEvaluationPage();
  } else if (currentUser.role === 'teacher') {
    if (tab === 'schedule') loadTeacherSchedule();
    else if (tab === 'students') loadClassStudentsPage();
    else if (tab === 'grades') loadGradeManagementPage();
    else if (tab === 'makeup') loadTeacherMakeupPage();
    else if (tab === 'requests') loadTeacherRequests();
    else if (tab === 'evaluation') loadTeacherEvaluationPage();
  } else if (currentUser.role === 'admin') {
    if (tab === 'overview') loadAdminOverview();
    else if (tab === 'schedules') loadScheduleManagement();
    else if (tab === 'requests') loadPendingRequests();
    else if (tab === 'makeup') loadMakeupApproval();
    else if (tab === 'statistics') loadStatistics();
    else if (tab === 'evaluation') loadEvaluationManagement();
    else if (tab === 'users') loadUserManagement();
    else if (tab === 'courses') loadCourseManagement();
  }
}

// ============ 学生端功能 ============

async function loadStudentSchedule() {
  try {
    const data = await apiCall('/api/student/schedule');
    const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    let html = '<div class="card"><h3>📅 我的课表</h3>';
    if (data.length === 0) {
      html += '<div class="empty-state"><p>暂无课表数据</p></div>';
    } else {
      html += '<table><thead><tr><th>星期</th><th>节次</th><th>课程</th><th>教室</th><th>教师</th><th>备注</th></tr></thead><tbody>';
      data.forEach(item => {
        const note = item.is_substitute ? '<span class="badge badge-warning">代课</span>' : 
                     item.is_rescheduled ? '<span class="badge badge-info">已调课</span>' : '';
        html += `<tr>
          <td>${days[item.day_of_week]}</td>
          <td>${item.period_start}-${item.period_end}节</td>
          <td><strong>${item.course_name}</strong></td>
          <td>${item.building} ${item.room_number}</td>
          <td>${item.teacher_name}</td>
          <td>${note}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function loadStudentGrades() {
  try {
    const data = await apiCall('/api/student/grades');
    
    let html = '<div class="card"><h3>📊 成绩查询</h3>';
    if (data.length === 0) {
      html += '<div class="empty-state"><p>暂无成绩数据</p></div>';
    } else {
      html += '<table><thead><tr><th>课程</th><th>平时成绩</th><th>期中成绩</th><th>期末成绩</th><th>总评</th><th>状态</th></tr></thead><tbody>';
      data.forEach(item => {
        const status = item.needs_makeup ? 
          '<span class="badge badge-danger">需补考</span>' : 
          '<span class="badge badge-success">通过</span>';
        html += `<tr>
          <td><strong>${item.course_name}</strong></td>
          <td>${item.regular_score !== null ? item.regular_score.toFixed(1) : '-'}</td>
          <td>${item.midterm_score !== null ? item.midterm_score.toFixed(1) : '-'}</td>
          <td>${item.final_score !== null ? item.final_score.toFixed(1) : '-'}</td>
          <td><strong style="color: #667eea; font-size: 18px;">${item.total_score !== null ? item.total_score.toFixed(1) : '-'}</strong></td>
          <td>${status}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function loadStudentRanking() {
  try {
    const data = await apiCall('/api/student/ranking?semesterId=1');
    
    let html = '<div class="card"><h3>🏆 排名分析</h3>';
    html += '<div class="stats-grid">';
    html += `
      <div class="stat-card">
        <h4>年级排名</h4>
        <div class="stat-value">${data.rank}</div>
      </div>
      <div class="stat-card">
        <h4>年级总人数</h4>
        <div class="stat-value">${data.totalStudents}</div>
      </div>
      <div class="stat-card">
        <h4>超越百分比</h4>
        <div class="stat-value">${data.percentile.toFixed(1)}%</div>
      </div>
      <div class="stat-card">
        <h4>平均分</h4>
        <div class="stat-value">${data.avgScore.toFixed(1)}</div>
      </div>
    `;
    html += '</div>';
    
    if (data.requiresMakeup) {
      html += `<div class="card" style="border-left-color: #dc3545;">
        <h3 style="color: #dc3545;">⚠️ 补考提醒</h3>
        <p>您的总评成绩低于60分，且在年级后5%，需要申请补考。</p>
        <p>补考申请需要管理员审批，请联系班主任或教务处。</p>
      </div>`;
    }
    
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function loadEvaluationPage() {
  try {
    const courses = await apiCall('/api/student/evaluation/courses?semesterId=1');
    const questions = await apiCall('/api/student/evaluation/questions');
    
    let html = '<div class="card"><h3>✍️ 期末评教</h3>';
    
    if (courses.length === 0) {
      html += '<div class="empty-state"><p>暂无需要评教的课程</p></div>';
    } else {
      html += '<p style="margin-bottom: 20px;">请对以下课程的教师进行评教（1-5分，5分为最高）：</p>';
      
      courses.forEach(course => {
        const statusBadge = course.is_evaluated ? 
          '<span class="badge badge-success">✅ 已评教</span>' : 
          '<span class="badge badge-warning">⏳ 待评教</span>';
        
        html += `<div class="card" style="background: #f8f9fa;">
          <h4>${course.course_name} - ${course.teacher_name} ${statusBadge}</h4>`;
        
        if (!course.is_evaluated) {
          html += `<form onsubmit="submitEvaluation(event, ${course.course_id}, ${course.teacher_id})">`;
          questions.forEach(q => {
            if (q.question_type === 'rating') {
              html += `
                <div class="form-group">
                  <label>${q.question_text}</label>
                  <select name="q${q.id}" required>
                    <option value="">请选择</option>
                    <option value="5">5分 - 非常满意</option>
                    <option value="4">4分 - 满意</option>
                    <option value="3">3分 - 一般</option>
                    <option value="2">2分 - 不满意</option>
                    <option value="1">1分 - 非常不满意</option>
                  </select>
                </div>
              `;
            } else {
              html += `
                <div class="form-group">
                  <label>${q.question_text}</label>
                  <textarea name="q${q.id}" rows="3" placeholder="请输入您的意见和建议"></textarea>
                </div>
              `;
            }
          });
          html += '<button type="submit" class="btn-success">提交评教</button></form>';
        }
        
        html += '</div>';
      });
    }
    
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function submitEvaluation(event, courseId, teacherId) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  const answers = [];
  for (let [key, value] of formData.entries()) {
    const questionId = parseInt(key.substring(1));
    if (!isNaN(parseFloat(value))) {
      answers.push({ questionId, ratingScore: parseInt(value) });
    } else if (value.trim()) {
      answers.push({ questionId, textAnswer: value });
    }
  }
  
  try {
    await apiCall('/api/student/evaluation/submit', {
      method: 'POST',
      body: JSON.stringify({
        teacherId,
        courseId,
        semesterId: 1,
        answers
      })
    });
    
    alert('评教提交成功！');
    loadEvaluationPage();
  } catch (error) {
    alert('提交失败: ' + error.message);
  }
}

// ============ 教师端功能 ============

async function loadTeacherSchedule() {
  try {
    const data = await apiCall('/api/teacher/schedule');
    const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    let html = '<div class="card"><h3>📅 我的课表</h3>';
    if (data.length === 0) {
      html += '<div class="empty-state"><p>暂无课表数据</p></div>';
    } else {
      html += '<table><thead><tr><th>星期</th><th>节次</th><th>课程</th><th>班级</th><th>教室</th><th>备注</th></tr></thead><tbody>';
      data.forEach(item => {
        const note = item.is_substitute ? '<span class="badge badge-warning">代课</span>' : 
                     item.is_rescheduled ? '<span class="badge badge-info">已调课</span>' : '';
        html += `<tr>
          <td>${days[item.day_of_week]}</td>
          <td>${item.period_start}-${item.period_end}节</td>
          <td><strong>${item.course_name}</strong></td>
          <td>${item.class_name}</td>
          <td>${item.building} ${item.room_number}</td>
          <td>${note}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

function loadClassStudentsPage() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>👥 班级名单</h3>
      <p>此功能需要选择具体班级查看学生名单...</p>
      <p style="color: #999; margin-top: 10px;">功能开发中，敬请期待</p>
    </div>
  `;
}

function loadGradeManagementPage() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>📝 成绩管理</h3>
      <p>此功能用于上传和管理学生成绩...</p>
      <p style="color: #999; margin-top: 10px;">功能开发中，敬请期待</p>
    </div>
  `;
}

async function loadTeacherMakeupPage() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>🔄 补考管理</h3>
      <p>此功能用于查看需要补考的学生并录入补考成绩...</p>
      <p style="color: #999; margin-top: 10px;">功能开发中，敬请期待</p>
    </div>
  `;
}

async function loadTeacherRequests() {
  try {
    const data = await apiCall('/api/teacher/requests');
    
    let html = '<div class="card"><h3>📋 调课申请</h3>';
    if (data.rescheduleRequests.length === 0) {
      html += '<div class="empty-state"><p>暂无调课申请</p></div>';
    } else {
      html += '<table><thead><tr><th>课程</th><th>班级</th><th>类型</th><th>原因</th><th>状态</th><th>提交时间</th></tr></thead><tbody>';
      data.rescheduleRequests.forEach(req => {
        const statusBadge = req.status === 'approved' ? '<span class="badge badge-success">已批准</span>' :
                           req.status === 'rejected' ? '<span class="badge badge-danger">已拒绝</span>' :
                           '<span class="badge badge-warning">待审核</span>';
        html += `<tr>
          <td>${req.course_name}</td>
          <td>${req.class_name}</td>
          <td>${req.request_type === 'temporary' ? '临时' : '长期'}</td>
          <td>${req.reason}</td>
          <td>${statusBadge}</td>
          <td>${new Date(req.created_at).toLocaleString('zh-CN')}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    
    html += '<div class="card"><h3>📋 代课申请</h3>';
    if (data.substituteRequests.length === 0) {
      html += '<div class="empty-state"><p>暂无代课申请</p></div>';
    } else {
      html += '<table><thead><tr><th>课程</th><th>班级</th><th>代课教师</th><th>日期</th><th>状态</th><th>提交时间</th></tr></thead><tbody>';
      data.substituteRequests.forEach(req => {
        const statusBadge = req.status === 'approved' ? '<span class="badge badge-success">已批准</span>' :
                           req.status === 'rejected' ? '<span class="badge badge-danger">已拒绝</span>' :
                           '<span class="badge badge-warning">待审核</span>';
        html += `<tr>
          <td>${req.course_name}</td>
          <td>${req.class_name}</td>
          <td>${req.substitute_teacher_name}</td>
          <td>${req.substitute_date}</td>
          <td>${statusBadge}</td>
          <td>${new Date(req.created_at).toLocaleString('zh-CN')}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

function loadTeacherEvaluationPage() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>⭐ 评教结果</h3>
      <p>此功能用于查看学生对您的评教结果...</p>
      <p style="color: #999; margin-top: 10px;">功能开发中，敬请期待</p>
    </div>
  `;
}

// ============ 管理员端功能 ============

async function loadAdminOverview() {
  try {
    const stats = await apiCall('/api/admin/grade-statistics');
    
    let html = '<div class="card"><h3>📊 数据概览</h3>';
    html += '<div class="stats-grid">';
    html += `
      <div class="stat-card">
        <h4>总学生数</h4>
        <div class="stat-value">${stats.overall.total_students || 0}</div>
      </div>
      <div class="stat-card">
        <h4>总课程数</h4>
        <div class="stat-value">${stats.overall.total_courses || 0}</div>
      </div>
      <div class="stat-card">
        <h4>平均分</h4>
        <div class="stat-value">${stats.overall.avg_score ? stats.overall.avg_score.toFixed(1) : '0'}</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
        <h4>需补考</h4>
        <div class="stat-value">${stats.overall.makeup_count || 0}</div>
      </div>
    `;
    html += '</div></div>';
    
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function loadScheduleManagement() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>📅 排课管理</h3>
      <p>此功能用于创建和管理课程表...</p>
      <p style="color: #999; margin-top: 10px;">功能开发中，敬请期待</p>
    </div>
  `;
}

async function loadPendingRequests() {
  try {
    const data = await apiCall('/api/admin/pending-requests');
    
    let html = '<div class="card"><h3>⏳ 待审核的调课申请</h3>';
    if (data.rescheduleRequests.length === 0) {
      html += '<div class="empty-state"><p>暂无待审核的调课申请</p></div>';
    } else {
      html += '<table><thead><tr><th>教师</th><th>课程</th><th>班级</th><th>类型</th><th>原因</th><th>提交时间</th><th>操作</th></tr></thead><tbody>';
      data.rescheduleRequests.forEach(req => {
        html += `<tr>
          <td>${req.teacher_name}</td>
          <td>${req.course_name}</td>
          <td>${req.class_name}</td>
          <td>${req.request_type === 'temporary' ? '临时' : '长期'}</td>
          <td>${req.reason}</td>
          <td>${new Date(req.created_at).toLocaleString('zh-CN')}</td>
          <td>
            <button class="btn-small btn-success" onclick="reviewRequest('reschedule', ${req.id}, true)">批准</button>
            <button class="btn-small btn-danger" onclick="reviewRequest('reschedule', ${req.id}, false)">拒绝</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    
    html += '<div class="card"><h3>⏳ 待审核的代课申请</h3>';
    if (data.substituteRequests.length === 0) {
      html += '<div class="empty-state"><p>暂无待审核的代课申请</p></div>';
    } else {
      html += '<table><thead><tr><th>原教师</th><th>代课教师</th><th>课程</th><th>日期</th><th>原因</th><th>提交时间</th><th>操作</th></tr></thead><tbody>';
      data.substituteRequests.forEach(req => {
        html += `<tr>
          <td>${req.original_teacher_name}</td>
          <td>${req.substitute_teacher_name}</td>
          <td>${req.course_name}</td>
          <td>${req.substitute_date}</td>
          <td>${req.reason}</td>
          <td>${new Date(req.created_at).toLocaleString('zh-CN')}</td>
          <td>
            <button class="btn-small btn-success" onclick="reviewRequest('substitute', ${req.id}, true)">批准</button>
            <button class="btn-small btn-danger" onclick="reviewRequest('substitute', ${req.id}, false)">拒绝</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function reviewRequest(type, requestId, approved) {
  const endpoint = type === 'reschedule' ? '/api/admin/review-reschedule' : '/api/admin/review-substitute';
  
  try {
    await apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        requestId,
        status: approved ? 'approved' : 'rejected',
        adminNote: approved ? '已批准' : '已拒绝'
      })
    });
    
    alert(approved ? '已批准申请' : '已拒绝申请');
    loadPendingRequests();
  } catch (error) {
    alert('操作失败: ' + error.message);
  }
}

async function loadMakeupApproval() {
  try {
    const pending = await apiCall('/api/admin/pending-makeup-requests');
    const scores = await apiCall('/api/admin/pending-makeup-scores');
    
    let html = '<div class="card"><h3>⏳ 待审批的补考申请</h3>';
    if (pending.length === 0) {
      html += '<div class="empty-state"><p>暂无待审批的补考申请</p></div>';
    } else {
      html += '<table><thead><tr><th>学生</th><th>学号</th><th>班级</th><th>课程</th><th>总分</th><th>年级</th><th>教师</th><th>操作</th></tr></thead><tbody>';
      pending.forEach(req => {
        html += `<tr>
          <td>${req.student_name}</td>
          <td>${req.student_number}</td>
          <td>${req.class_name}</td>
          <td>${req.course_name}</td>
          <td><strong style="color: #dc3545;">${req.total_score.toFixed(1)}</strong></td>
          <td>${req.grade}年级</td>
          <td>${req.teacher_name}</td>
          <td>
            <button class="btn-small btn-success" onclick="approveMakeup(${req.grade_id}, true)">批准</button>
            <button class="btn-small btn-danger" onclick="approveMakeup(${req.grade_id}, false)">拒绝</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    
    html += '<div class="card"><h3>⏳ 待审批的补考成绩</h3>';
    if (scores.length === 0) {
      html += '<div class="empty-state"><p>暂无待审批的补考成绩</p></div>';
    } else {
      html += '<table><thead><tr><th>学生</th><th>学号</th><th>班级</th><th>课程</th><th>原成绩</th><th>补考成绩</th><th>是否及格</th><th>教师</th><th>操作</th></tr></thead><tbody>';
      scores.forEach(req => {
        const passedBadge = req.makeup_passed ? '<span class="badge badge-success">及格</span>' : '<span class="badge badge-danger">不及格</span>';
        html += `<tr>
          <td>${req.student_name}</td>
          <td>${req.student_number}</td>
          <td>${req.class_name}</td>
          <td>${req.course_name}</td>
          <td>${req.total_score.toFixed(1)}</td>
          <td><strong style="color: #667eea;">${req.makeup_score.toFixed(1)}</strong></td>
          <td>${passedBadge}</td>
          <td>${req.teacher_name}</td>
          <td>
            <button class="btn-small btn-success" onclick="approveMakeupScore(${req.grade_id}, true)">批准</button>
            <button class="btn-small btn-danger" onclick="approveMakeupScore(${req.grade_id}, false)">拒绝</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function approveMakeup(gradeId, approved) {
  try {
    await apiCall('/api/admin/approve-makeup', {
      method: 'POST',
      body: JSON.stringify({ gradeId, approved })
    });
    
    alert(approved ? '已批准补考申请' : '已拒绝补考申请');
    loadMakeupApproval();
  } catch (error) {
    alert('操作失败: ' + error.message);
  }
}

async function approveMakeupScore(gradeId, approved) {
  try {
    await apiCall('/api/admin/approve-makeup-score', {
      method: 'POST',
      body: JSON.stringify({ gradeId, approved })
    });
    
    alert(approved ? '已批准补考成绩' : '已拒绝补考成绩');
    loadMakeupApproval();
  } catch (error) {
    alert('操作失败: ' + error.message);
  }
}

async function loadStatistics() {
  try {
    const data = await apiCall('/api/admin/grade-statistics');
    
    let html = `<div class="card"><h3>📊 全校成绩统计</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <h4>总学生数</h4>
          <div class="stat-value">${data.overall.total_students || 0}</div>
        </div>
        <div class="stat-card">
          <h4>总课程数</h4>
          <div class="stat-value">${data.overall.total_courses || 0}</div>
        </div>
        <div class="stat-card">
          <h4>平均分</h4>
          <div class="stat-value">${data.overall.avg_score ? data.overall.avg_score.toFixed(1) : '0'}</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
          <h4>需补考</h4>
          <div class="stat-value">${data.overall.makeup_count || 0}</div>
        </div>
      </div>
    </div>`;

    html += '<div class="card"><h3>📈 分数段分布</h3><table><thead><tr><th>分数段</th><th>人次</th></tr></thead><tbody>';
    if (data.distribution && data.distribution.length > 0) {
      data.distribution.forEach(item => {
        html += `<tr><td>${item.score_range}</td><td><strong>${item.count}</strong></td></tr>`;
      });
    } else {
      html += '<tr><td colspan="2" style="text-align:center;">暂无数据</td></tr>';
    }
    html += '</tbody></table></div>';

    html += '<div class="card"><h3>📚 各科平均分</h3><table><thead><tr><th>课程</th><th>平均分</th><th>学生数</th></tr></thead><tbody>';
    if (data.courseAverages && data.courseAverages.length > 0) {
      data.courseAverages.forEach(item => {
        html += `<tr><td>${item.course_name}</td><td><strong style="color: #667eea;">${item.avg_score ? item.avg_score.toFixed(2) : '0'}</strong></td><td>${item.student_count}</td></tr>`;
      });
    } else {
      html += '<tr><td colspan="3" style="text-align:center;">暂无数据</td></tr>';
    }
    html += '</tbody></table></div>';

    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

function loadEvaluationManagement() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>✍️ 评教管理</h3>
      <p>此功能用于管理评教题目和评教期...</p>
      <p style="color: #999; margin-top: 10px;">功能开发中，敬请期待</p>
    </div>
  `;
}

function loadUserManagement() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>👤 用户管理</h3>
      <p>此功能用于创建和管理用户...</p>
      <p style="color: #999; margin-top: 10px;">功能开发中，敬请期待</p>
    </div>
  `;
}

function loadCourseManagement() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>📚 课程管理</h3>
      <p>此功能用于管理课程设置（如是否有期中考试）...</p>
      <p style="color: #999; margin-top: 10px;">功能开发中，敬请期待</p>
    </div>
  `;
}

// ============ 修改密码功能 ============

function showChangePasswordModal() {
  document.getElementById('changePasswordModal').classList.add('active');
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').classList.remove('active');
  document.getElementById('oldPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  document.getElementById('changePasswordError').textContent = '';
  document.getElementById('changePasswordError').className = '';
}

async function changePassword() {
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorDiv = document.getElementById('changePasswordError');
  
  errorDiv.textContent = '';
  errorDiv.className = '';
  
  if (!oldPassword || !newPassword || !confirmPassword) {
    errorDiv.textContent = '请填写所有字段';
    errorDiv.className = 'error';
    return;
  }
  
  if (newPassword !== confirmPassword) {
    errorDiv.textContent = '两次输入的新密码不一致';
    errorDiv.className = 'error';
    return;
  }
  
  if (newPassword.length < 6) {
    errorDiv.textContent = '新密码长度至少为6位';
    errorDiv.className = 'error';
    return;
  }
  
  try {
    await apiCall('/api/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
    
    errorDiv.textContent = '密码修改成功！';
    errorDiv.className = 'success';
    
    setTimeout(() => {
      closeChangePasswordModal();
      alert('密码已修改，请重新登录');
      logout();
    }, 1500);
  } catch (error) {
    errorDiv.textContent = '修改失败: ' + error.message;
    errorDiv.className = 'error';
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('教育管理系统已加载');
});
