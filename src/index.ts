import { Env, JWTPayload } from './types';
import { authenticateRequest, createJWT, verifyPassword, hasRole, changePassword } from './auth';
import * as studentApi from './api/student';
import * as teacherApi from './api/teacher';
import * as adminApi from './api/admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: any, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, ...headers, 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Authenticate user (except login endpoint)
    let authUser: JWTPayload | null = null;
    if (path !== '/api/login') {
      authUser = await authenticateRequest(request, env);
      if (!authUser) {
        return jsonResponse({ error: '未授权' }, 401, corsHeaders);
      }
    }

    // Login endpoint
    if (path === '/api/login' && request.method === 'POST') {
      const body = await request.json() as any;
      const db = env.DB as any;
      
      const user = await db.prepare(
        'SELECT id, username, password, name, role FROM users WHERE username = ?'
      ).bind(body.username).first();

      if (!user || !await verifyPassword(body.password, user.password)) {
        return jsonResponse({ error: '用户名或密码错误' }, 401, corsHeaders);
      }

      const token = await createJWT({
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }, env.JWT_SECRET);

      return jsonResponse({ 
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          role: user.role 
        } 
      }, 200, corsHeaders);
    }

    // Change password endpoint
    if (path === '/api/change-password' && request.method === 'POST') {
      const body = await request.json() as any;
      const data = await changePassword(env, authUser!.userId, body.oldPassword, body.newPassword);
      return jsonResponse({ success: data }, 200, corsHeaders);
    }

    // Student API endpoints
    if (path === '/api/student/schedule' && authUser && hasRole(authUser, 'student')) {
      const semesterId = url.searchParams.get('semesterId');
      const data = await studentApi.getStudentSchedule(env, authUser, semesterId ? parseInt(semesterId) : undefined);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/student/grades' && authUser && hasRole(authUser, 'student')) {
      const semesterId = url.searchParams.get('semesterId');
      const data = await studentApi.getStudentGrades(env, authUser, semesterId ? parseInt(semesterId) : undefined);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/student/ranking' && authUser && hasRole(authUser, 'student')) {
      const semesterId = url.searchParams.get('semesterId');
      if (!semesterId) {
        return jsonResponse({ error: '缺少参数' }, 400, corsHeaders);
      }
      const data = await studentApi.getStudentRanking(env, authUser, parseInt(semesterId));
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/student/grade-trend' && authUser && hasRole(authUser, 'student')) {
      const data = await studentApi.getGradeTrend(env, authUser);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/student/evaluation-questions' && authUser) {
      const data = await studentApi.getEvaluationQuestions(env);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/student/courses-for-evaluation' && authUser && hasRole(authUser, 'student')) {
      const semesterId = url.searchParams.get('semesterId');
      if (!semesterId) {
        return jsonResponse({ error: '缺少参数' }, 400, corsHeaders);
      }
      const data = await studentApi.getCoursesForEvaluation(env, authUser, parseInt(semesterId));
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/student/submit-evaluation' && request.method === 'POST' && authUser && hasRole(authUser, 'student')) {
      const body = await request.json();
      const data = await studentApi.submitEvaluation(env, authUser, body);
      return jsonResponse(data, 200, corsHeaders);
    }

    // Teacher API endpoints
    if (path === '/api/teacher/classes' && authUser && hasRole(authUser, 'teacher')) {
      const data = await teacherApi.getTeacherClasses(env, authUser);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/teacher/schedule' && authUser && hasRole(authUser, 'teacher')) {
      const semesterId = url.searchParams.get('semesterId');
      const data = await teacherApi.getTeacherSchedule(env, authUser, semesterId ? parseInt(semesterId) : undefined);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/teacher/class-students' && authUser && hasRole(authUser, 'teacher')) {
      const classId = url.searchParams.get('classId');
      if (!classId) {
        return jsonResponse({ error: '缺少参数' }, 400, corsHeaders);
      }
      const data = await teacherApi.getClassStudents(env, authUser, parseInt(classId));
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/teacher/upload-grades' && request.method === 'POST' && authUser && hasRole(authUser, 'teacher')) {
      const body = await request.json();
      const data = await teacherApi.uploadGrades(env, authUser, body);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/teacher/evaluation-results' && authUser && hasRole(authUser, 'teacher')) {
      const courseId = url.searchParams.get('courseId');
      const semesterId = url.searchParams.get('semesterId');
      if (!courseId || !semesterId) {
        return jsonResponse({ error: '缺少参数' }, 400, corsHeaders);
      }
      const data = await teacherApi.getEvaluationResults(env, authUser, parseInt(courseId), parseInt(semesterId));
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/teacher/reschedule-request' && request.method === 'POST' && authUser && hasRole(authUser, 'teacher')) {
      const body = await request.json();
      const data = await teacherApi.submitRescheduleRequest(env, authUser, body);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/teacher/substitute-request' && request.method === 'POST' && authUser && hasRole(authUser, 'teacher')) {
      const body = await request.json();
      const data = await teacherApi.submitSubstituteRequest(env, authUser, body);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/teacher/requests' && authUser && hasRole(authUser, 'teacher')) {
      const data = await teacherApi.getTeacherRequests(env, authUser);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/teacher/makeup-students' && authUser && hasRole(authUser, 'teacher')) {
      const courseId = url.searchParams.get('courseId');
      const semesterId = url.searchParams.get('semesterId');
      if (!courseId || !semesterId) {
        return jsonResponse({ error: '缺少参数' }, 400, corsHeaders);
      }
      const data = await teacherApi.getStudentsNeedingMakeup(env, authUser, parseInt(courseId), parseInt(semesterId));
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/teacher/upload-makeup-scores' && request.method === 'POST' && authUser && hasRole(authUser, 'teacher')) {
      const body = await request.json();
      const data = await teacherApi.uploadMakeupScores(env, authUser, body);
      return jsonResponse(data, 200, corsHeaders);
    }

    // Admin API endpoints
    if (path === '/api/admin/courses' && authUser && hasRole(authUser, 'admin')) {
      const data = await adminApi.getAllCourses(env);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/course' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json() as any;
      const data = await adminApi.createCourse(env, body.name, body.code, body.credits, body.hasMidtermExam);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/update-course' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json() as any;
      const data = await adminApi.updateCourseSettings(env, body.courseId, body.hasMidtermExam);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/classrooms' && authUser && hasRole(authUser, 'admin')) {
      const data = await adminApi.getAllClassrooms(env);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/classroom' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json() as any;
      const data = await adminApi.createClassroom(env, body.roomNumber, body.building, body.capacity, body.type);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/classes' && authUser && hasRole(authUser, 'admin')) {
      const data = await adminApi.getAllClasses(env);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/class' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json() as any;
      const data = await adminApi.createClass(env, body.grade, body.classNumber, body.headTeacherId);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/teachers' && authUser && hasRole(authUser, 'admin')) {
      const data = await adminApi.getAllTeachers(env);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/schedules' && authUser && hasRole(authUser, 'admin')) {
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

    if (path === '/api/admin/create-user' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json();
      const data = await adminApi.createUser(env, body);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/batch-create-students' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json() as any;
      const data = await adminApi.batchCreateStudents(env, body.students);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/pending-requests' && authUser && hasRole(authUser, 'admin')) {
      const data = await adminApi.getPendingRequests(env);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/review-reschedule' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json() as any;
      const data = await adminApi.reviewRescheduleRequest(env, body.requestId, body.status, body.adminNote);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/review-substitute' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json() as any;
      const data = await adminApi.reviewSubstituteRequest(env, body.requestId, body.status, body.adminNote);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/grade-statistics' && authUser && hasRole(authUser, 'admin')) {
      const semesterId = url.searchParams.get('semesterId');
      const data = await adminApi.getSchoolGradeStatistics(env, semesterId ? parseInt(semesterId) : undefined);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/pending-makeup-requests' && authUser && hasRole(authUser, 'admin')) {
      const data = await adminApi.getPendingMakeupRequests(env);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/approve-makeup' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json() as any;
      const data = await adminApi.approveMakeupRequest(env, body.gradeId, body.approved);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/pending-makeup-scores' && authUser && hasRole(authUser, 'admin')) {
      const data = await adminApi.getPendingMakeupScores(env);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/approve-makeup-score' && request.method === 'POST' && authUser && hasRole(authUser, 'admin')) {
      const body = await request.json() as any;
      const data = await adminApi.approveMakeupScore(env, body.gradeId, body.approved);
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/admin/evaluation-questions' && authUser && hasRole(authUser, 'admin')) {
      if (request.method === 'GET') {
        const data = await adminApi.manageEvaluationQuestions(env, 'get', {});
        return jsonResponse(data, 200, corsHeaders);
      } else if (request.method === 'POST') {
        const body = await request.json();
        const data = await adminApi.manageEvaluationQuestions(env, 'create', body);
        return jsonResponse(data, 200, corsHeaders);
      }
    }

    if (path === '/api/admin/evaluation-periods' && authUser && hasRole(authUser, 'admin')) {
      if (request.method === 'GET') {
        const data = await adminApi.manageEvaluationPeriods(env, 'get', {});
        return jsonResponse(data, 200, corsHeaders);
      } else if (request.method === 'POST') {
        const body = await request.json();
        const data = await adminApi.manageEvaluationPeriods(env, 'create', body);
        return jsonResponse(data, 200, corsHeaders);
      }
    }

    // Not found
    return jsonResponse({ error: '请求路径不存在' }, 404, corsHeaders);
  }
};
