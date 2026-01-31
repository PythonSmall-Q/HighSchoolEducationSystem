import { Env, JWTPayload } from './types';
import { authenticateRequest, createJWT, verifyPassword, hasRole, changePassword } from './auth';
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
      if (path === '/api/teacher/classes' && hasRole(authUser, 'teacher')) {
        const data = await teacherApi.getTeacherClasses(env, authUser);
        return jsonResponse(data, 200, corsHeaders);
      }

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

      if (path === '/api/teacher/makeup-students' && hasRole(authUser, 'teacher')) {
        const courseId = parseInt(url.searchParams.get('courseId') || '0');
        const semesterId = parseInt(url.searchParams.get('semesterId') || '1');
        const data = await teacherApi.getStudentsNeedingMakeup(env, authUser, courseId, semesterId);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/teacher/upload-makeup-scores' && request.method === 'POST' && hasRole(authUser, 'teacher')) {
        const body = await request.json();
        const data = await teacherApi.uploadMakeupScores(env, authUser, body);
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

      if (path === '/api/admin/user' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json();
        const data = await adminApi.createUser(env, body);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/pending-makeup-requests' && hasRole(authUser, 'admin')) {
        const data = await adminApi.getPendingMakeupRequests(env);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/approve-makeup' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json() as any;
        const data = await adminApi.approveMakeupRequest(env, body.gradeId, body.approved);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/pending-makeup-scores' && hasRole(authUser, 'admin')) {
        const data = await adminApi.getPendingMakeupScores(env);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/approve-makeup-score' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json() as any;
        const data = await adminApi.approveMakeupScore(env, body.gradeId, body.approved);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/schedules' && hasRole(authUser, 'admin')) {
        if (request.method === 'GET') {
          const semesterId = url.searchParams.get('semesterId');
          const data = await adminApi.getAllSchedules(env, semesterId ? parseInt(semesterId) : undefined);
          return jsonResponse(data, 200, corsHeaders);
        } else if (request.method === 'POST') {
          const body = await request.json();
          const data = await adminApi.createSchedule(env, body);
          return jsonResponse(data, 200, corsHeaders);
        } else if (request.method === 'DELETE') {
          const scheduleIdParam = url.searchParams.get('scheduleId');
          let scheduleId: number;
          if (scheduleIdParam) {
            scheduleId = parseInt(scheduleIdParam);
          } else {
            const body = await request.json() as any;
            scheduleId = body.scheduleId;
          }
          const data = await adminApi.deleteSchedule(env, scheduleId);
          return jsonResponse(data, 200, corsHeaders);
        }
      }

      if (path === '/api/admin/courses' && hasRole(authUser, 'admin')) {
        const data = await adminApi.getAllCourses(env);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/course' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json() as any;
        const data = await adminApi.createCourse(env, body.name, body.code, body.credits, body.hasMidtermExam);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/update-course' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json() as any;
        const data = await adminApi.updateCourseSettings(env, body.courseId, body.hasMidtermExam);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/teachers' && hasRole(authUser, 'admin')) {
        const data = await adminApi.getAllTeachers(env);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/classes' && hasRole(authUser, 'admin')) {
        const data = await adminApi.getAllClasses(env);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/classrooms' && hasRole(authUser, 'admin')) {
        const data = await adminApi.getAllClassrooms(env);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/classroom' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json() as any;
        const data = await adminApi.createClassroom(env, body.roomNumber, body.building, body.capacity, body.type);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/class' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json() as any;
        const data = await adminApi.createClass(env, body.grade, body.classNumber, body.headTeacherId);
        return jsonResponse(data, 200, corsHeaders);
      }

      if (path === '/api/admin/batch-create-students' && request.method === 'POST' && hasRole(authUser, 'admin')) {
        const body = await request.json() as any;
        const data = await adminApi.batchCreateStudents(env, body.students);
        return jsonResponse(data, 200, corsHeaders);
      }

      // 修改密码（所有用户）
      if (path === '/api/change-password' && request.method === 'POST') {
        const body = await request.json() as any;
        const data = await changePassword(env, authUser.userId, body.oldPassword, body.newPassword);
        return jsonResponse({ success: data }, 200, corsHeaders);
      }

      // 静态文件服务（前端页面）
      if (path === '/' || path === '/index.html') {
        return new Response(getIndexHTML(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });
      }

      // 前端 JavaScript 文件
      if (path === '/app.js') {
        return new Response(getFrontendJS(), {
          headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
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
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      padding: 20px;
    }
    
    .container { 
      background: white; 
      border-radius: 24px; 
      box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
      padding: 40px; 
      width: 100%; 
      max-width: 1400px;
      animation: fadeIn 0.5s ease-in;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    h1 { 
      color: #667eea; 
      text-align: center; 
      margin-bottom: 30px; 
      font-size: 36px;
      font-weight: 700;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    
    .login-form { 
      max-width: 450px; 
      margin: 0 auto;
      padding: 30px;
      background: linear-gradient(to bottom, #f8f9fa, white);
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .form-group { margin-bottom: 24px; }
    
    label { 
      display: block; 
      margin-bottom: 8px; 
      color: #333; 
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    input, select, textarea { 
      width: 100%; 
      padding: 14px 16px; 
      border: 2px solid #e0e0e0; 
      border-radius: 10px; 
      font-size: 16px; 
      transition: all 0.3s;
      font-family: inherit;
    }
    
    input:focus, select:focus, textarea:focus { 
      outline: none; 
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      transform: translateY(-1px);
    }
    
    button { 
      width: 100%; 
      padding: 16px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      border: none; 
      border-radius: 12px; 
      font-size: 18px; 
      font-weight: 700; 
      cursor: pointer; 
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    button:hover { 
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    .btn-secondary {
      background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
      box-shadow: 0 4px 15px rgba(108, 117, 125, 0.4);
    }
    
    .btn-success {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
    }
    
    .btn-danger {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
    }
    
    .btn-warning {
      background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
      box-shadow: 0 4px 15px rgba(255, 193, 7, 0.4);
      color: #333;
    }
    
    .btn-small {
      width: auto;
      padding: 8px 16px;
      font-size: 14px;
      display: inline-block;
      margin: 4px;
    }
    
    .dashboard { display: none; }
    .dashboard.active { display: block; animation: fadeIn 0.5s ease-in; }
    
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .header-bar h2 {
      color: #333;
      font-size: 24px;
      font-weight: 600;
    }
    
    .header-bar .user-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .nav-tabs { 
      display: flex; 
      gap: 8px; 
      margin-bottom: 30px; 
      border-bottom: 3px solid #e0e0e0;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    
    .nav-tab { 
      padding: 12px 24px; 
      background: none; 
      border: none; 
      cursor: pointer; 
      font-size: 16px; 
      color: #666; 
      border-bottom: 3px solid transparent; 
      transition: all 0.3s;
      white-space: nowrap;
      font-weight: 500;
      position: relative;
      top: 3px;
    }
    
    .nav-tab:hover {
      color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }
    
    .nav-tab.active { 
      color: #667eea; 
      border-bottom-color: #667eea; 
      font-weight: 700;
    }
    
    .card { 
      background: white;
      padding: 24px; 
      border-radius: 16px; 
      margin-bottom: 24px; 
      border-left: 5px solid #667eea;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      transition: all 0.3s;
    }
    
    .card:hover {
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      transform: translateY(-2px);
    }
    
    .card h3 { 
      color: #667eea; 
      margin-bottom: 20px;
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    th, td { 
      padding: 16px; 
      text-align: left; 
      border-bottom: 1px solid #e0e0e0; 
    }
    
    th { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      font-weight: 700;
      text-transform: uppercase;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    
    tr:hover { 
      background: #f8f9fa;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-success { background: #d4edda; color: #155724; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-info { background: #d1ecf1; color: #0c5460; }
    .badge-primary { background: #cfe2ff; color: #084298; }
    
    .error { 
      color: #dc3545; 
      margin-top: 12px; 
      text-align: center;
      padding: 12px;
      background: #f8d7da;
      border-radius: 8px;
      font-weight: 500;
    }
    
    .success { 
      color: #28a745; 
      margin-top: 12px; 
      text-align: center;
      padding: 12px;
      background: #d4edda;
      border-radius: 8px;
      font-weight: 500;
    }
    
    .info-box {
      margin-top: 24px;
      padding: 20px;
      background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
      border-radius: 12px;
      border-left: 4px solid #ffc107;
    }
    
    .info-box strong {
      display: block;
      margin-bottom: 8px;
      color: #856404;
      font-size: 16px;
    }
    
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s;
    }
    
    .modal.active { display: flex; }
    
    .modal-content {
      background: white;
      padding: 32px;
      border-radius: 20px;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.3s;
    }
    
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .modal-header h3 {
      color: #667eea;
      font-size: 24px;
      font-weight: 700;
    }
    
    .close-btn {
      background: none;
      width: auto;
      padding: 8px;
      font-size: 24px;
      color: #999;
      cursor: pointer;
      border-radius: 50%;
      transition: all 0.3s;
    }
    
    .close-btn:hover {
      background: #f8f9fa;
      color: #333;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      transition: all 0.3s;
    }
    
    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    
    .stat-card h4 {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .stat-card .stat-value {
      font-size: 32px;
      font-weight: 700;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }
    
    .empty-state svg {
      width: 100px;
      height: 100px;
      margin-bottom: 20px;
      opacity: 0.5;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #667eea;
      font-size: 18px;
      font-weight: 600;
    }
    
    @media (max-width: 768px) {
      .container { padding: 20px; }
      h1 { font-size: 24px; }
      .header-bar { flex-direction: column; gap: 15px; }
      .nav-tabs { flex-wrap: wrap; }
      table { font-size: 14px; }
      th, td { padding: 10px; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎓 高中教育管理系统</h1>
    
    <div id="loginSection" class="login-form">
      <div class="form-group">
        <label>用户名</label>
        <input type="text" id="username" placeholder="请输入用户名" onkeypress="if(event.key==='Enter')login()">
      </div>
      <div class="form-group">
        <label>密码</label>
        <input type="password" id="password" placeholder="请输入密码" onkeypress="if(event.key==='Enter')login()">
      </div>
      <button onclick="login()">登录</button>
      <div id="loginError"></div>
    </div>

    <div id="dashboardSection" class="dashboard">
      <div class="header-bar">
        <h2>👋 欢迎，<span id="userName"></span></h2>
        <div class="user-info">
          <button class="btn-small btn-warning" onclick="showChangePasswordModal()">🔑 修改密码</button>
          <button class="btn-small btn-danger" onclick="logout()">🚪 退出登录</button>
        </div>
      </div>

      <div class="nav-tabs" id="navTabs"></div>
      <div id="contentArea"></div>
    </div>
  </div>

  <!-- 修改密码弹窗 -->
  <div id="changePasswordModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>🔑 修改密码</h3>
        <button class="close-btn" onclick="closeChangePasswordModal()">×</button>
      </div>
      <div class="form-group">
        <label>当前密码</label>
        <input type="password" id="oldPassword" placeholder="请输入当前密码">
      </div>
      <div class="form-group">
        <label>新密码</label>
        <input type="password" id="newPassword" placeholder="请输入新密码">
      </div>
      <div class="form-group">
        <label>确认新密码</label>
        <input type="password" id="confirmPassword" placeholder="请再次输入新密码">
      </div>
      <button onclick="changePassword()">确认修改</button>
      <div id="changePasswordError"></div>
    </div>
  </div>

  <script>
    const API_BASE_URL = window.location.origin;
  </script>
  <script src="/app.js"></script>
</body>
</html>
  `.trim();
}
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

  `.trim();
}

// 前端 JavaScript
function getFrontendJS(): string {
  return `
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
    navTabs.innerHTML = \`
      <button class="nav-tab active" onclick="showTab('schedule')">📅 我的课表</button>
      <button class="nav-tab" onclick="showTab('grades')">📊 成绩查询</button>
      <button class="nav-tab" onclick="showTab('ranking')">🏆 排名分析</button>
      <button class="nav-tab" onclick="showTab('evaluation')">✍️ 期末评教</button>
    \`;
    loadStudentSchedule();
  } else if (currentUser.role === 'teacher') {
    navTabs.innerHTML = \`
      <button class="nav-tab active" onclick="showTab('schedule')">📅 我的课表</button>
      <button class="nav-tab" onclick="showTab('students')">👥 班级名单</button>
      <button class="nav-tab" onclick="showTab('grades')">📝 成绩管理</button>
      <button class="nav-tab" onclick="showTab('makeup')">🔄 补考管理</button>
      <button class="nav-tab" onclick="showTab('requests')">📋 调课代课</button>
      <button class="nav-tab" onclick="showTab('evaluation')">⭐ 评教结果</button>
    \`;
    loadTeacherSchedule();
  } else if (currentUser.role === 'admin') {
    navTabs.innerHTML = \`
      <button class="nav-tab active" onclick="showTab('overview')">📊 数据概览</button>
      <button class="nav-tab" onclick="showTab('schedules')">📅 排课管理</button>
      <button class="nav-tab" onclick="showTab('requests')">📋 申请审核</button>
      <button class="nav-tab" onclick="showTab('makeup')">🔄 补考审批</button>
      <button class="nav-tab" onclick="showTab('statistics')">📈 成绩统计</button>
      <button class="nav-tab" onclick="showTab('evaluation')">✍️ 评教管理</button>
      <button class="nav-tab" onclick="showTab('users')">👤 用户管理</button>
      <button class="nav-tab" onclick="showTab('courses')">📚 课程管理</button>
    \`;
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

// 学生端功能
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
        const note = item.is_substitute ? '<span class="badge badge-warning">代课</span>' : item.is_rescheduled ? '<span class="badge badge-info">已调课</span>' : '';
        html += \`<tr><td>\${days[item.day_of_week]}</td><td>\${item.period_start}-\${item.period_end}节</td><td><strong>\${item.course_name}</strong></td><td>\${item.building} \${item.room_number}</td><td>\${item.teacher_name}</td><td>\${note}</td></tr>\`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
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
        const status = item.needs_makeup ? '<span class="badge badge-danger">需补考</span>' : '<span class="badge badge-success">通过</span>';
        html += \`<tr><td><strong>\${item.course_name}</strong></td><td>\${item.regular_score !== null ? item.regular_score.toFixed(1) : '-'}</td><td>\${item.midterm_score !== null ? item.midterm_score.toFixed(1) : '-'}</td><td>\${item.final_score !== null ? item.final_score.toFixed(1) : '-'}</td><td><strong style="color: #667eea; font-size: 18px;">\${item.total_score !== null ? item.total_score.toFixed(1) : '-'}</strong></td><td>\${status}</td></tr>\`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
  }
}

async function loadStudentRanking() {
  try {
    const data = await apiCall('/api/student/ranking?semesterId=1');
    let html = '<div class="card"><h3>🏆 排名分析</h3><div class="stats-grid">';
    html += \`<div class="stat-card"><h4>年级排名</h4><div class="stat-value">\${data.rank}</div></div>
      <div class="stat-card"><h4>年级总人数</h4><div class="stat-value">\${data.totalStudents}</div></div>
      <div class="stat-card"><h4>超越百分比</h4><div class="stat-value">\${data.percentile.toFixed(1)}%</div></div>
      <div class="stat-card"><h4>平均分</h4><div class="stat-value">\${data.avgScore.toFixed(1)}</div></div>\`;
    html += '</div>';
    if (data.requiresMakeup) {
      html += '<div class="card" style="border-left-color: #dc3545;"><h3 style="color: #dc3545;">⚠️ 补考提醒</h3><p>您的总评成绩低于60分，且在年级后5%，需要申请补考。</p><p>补考申请需要管理员审批，请联系班主任或教务处。</p></div>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
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
        const statusBadge = course.is_evaluated ? '<span class="badge badge-success">✅ 已评教</span>' : '<span class="badge badge-warning">⏳ 待评教</span>';
        html += \`<div class="card" style="background: #f8f9fa;"><h4>\${course.course_name} - \${course.teacher_name} \${statusBadge}</h4>\`;
        if (!course.is_evaluated) {
          html += \`<form onsubmit="submitEvaluation(event, \${course.course_id}, \${course.teacher_id})">\`;
          questions.forEach(q => {
            if (q.question_type === 'rating') {
              html += \`<div class="form-group"><label>\${q.question_text}</label><select name="q\${q.id}" required><option value="">请选择</option><option value="5">5分 - 非常满意</option><option value="4">4分 - 满意</option><option value="3">3分 - 一般</option><option value="2">2分 - 不满意</option><option value="1">1分 - 非常不满意</option></select></div>\`;
            } else {
              html += \`<div class="form-group"><label>\${q.question_text}</label><textarea name="q\${q.id}" rows="3" placeholder="请输入您的意见和建议"></textarea></div>\`;
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
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
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
      body: JSON.stringify({ teacherId, courseId, semesterId: 1, answers })
    });
    alert('评教提交成功！');
    loadEvaluationPage();
  } catch (error) {
    alert('提交失败: ' + error.message);
  }
}

// 教师端功能
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
        const note = item.is_substitute ? '<span class="badge badge-warning">代课</span>' : item.is_rescheduled ? '<span class="badge badge-info">已调课</span>' : '';
        html += \`<tr><td>\${days[item.day_of_week]}</td><td>\${item.period_start}-\${item.period_end}节</td><td><strong>\${item.course_name}</strong></td><td>\${item.class_name}</td><td>\${item.building} \${item.room_number}</td><td>\${note}</td></tr>\`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
  }
}

async function loadClassStudentsPage() {
  try {
    const classes = await apiCall('/api/teacher/classes');
    let html = '<div class="card"><h3>👥 班级名单</h3>';
    html += '<div class="form-group"><label>选择班级</label><select id="classSelect" onchange="loadStudentList()">';
    html += '<option value="">请选择班级</option>';
    classes.forEach(c => {
      html += `<option value="${c.class_id}">${c.grade}年级${c.class_number}班 - ${c.course_name}</option>`;
    });
    html += '</select></div><div id="studentListArea"></div></div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function loadStudentList() {
  const classId = document.getElementById('classSelect').value;
  if (!classId) {
    document.getElementById('studentListArea').innerHTML = '';
    return;
  }
  try {
    const students = await apiCall(`/api/teacher/class-students?classId=${classId}`);
    let html = '<table><thead><tr><th>学号</th><th>姓名</th><th>邮箱</th></tr></thead><tbody>';
    if (students.length === 0) {
      html += '<tr><td colspan="3" style="text-align:center;">暂无学生</td></tr>';
    } else {
      students.forEach(s => {
        html += `<tr><td>${s.student_number}</td><td><strong>${s.name}</strong></td><td>${s.email || '-'}</td></tr>`;
      });
    }
    html += '</tbody></table>';
    document.getElementById('studentListArea').innerHTML = html;
  } catch (error) {
    document.getElementById('studentListArea').innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
  }
}

async function loadGradeManagementPage() {
  try {
    const classes = await apiCall('/api/teacher/classes');
    let html = '<div class="card"><h3>📝 成绩管理</h3>';
    html += '<div class="form-group"><label>选择课程班级</label><select id="gradeClassSelect" onchange="loadGradeForm()">';
    html += '<option value="">请选择</option>';
    classes.forEach(c => {
      html += `<option value="${c.class_id}" data-course="${c.course_id}" data-semester="${c.semester_id}">${c.grade}年级${c.class_number}班 - ${c.course_name}</option>`;
    });
    html += '</select></div><div id="gradeFormArea"></div></div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function loadGradeForm() {
  const select = document.getElementById('gradeClassSelect');
  const classId = select.value;
  if (!classId) {
    document.getElementById('gradeFormArea').innerHTML = '';
    return;
  }
  const option = select.options[select.selectedIndex];
  const courseId = option.getAttribute('data-course');
  const semesterId = option.getAttribute('data-semester');
  
  try {
    const students = await apiCall(`/api/teacher/class-students?classId=${classId}`);
    const courses = await apiCall('/api/admin/courses');
    const course = courses.find(c => c.id == courseId);
    const hasMidterm = course?.has_midterm_exam === 1;
    
    let html = `<form onsubmit="submitGrades(event, ${courseId}, ${semesterId})">`;
    html += '<table><thead><tr><th>学号</th><th>姓名</th><th>平时成绩</th>';
    if (hasMidterm) html += '<th>期中成绩</th>';
    html += '<th>期末成绩</th></tr></thead><tbody>';
    
    students.forEach(s => {
      html += `<tr><td>${s.student_number}</td><td>${s.name}</td>`;
      html += `<td><input type="number" name="regular_${s.id}" min="0" max="100" step="0.5" required></td>`;
      if (hasMidterm) html += `<td><input type="number" name="midterm_${s.id}" min="0" max="100" step="0.5" required></td>`;
      html += `<td><input type="number" name="final_${s.id}" min="0" max="100" step="0.5" required></td></tr>`;
    });
    
    html += '</tbody></table><button type="submit" class="btn-success" style="margin-top: 20px;">提交成绩</button></form>';
    document.getElementById('gradeFormArea').innerHTML = html;
  } catch (error) {
    document.getElementById('gradeFormArea').innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
  }
}

async function submitGrades(event, courseId, semesterId) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const grades = [];
  
  const students = await apiCall(`/api/teacher/class-students?classId=${document.getElementById('gradeClassSelect').value}`);
  students.forEach(s => {
    const regular = parseFloat(formData.get(`regular_${s.id}`));
    const midterm = formData.get(`midterm_${s.id}`) ? parseFloat(formData.get(`midterm_${s.id}`)) : null;
    const final = parseFloat(formData.get(`final_${s.id}`));
    grades.push({ studentId: s.id, regularScore: regular, midtermScore: midterm, finalScore: final });
  });
  
  try {
    await apiCall('/api/teacher/upload-grades', {
      method: 'POST',
      body: JSON.stringify({ courseId, semesterId, grades })
    });
    alert('成绩提交成功！');
    loadGradeManagementPage();
  } catch (error) {
    alert('提交失败: ' + error.message);
  }
}

async function loadTeacherMakeupPage() {
  try {
    const students = await apiCall('/api/teacher/makeup-students');
    let html = '<div class="card"><h3>🔄 补考管理</h3>';
    
    if (students.length === 0) {
      html += '<div class="empty-state"><p>暂无需要补考的学生</p></div>';
    } else {
      html += '<form onsubmit="submitMakeupGrades(event)"><table><thead><tr><th>学生</th><th>学号</th><th>班级</th><th>课程</th><th>原成绩</th><th>补考成绩</th><th>是否及格</th></tr></thead><tbody>';
      students.forEach(s => {
        html += `<tr><td>${s.student_name}</td><td>${s.student_number}</td><td>${s.class_name}</td><td>${s.course_name}</td>`;
        html += `<td><strong style="color: #dc3545;">${s.total_score.toFixed(1)}</strong></td>`;
        html += `<td><input type="number" name="makeup_${s.grade_id}" min="0" max="100" step="0.5" required></td>`;
        html += `<td><select name="passed_${s.grade_id}"><option value="1">及格</option><option value="0">不及格</option></select></td></tr>`;
      });
      html += '</tbody></table><button type="submit" class="btn-success" style="margin-top: 20px;">提交补考成绩</button></form>';
    }
    
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

async function submitMakeupGrades(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const grades = [];
  
  for (let [key, value] of formData.entries()) {
    if (key.startsWith('makeup_')) {
      const gradeId = parseInt(key.substring(7));
      const score = parseFloat(value);
      const passed = formData.get(`passed_${gradeId}`) === '1';
      grades.push({ gradeId, makeupScore: score, makeupPassed: passed });
    }
  }
  
  try {
    await apiCall('/api/teacher/upload-makeup-scores', {
      method: 'POST',
      body: JSON.stringify({ grades })
    });
    alert('补考成绩提交成功！等待管理员审批');
    loadTeacherMakeupPage();
  } catch (error) {
    alert('提交失败: ' + error.message);
  }
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
        const statusBadge = req.status === 'approved' ? '<span class="badge badge-success">已批准</span>' : req.status === 'rejected' ? '<span class="badge badge-danger">已拒绝</span>' : '<span class="badge badge-warning">待审核</span>';
        html += \`<tr><td>\${req.course_name}</td><td>\${req.class_name}</td><td>\${req.request_type === 'temporary' ? '临时' : '长期'}</td><td>\${req.reason}</td><td>\${statusBadge}</td><td>\${new Date(req.created_at).toLocaleString('zh-CN')}</td></tr>\`;
      });
      html += '</tbody></table>';
    }
    html += '</div><div class="card"><h3>📋 代课申请</h3>';
    if (data.substituteRequests.length === 0) {
      html += '<div class="empty-state"><p>暂无代课申请</p></div>';
    } else {
      html += '<table><thead><tr><th>课程</th><th>班级</th><th>代课教师</th><th>日期</th><th>状态</th><th>提交时间</th></tr></thead><tbody>';
      data.substituteRequests.forEach(req => {
        const statusBadge = req.status === 'approved' ? '<span class="badge badge-success">已批准</span>' : req.status === 'rejected' ? '<span class="badge badge-danger">已拒绝</span>' : '<span class="badge badge-warning">待审核</span>';
        html += \`<tr><td>\${req.course_name}</td><td>\${req.class_name}</td><td>\${req.substitute_teacher_name}</td><td>\${req.substitute_date}</td><td>\${statusBadge}</td><td>\${new Date(req.created_at).toLocaleString('zh-CN')}</td></tr>\`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
  }
}

async function loadTeacherEvaluationPage() {
  try {
    const result = await apiCall('/api/teacher/evaluation-results?courseId=0&semesterId=1');
    let html = '<div class="card"><h3>⭐ 评教结果</h3>';
    html += '<div class="stats-grid">';
    html += `<div class="stat-card"><h4>总评教数</h4><div class="stat-value">${result.totalEvaluations || 0}</div></div>`;
    html += `<div class="stat-card"><h4>平均分</h4><div class="stat-value">${result.averageScore ? result.averageScore.toFixed(2) : '0'}</div></div>`;
    html += '</div>';
    
    if (result.evaluations && result.evaluations.length > 0) {
      html += '<table style="margin-top: 20px;"><thead><tr><th>课程</th><th>班级</th><th>评分</th><th>评教时间</th></tr></thead><tbody>';
      result.evaluations.forEach(e => {
        html += `<tr><td>${e.course_name}</td><td>${e.class_name}</td><td><strong style="color: #667eea;">${e.avg_score ? e.avg_score.toFixed(2) : '-'}</strong></td><td>${new Date(e.created_at).toLocaleDateString('zh-CN')}</td></tr>`;
      });
      html += '</tbody></table>';
    } else {
      html += '<div class="empty-state"><p>暂无评教数据</p></div>';
    }
    
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

// 管理员端功能  
async function loadAdminOverview() {
  try {
    const stats = await apiCall('/api/admin/grade-statistics');
    let html = '<div class="card"><h3>📊 数据概览</h3><div class="stats-grid">';
    html += \`<div class="stat-card"><h4>总学生数</h4><div class="stat-value">\${stats.overall.total_students || 0}</div></div>
      <div class="stat-card"><h4>总课程数</h4><div class="stat-value">\${stats.overall.total_courses || 0}</div></div>
      <div class="stat-card"><h4>平均分</h4><div class="stat-value">\${stats.overall.avg_score ? stats.overall.avg_score.toFixed(1) : '0'}</div></div>
      <div class="stat-card" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);"><h4>需补考</h4><div class="stat-value">\${stats.overall.makeup_count || 0}</div></div>\`;
    html += '</div></div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
  }
}

async function loadScheduleManagement() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>📅 排课管理</h3>
      <button class="btn-success" style="margin-bottom: 20px;" onclick="showCreateScheduleModal()">➕ 创建课程表</button>
      <div id="scheduleListArea"><div class="loading">加载中...</div></div>
    </div>
  `;
  loadScheduleList();
}

async function loadScheduleList() {
  try {
    const schedules = await apiCall('/api/admin/schedules');
    const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    let html = '<table><thead><tr><th>课程</th><th>教师</th><th>班级</th><th>教室</th><th>时间</th><th>操作</th></tr></thead><tbody>';
    if (schedules.length === 0) {
      html += '<tr><td colspan="6" style="text-align:center;">暂无排课数据</td></tr>';
    } else {
      schedules.forEach(s => {
        html += `<tr><td>${s.course_name}</td><td>${s.teacher_name}</td><td>${s.class_name}</td>`;
        html += `<td>${s.building} ${s.room_number}</td>`;
        html += `<td>${days[s.day_of_week]} 第${s.period_start}-${s.period_end}节</td>`;
        html += `<td><button class="btn-small btn-danger" onclick="deleteSchedule(${s.id})">删除</button></td></tr>`;
      });
    }
    html += '</tbody></table>';
    document.getElementById('scheduleListArea').innerHTML = html;
  } catch (error) {
    document.getElementById('scheduleListArea').innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
  }
}

async function showCreateScheduleModal() {
  try {
    const courses = await apiCall('/api/admin/courses');
    const teachers = await apiCall('/api/admin/teachers');
    const classes = await apiCall('/api/admin/classes');
    const classrooms = await apiCall('/api/admin/classrooms');
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>➕ 创建课程表</h3>
          <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="form-group">
          <label>课程</label>
          <select id="scheduleCourse" required>
            <option value="">请选择</option>
            ${courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>教师</label>
          <select id="scheduleTeacher" required>
            <option value="">请选择</option>
            ${teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>班级</label>
          <select id="scheduleClass" required>
            <option value="">请选择</option>
            ${classes.map(c => `<option value="${c.id}">${c.grade}年级${c.class_number}班</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>教室</label>
          <select id="scheduleClassroom" required>
            <option value="">请选择</option>
            ${classrooms.map(r => `<option value="${r.id}">${r.building} ${r.room_number}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>星期</label>
          <select id="scheduleDayOfWeek" required>
            <option value="1">周一</option>
            <option value="2">周二</option>
            <option value="3">周三</option>
            <option value="4">周四</option>
            <option value="5">周五</option>
            <option value="6">周六</option>
            <option value="7">周日</option>
          </select>
        </div>
        <div class="form-group">
          <label>起始节次</label>
          <input type="number" id="schedulePeriodStart" min="1" max="10" required>
        </div>
        <div class="form-group">
          <label>结束节次</label>
          <input type="number" id="schedulePeriodEnd" min="1" max="10" required>
        </div>
        <button onclick="createSchedule()">创建</button>
        <div id="createScheduleError"></div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (error) {
    alert('加载数据失败: ' + error.message);
  }
}

async function createSchedule() {
  const courseId = parseInt(document.getElementById('scheduleCourse').value);
  const teacherId = parseInt(document.getElementById('scheduleTeacher').value);
  const classId = parseInt(document.getElementById('scheduleClass').value);
  const classroomId = parseInt(document.getElementById('scheduleClassroom').value);
  const dayOfWeek = parseInt(document.getElementById('scheduleDayOfWeek').value);
  const periodStart = parseInt(document.getElementById('schedulePeriodStart').value);
  const periodEnd = parseInt(document.getElementById('schedulePeriodEnd').value);
  const errorDiv = document.getElementById('createScheduleError');
  
  if (!courseId || !teacherId || !classId || !classroomId || !dayOfWeek || !periodStart || !periodEnd) {
    errorDiv.textContent = '请填写所有字段';
    errorDiv.className = 'error';
    return;
  }
  
  try {
    await apiCall('/api/admin/schedules', {
      method: 'POST',
      body: JSON.stringify({
        courseId, teacherId, classId, classroomId,
        semesterId: 1,
        dayOfWeek, periodStart, periodEnd
      })
    });
    alert('课程表创建成功！');
    document.querySelector('.modal').remove();
    loadScheduleManagement();
  } catch (error) {
    errorDiv.textContent = '创建失败: ' + error.message;
    errorDiv.className = 'error';
  }
}

async function deleteSchedule(scheduleId) {
  if (!confirm('确定要删除此排课吗？')) return;
  try {
    await apiCall(`/api/admin/schedules?scheduleId=${scheduleId}`, { method: 'DELETE' });
    alert('删除成功！');
    loadScheduleManagement();
  } catch (error) {
    alert('删除失败: ' + error.message);
  }
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
        html += \`<tr><td>\${req.teacher_name}</td><td>\${req.course_name}</td><td>\${req.class_name}</td><td>\${req.request_type === 'temporary' ? '临时' : '长期'}</td><td>\${req.reason}</td><td>\${new Date(req.created_at).toLocaleString('zh-CN')}</td><td><button class="btn-small btn-success" onclick="reviewRequest('reschedule', \${req.id}, true)">批准</button><button class="btn-small btn-danger" onclick="reviewRequest('reschedule', \${req.id}, false)">拒绝</button></td></tr>\`;
      });
      html += '</tbody></table>';
    }
    html += '</div><div class="card"><h3>⏳ 待审核的代课申请</h3>';
    if (data.substituteRequests.length === 0) {
      html += '<div class="empty-state"><p>暂无待审核的代课申请</p></div>';
    } else {
      html += '<table><thead><tr><th>原教师</th><th>代课教师</th><th>课程</th><th>日期</th><th>原因</th><th>提交时间</th><th>操作</th></tr></thead><tbody>';
      data.substituteRequests.forEach(req => {
        html += \`<tr><td>\${req.original_teacher_name}</td><td>\${req.substitute_teacher_name}</td><td>\${req.course_name}</td><td>\${req.substitute_date}</td><td>\${req.reason}</td><td>\${new Date(req.created_at).toLocaleString('zh-CN')}</td><td><button class="btn-small btn-success" onclick="reviewRequest('substitute', \${req.id}, true)">批准</button><button class="btn-small btn-danger" onclick="reviewRequest('substitute', \${req.id}, false)">拒绝</button></td></tr>\`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
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
        html += \`<tr><td>\${req.student_name}</td><td>\${req.student_number}</td><td>\${req.class_name}</td><td>\${req.course_name}</td><td><strong style="color: #dc3545;">\${req.total_score.toFixed(1)}</strong></td><td>\${req.grade}年级</td><td>\${req.teacher_name}</td><td><button class="btn-small btn-success" onclick="approveMakeup(\${req.grade_id}, true)">批准</button><button class="btn-small btn-danger" onclick="approveMakeup(\${req.grade_id}, false)">拒绝</button></td></tr>\`;
      });
      html += '</tbody></table>';
    }
    html += '</div><div class="card"><h3>⏳ 待审批的补考成绩</h3>';
    if (scores.length === 0) {
      html += '<div class="empty-state"><p>暂无待审批的补考成绩</p></div>';
    } else {
      html += '<table><thead><tr><th>学生</th><th>学号</th><th>班级</th><th>课程</th><th>原成绩</th><th>补考成绩</th><th>是否及格</th><th>教师</th><th>操作</th></tr></thead><tbody>';
      scores.forEach(req => {
        const passedBadge = req.makeup_passed ? '<span class="badge badge-success">及格</span>' : '<span class="badge badge-danger">不及格</span>';
        html += \`<tr><td>\${req.student_name}</td><td>\${req.student_number}</td><td>\${req.class_name}</td><td>\${req.course_name}</td><td>\${req.total_score.toFixed(1)}</td><td><strong style="color: #667eea;">\${req.makeup_score.toFixed(1)}</strong></td><td>\${passedBadge}</td><td>\${req.teacher_name}</td><td><button class="btn-small btn-success" onclick="approveMakeupScore(\${req.grade_id}, true)">批准</button><button class="btn-small btn-danger" onclick="approveMakeupScore(\${req.grade_id}, false)">拒绝</button></td></tr>\`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
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
    let html = \`<div class="card"><h3>📊 全校成绩统计</h3><div class="stats-grid">
      <div class="stat-card"><h4>总学生数</h4><div class="stat-value">\${data.overall.total_students || 0}</div></div>
      <div class="stat-card"><h4>总课程数</h4><div class="stat-value">\${data.overall.total_courses || 0}</div></div>
      <div class="stat-card"><h4>平均分</h4><div class="stat-value">\${data.overall.avg_score ? data.overall.avg_score.toFixed(1) : '0'}</div></div>
      <div class="stat-card" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);"><h4>需补考</h4><div class="stat-value">\${data.overall.makeup_count || 0}</div></div>
    </div></div>\`;
    html += '<div class="card"><h3>📈 分数段分布</h3><table><thead><tr><th>分数段</th><th>人次</th></tr></thead><tbody>';
    if (data.distribution && data.distribution.length > 0) {
      data.distribution.forEach(item => {
        html += \`<tr><td>\${item.score_range}</td><td><strong>\${item.count}</strong></td></tr>\`;
      });
    } else {
      html += '<tr><td colspan="2" style="text-align:center;">暂无数据</td></tr>';
    }
    html += '</tbody></table></div>';
    html += '<div class="card"><h3>📚 各科平均分</h3><table><thead><tr><th>课程</th><th>平均分</th><th>学生数</th></tr></thead><tbody>';
    if (data.courseAverages && data.courseAverages.length > 0) {
      data.courseAverages.forEach(item => {
        html += \`<tr><td>\${item.course_name}</td><td><strong style="color: #667eea;">\${item.avg_score ? item.avg_score.toFixed(2) : '0'}</strong></td><td>\${item.student_count}</td></tr>\`;
      });
    } else {
      html += '<tr><td colspan="3" style="text-align:center;">暂无数据</td></tr>';
    }
    html += '</tbody></table></div>';
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = \`<div class="card"><div class="error">加载失败: \${error.message}</div></div>\`;
  }
}

async function loadEvaluationManagement() {
  try {
    const questions = await apiCall('/api/student/evaluation/questions');
    let html = '<div class="card"><h3>✍️ 评教题目管理</h3>';
    html += '<table><thead><tr><th>题目</th><th>类型</th></tr></thead><tbody>';
    
    questions.forEach(q => {
      const type = q.question_type === 'rating' ? '<span class="badge badge-primary">评分题</span>' : '<span class="badge badge-info">文本题</span>';
      html += `<tr><td>${q.question_text}</td><td>${type}</td></tr>`;
    });
    
    html += '</tbody></table>';
    html += '<div class="info-box" style="margin-top: 20px;"><strong>💡 提示</strong><p>评教题目需要在数据库中直接修改，当前共有 <strong>${questions.length}</strong> 道题目。</p></div>';
    html += '</div>';
    
    document.getElementById('contentArea').innerHTML = html;
  } catch (error) {
    document.getElementById('contentArea').innerHTML = `<div class="card"><div class="error">加载失败: ${error.message}</div></div>`;
  }
}

function loadUserManagement() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <h3>👤 用户管理</h3>
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button class="btn-success btn-small" onclick="showCreateUserModal()">➕ 创建用户</button>
        <button class="btn-success btn-small" onclick="showBatchCreateStudentsModal()">📋 批量创建学生</button>
        <button class="btn-success btn-small" onclick="showCreateClassModal()">🎓 创建班级</button>
        <button class="btn-success btn-small" onclick="showCreateClassroomModal()">🏢 创建教室</button>
      </div>
      <div id="userManagementArea"><div class="loading">加载中...</div></div>
    </div>
  `;
  loadAllManagementData();
}

async function loadAllManagementData() {
  try {
    const classes = await apiCall('/api/admin/classes');
    const classrooms = await apiCall('/api/admin/classrooms');
    const teachers = await apiCall('/api/admin/teachers');
    
    let html = '<div class="card" style="background: #f8f9fa;"><h4>👨‍🏫 教师列表</h4><table><thead><tr><th>姓名</th><th>邮箱</th><th>工号</th></tr></thead><tbody>';
    if (teachers.length === 0) {
      html += '<tr><td colspan="3" style="text-align:center;">暂无教师数据</td></tr>';
    } else {
      teachers.forEach(t => {
        html += `<tr><td><strong>${t.name}</strong></td><td>${t.email || '-'}</td><td>${t.employee_number}</td></tr>`;
      });
    }
    html += '</tbody></table></div>';
    
    html += '<div class="card" style="background: #f8f9fa; margin-top: 20px;"><h4>🎓 班级列表</h4><table><thead><tr><th>年级</th><th>班级号</th><th>班主任</th></tr></thead><tbody>';
    if (classes.length === 0) {
      html += '<tr><td colspan="3" style="text-align:center;">暂无班级数据</td></tr>';
    } else {
      classes.forEach(c => {
        html += `<tr><td>${c.grade}年级</td><td>${c.class_number}班</td><td>${c.head_teacher_id || '-'}</td></tr>`;
      });
    }
    html += '</tbody></table></div>';
    
    html += '<div class="card" style="background: #f8f9fa; margin-top: 20px;"><h4>🏢 教室列表</h4><table><thead><tr><th>教室编号</th><th>教学楼</th><th>容量</th><th>类型</th></tr></thead><tbody>';
    if (classrooms.length === 0) {
      html += '<tr><td colspan="4" style="text-align:center;">暂无教室数据</td></tr>';
    } else {
      classrooms.forEach(r => {
        html += `<tr><td>${r.room_number}</td><td>${r.building || '-'}</td><td>${r.capacity || '-'}</td><td>${r.type || '-'}</td></tr>`;
      });
    }
    html += '</tbody></table></div>';
    
    document.getElementById('userManagementArea').innerHTML = html;
  } catch (error) {
    document.getElementById('userManagementArea').innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
  }
}

function showCreateUserModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>➕ 创建用户</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="form-group">
        <label>用户类型</label>
        <select id="newUserRole">
          <option value="student">学生</option>
          <option value="teacher">教师</option>
          <option value="admin">管理员</option>
        </select>
      </div>
      <div class="form-group">
        <label>用户名</label>
        <input type="text" id="newUsername" placeholder="如: teacher001" required>
      </div>
      <div class="form-group">
        <label>密码</label>
        <input type="password" id="newUserPassword" placeholder="至少6位" required>
      </div>
      <div class="form-group">
        <label>姓名</label>
        <input type="text" id="newUserName" placeholder="如: 张三" required>
      </div>
      <div class="form-group">
        <label>邮箱</label>
        <input type="email" id="newUserEmail" placeholder="可选">
      </div>
      <button onclick="createUser()">创建</button>
      <div id="createUserError"></div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function createUser() {
  const role = document.getElementById('newUserRole').value;
  const username = document.getElementById('newUsername').value;
  const password = document.getElementById('newUserPassword').value;
  const name = document.getElementById('newUserName').value;
  const email = document.getElementById('newUserEmail').value;
  const errorDiv = document.getElementById('createUserError');
  
  if (!username || !password || !name) {
    errorDiv.textContent = '请填写必填字段';
    errorDiv.className = 'error';
    return;
  }
  
  if (password.length < 6) {
    errorDiv.textContent = '密码至少6位';
    errorDiv.className = 'error';
    return;
  }
  
  try {
    await apiCall('/api/admin/user', {
      method: 'POST',
      body: JSON.stringify({ username, password, role, name, email })
    });
    alert('用户创建成功！');
    document.querySelector('.modal').remove();
    loadUserManagement();
  } catch (error) {
    errorDiv.textContent = '创建失败: ' + error.message;
    errorDiv.className = 'error';
  }
}

function showBatchCreateStudentsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>📋 批量创建学生</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="form-group">
        <label>学生信息（每行一个，格式：学号,姓名,年级,班级ID）</label>
        <textarea id="batchStudentData" rows="10" placeholder="示例：\n20240001,张三,10,1\n20240002,李四,10,1\n20240003,王五,11,2"></textarea>
      </div>
      <div class="info-box">
        <strong>💡 说明</strong>
        <p>• 每行一个学生，用逗号分隔</p>
        <p>• 格式：学号,姓名,年级,班级ID</p>
        <p>• 密码将自动设为：student123</p>
      </div>
      <button onclick="batchCreateStudents()">批量创建</button>
      <div id="batchCreateError"></div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function batchCreateStudents() {
  const data = document.getElementById('batchStudentData').value.trim();
  const errorDiv = document.getElementById('batchCreateError');
  
  if (!data) {
    errorDiv.textContent = '请输入学生信息';
    errorDiv.className = 'error';
    return;
  }
  
  const lines = data.split('\n');
  const students = [];
  
  for (let line of lines) {
    const parts = line.trim().split(',');
    if (parts.length !== 4) {
      errorDiv.textContent = `格式错误: ${line}`;
      errorDiv.className = 'error';
      return;
    }
    students.push({
      studentNumber: parts[0].trim(),
      name: parts[1].trim(),
      grade: parseInt(parts[2].trim()),
      classId: parseInt(parts[3].trim())
    });
  }
  
  try {
    const result = await apiCall('/api/admin/batch-create-students', {
      method: 'POST',
      body: JSON.stringify({ students })
    });
    
    const successCount = result.filter(r => r.success).length;
    const failCount = result.filter(r => !r.success).length;
    
    alert(`批量创建完成！\n成功: ${successCount}个\n失败: ${failCount}个`);
    
    if (failCount > 0) {
      const failures = result.filter(r => !r.success);
      console.log('失败记录:', failures);
    }
    
    document.querySelector('.modal').remove();
    loadUserManagement();
  } catch (error) {
    errorDiv.textContent = '创建失败: ' + error.message;
    errorDiv.className = 'error';
  }
}

async function loadClassList() {
  try {
    const classes = await apiCall('/api/admin/classes');
    const classrooms = await apiCall('/api/admin/classrooms');
    
    let html = '<div class="card" style="background: #f8f9fa;"><h4>🏫 班级列表</h4><table><thead><tr><th>年级</th><th>班级号</th><th>班主任</th></tr></thead><tbody>';
    if (classes.length === 0) {
      html += '<tr><td colspan="3" style="text-align:center;">暂无班级数据</td></tr>';
    } else {
      classes.forEach(c => {
        html += \`<tr><td>\${c.grade}年级</td><td>\${c.class_number}班</td><td>\${c.head_teacher_id || '-'}</td></tr>\`;
      });
    }
    html += '</tbody></table></div>';
    
    html += '<div class="card" style="background: #f8f9fa; margin-top: 20px;"><h4>🏢 教室列表</h4><table><thead><tr><th>教室编号</th><th>教学楼</th><th>容量</th><th>类型</th></tr></thead><tbody>';
    if (classrooms.length === 0) {
      html += '<tr><td colspan="4" style="text-align:center;">暂无教室数据</td></tr>';
    } else {
      classrooms.forEach(r => {
        html += \`<tr><td>\${r.room_number}</td><td>\${r.building || '-'}</td><td>\${r.capacity || '-'}</td><td>\${r.type || '-'}</td></tr>\`;
      });
    }
    html += '</tbody></table></div>';
    
    document.getElementById('classListArea').innerHTML = html;
  } catch (error) {
    document.getElementById('classListArea').innerHTML = \`<div class="error">加载失败: \${error.message}</div>\`;
  }
}

function showCreateClassModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = \`
    <div class="modal-content">
      <div class="modal-header">
        <h3>➕ 创建班级</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="form-group">
        <label>年级</label>
        <select id="newClassGrade">
          <option value="10">10年级</option>
          <option value="11">11年级</option>
          <option value="12">12年级</option>
        </select>
      </div>
      <div class="form-group">
        <label>班级号</label>
        <input type="number" id="newClassNumber" placeholder="如: 1" min="1" required>
      </div>
      <button onclick="createClass()">创建</button>
      <div id="createClassError"></div>
    </div>
  \`;
  document.body.appendChild(modal);
}

async function createClass() {
  const grade = parseInt(document.getElementById('newClassGrade').value);
  const classNumber = parseInt(document.getElementById('newClassNumber').value);
  const errorDiv = document.getElementById('createClassError');
  
  if (!classNumber) {
    errorDiv.textContent = '请输入班级号';
    errorDiv.className = 'error';
    return;
  }
  
  try {
    await apiCall('/api/admin/class', {
      method: 'POST',
      body: JSON.stringify({ grade, classNumber })
    });
    alert('班级创建成功！');
    document.querySelector('.modal').remove();
    loadUserManagement();
  } catch (error) {
    errorDiv.textContent = '创建失败: ' + error.message;
    errorDiv.className = 'error';
  }
}

function showCreateClassroomModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = \`
    <div class="modal-content">
      <div class="modal-header">
        <h3>➕ 创建教室</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="form-group">
        <label>教室编号</label>
        <input type="text" id="newRoomNumber" placeholder="如: 301" required>
      </div>
      <div class="form-group">
        <label>教学楼</label>
        <input type="text" id="newBuilding" placeholder="如: A栋" required>
      </div>
      <div class="form-group">
        <label>容量（人）</label>
        <input type="number" id="newCapacity" placeholder="如: 50" min="1">
      </div>
      <div class="form-group">
        <label>教室类型</label>
        <select id="newRoomType">
          <option value="普通教室">普通教室</option>
          <option value="实验室">实验室</option>
          <option value="计算机房">计算机房</option>
          <option value="多媒体教室">多媒体教室</option>
        </select>
      </div>
      <button onclick="createClassroom()">创建</button>
      <div id="createClassroomError"></div>
    </div>
  \`;
  document.body.appendChild(modal);
}

async function createClassroom() {
  const roomNumber = document.getElementById('newRoomNumber').value;
  const building = document.getElementById('newBuilding').value;
  const capacity = parseInt(document.getElementById('newCapacity').value) || 50;
  const type = document.getElementById('newRoomType').value;
  const errorDiv = document.getElementById('createClassroomError');
  
  if (!roomNumber || !building) {
    errorDiv.textContent = '请填写所有必填字段';
    errorDiv.className = 'error';
    return;
  }
  
  try {
    await apiCall('/api/admin/classroom', {
      method: 'POST',
      body: JSON.stringify({ roomNumber, building, capacity, type })
    });
    alert('教室创建成功！');
    document.querySelector('.modal').remove();
    loadUserManagement();
  } catch (error) {
    errorDiv.textContent = '创建失败: ' + error.message;
    errorDiv.className = 'error';
  }
}

function loadCourseManagement() {
  document.getElementById('contentArea').innerHTML = \`
    <div class="card">
      <h3>📚 课程管理</h3>
      <button class="btn-success" style="margin-bottom: 20px;" onclick="showCreateCourseModal()">➕ 创建课程</button>
      <div id="courseListArea"><div class="loading">加载中...</div></div>
    </div>
  \`;
  loadCourseList();
}

async function loadCourseList() {
  try {
    const courses = await apiCall('/api/admin/courses');
    
    let html = '<table><thead><tr><th>课程名称</th><th>课程代码</th><th>学分</th><th>期中考试</th><th>操作</th></tr></thead><tbody>';
    if (courses.length === 0) {
      html += '<tr><td colspan="5" style="text-align:center;">暂无课程数据</td></tr>';
    } else {
      courses.forEach(course => {
        const hasMidterm = course.has_midterm_exam ? '<span class="badge badge-success">有</span>' : '<span class="badge badge-warning">无</span>';
        html += \`<tr>
          <td><strong>\${course.name}</strong></td>
          <td>\${course.code}</td>
          <td>\${course.credits}</td>
          <td>\${hasMidterm}</td>
          <td>
            <button class="btn-small btn-warning" onclick="toggleMidterm(\${course.id}, \${course.has_midterm_exam ? 'false' : 'true'})">
              \${course.has_midterm_exam ? '取消期中' : '设置期中'}
            </button>
          </td>
        </tr>\`;
      });
    }
    html += '</tbody></table>';
    
    document.getElementById('courseListArea').innerHTML = html;
  } catch (error) {
    document.getElementById('courseListArea').innerHTML = \`<div class="error">加载失败: \${error.message}</div>\`;
  }
}

function showCreateCourseModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = \`
    <div class="modal-content">
      <div class="modal-header">
        <h3>➕ 创建课程</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="form-group">
        <label>课程名称</label>
        <input type="text" id="newCourseName" placeholder="如: 高中数学" required>
      </div>
      <div class="form-group">
        <label>课程代码</label>
        <input type="text" id="newCourseCode" placeholder="如: MATH101" required>
      </div>
      <div class="form-group">
        <label>学分</label>
        <input type="number" id="newCourseCredits" placeholder="如: 3" min="0" step="0.5" required>
      </div>
      <div class="form-group">
        <label>期中考试</label>
        <select id="newCourseHasMidterm">
          <option value="true">有期中考试</option>
          <option value="false">无期中考试</option>
        </select>
      </div>
      <button onclick="createCourse()">创建</button>
      <div id="createCourseError"></div>
    </div>
  \`;
  document.body.appendChild(modal);
}

async function createCourse() {
  const name = document.getElementById('newCourseName').value;
  const code = document.getElementById('newCourseCode').value;
  const credits = parseFloat(document.getElementById('newCourseCredits').value);
  const hasMidtermExam = document.getElementById('newCourseHasMidterm').value === 'true';
  const errorDiv = document.getElementById('createCourseError');
  
  if (!name || !code || !credits) {
    errorDiv.textContent = '请填写所有字段';
    errorDiv.className = 'error';
    return;
  }
  
  try {
    await apiCall('/api/admin/course', {
      method: 'POST',
      body: JSON.stringify({ name, code, credits, hasMidtermExam })
    });
    alert('课程创建成功！');
    document.querySelector('.modal').remove();
    loadCourseManagement();
  } catch (error) {
    errorDiv.textContent = '创建失败: ' + error.message;
    errorDiv.className = 'error';
  }
}

async function toggleMidterm(courseId, hasMidterm) {
  try {
    await apiCall('/api/admin/update-course', {
      method: 'POST',
      body: JSON.stringify({ courseId, hasMidtermExam: hasMidterm })
    });
    alert('更新成功！');
    loadCourseManagement();
  } catch (error) {
    alert('更新失败: ' + error.message);
  }
}

// 修改密码功能
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

document.addEventListener('DOMContentLoaded', function() {
  console.log('教育管理系统已加载');
});
  `.trim();
}
