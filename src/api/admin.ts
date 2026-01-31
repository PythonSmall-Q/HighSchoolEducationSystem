import { Env, JWTPayload } from '../types';

// 管理评教题目
export async function manageEvaluationQuestions(env: Env, action: string, data: any) {
  if (action === 'list') {
    const result = await env.DB.prepare(`
      SELECT * FROM evaluation_questions ORDER BY order_number
    `).all();
    return result.results;
  }
  
  if (action === 'create') {
    const { questionText, questionType, orderNumber } = data;
    const result = await env.DB.prepare(`
      INSERT INTO evaluation_questions (question_text, question_type, order_number)
      VALUES (?, ?, ?)
    `).bind(questionText, questionType, orderNumber).run();
    return { success: true, id: result.meta.last_row_id };
  }
  
  if (action === 'update') {
    const { id, questionText, questionType, orderNumber, isActive } = data;
    await env.DB.prepare(`
      UPDATE evaluation_questions
      SET question_text = ?, question_type = ?, order_number = ?, is_active = ?
      WHERE id = ?
    `).bind(questionText, questionType, orderNumber, isActive ? 1 : 0, id).run();
    return { success: true };
  }
  
  if (action === 'delete') {
    await env.DB.prepare(`DELETE FROM evaluation_questions WHERE id = ?`).bind(data.id).run();
    return { success: true };
  }
  
  throw new Error('Invalid action');
}

// 管理评教期
export async function manageEvaluationPeriods(env: Env, action: string, data: any) {
  if (action === 'list') {
    const result = await env.DB.prepare(`
      SELECT ep.*, s.name as semester_name
      FROM evaluation_periods ep
      JOIN semesters s ON ep.semester_id = s.id
      ORDER BY ep.start_date DESC
    `).all();
    return result.results;
  }
  
  if (action === 'create') {
    const { semesterId, startDate, endDate } = data;
    const result = await env.DB.prepare(`
      INSERT INTO evaluation_periods (semester_id, start_date, end_date, is_active)
      VALUES (?, ?, ?, 1)
    `).bind(semesterId, startDate, endDate).run();
    return { success: true, id: result.meta.last_row_id };
  }
  
  if (action === 'toggle') {
    const { id, isActive } = data;
    await env.DB.prepare(`
      UPDATE evaluation_periods SET is_active = ? WHERE id = ?
    `).bind(isActive ? 1 : 0, id).run();
    return { success: true };
  }
  
  throw new Error('Invalid action');
}

// 审核调课申请
export async function reviewRescheduleRequest(env: Env, requestId: number, status: string, adminNote?: string) {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Invalid status');
  }
  
  // 更新申请状态
  await env.DB.prepare(`
    UPDATE reschedule_requests
    SET status = ?, admin_note = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, adminNote || null, requestId).run();
  
  // 如果批准，更新课表
  if (status === 'approved') {
    const request = await env.DB.prepare(`
      SELECT * FROM reschedule_requests WHERE id = ?
    `).bind(requestId).first();
    
    if (request) {
      await env.DB.prepare(`
        UPDATE schedules
        SET day_of_week = COALESCE(?, day_of_week),
            period_start = COALESCE(?, period_start),
            period_end = COALESCE(?, period_end),
            classroom_id = COALESCE(?, classroom_id),
            is_rescheduled = 1,
            reschedule_note = ?
        WHERE id = ?
      `).bind(
        request.new_day_of_week,
        request.new_period_start,
        request.new_period_end,
        request.new_classroom_id,
        request.reason,
        request.schedule_id
      ).run();
    }
  }
  
  return { success: true };
}

// 审核代课申请
export async function reviewSubstituteRequest(env: Env, requestId: number, status: string, adminNote?: string) {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Invalid status');
  }
  
  // 更新申请状态
  await env.DB.prepare(`
    UPDATE substitute_requests
    SET status = ?, admin_note = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, adminNote || null, requestId).run();
  
  // 如果批准，标记课表
  if (status === 'approved') {
    const request = await env.DB.prepare(`
      SELECT * FROM substitute_requests WHERE id = ?
    `).bind(requestId).first();
    
    if (request) {
      await env.DB.prepare(`
        UPDATE schedules
        SET is_substitute = 1,
            substitute_note = ?
        WHERE id = ?
      `).bind(`代课教师已安排 - ${request.substitute_date}`, request.schedule_id).run();
    }
  }
  
  return { success: true };
}

// 获取所有待审核的申请
export async function getPendingRequests(env: Env) {
  const rescheduleRequests = await env.DB.prepare(`
    SELECT 
      rr.*,
      c.name as course_name,
      cl.name as class_name,
      u.name as teacher_name
    FROM reschedule_requests rr
    JOIN schedules s ON rr.schedule_id = s.id
    JOIN courses c ON s.course_id = c.id
    JOIN classes cl ON s.class_id = cl.id
    JOIN teachers t ON rr.teacher_id = t.id
    JOIN users u ON t.user_id = u.id
    WHERE rr.status = 'pending'
    ORDER BY rr.created_at DESC
  `).all();
  
  const substituteRequests = await env.DB.prepare(`
    SELECT 
      sr.*,
      c.name as course_name,
      cl.name as class_name,
      u1.name as original_teacher_name,
      u2.name as substitute_teacher_name
    FROM substitute_requests sr
    JOIN schedules s ON sr.schedule_id = s.id
    JOIN courses c ON s.course_id = c.id
    JOIN classes cl ON s.class_id = cl.id
    JOIN teachers t1 ON sr.original_teacher_id = t1.id
    JOIN users u1 ON t1.user_id = u1.id
    JOIN teachers t2 ON sr.substitute_teacher_id = t2.id
    JOIN users u2 ON t2.user_id = u2.id
    WHERE sr.status = 'pending'
    ORDER BY sr.created_at DESC
  `).all();
  
  return {
    rescheduleRequests: rescheduleRequests.results,
    substituteRequests: substituteRequests.results
  };
}

// 获取全校成绩统计
export async function getSchoolGradeStatistics(env: Env, semesterId?: number) {
  const semesterCondition = semesterId ? `WHERE g.semester_id = ?` : `WHERE g.semester_id = (SELECT id FROM semesters WHERE is_current = 1)`;
  const params = semesterId ? [semesterId] : [];
  
  // 总体统计
  const overall = await env.DB.prepare(`
    SELECT 
      COUNT(DISTINCT g.student_id) as total_students,
      COUNT(DISTINCT g.course_id) as total_courses,
      AVG(g.total_score) as avg_score,
      COUNT(CASE WHEN g.needs_makeup = 1 THEN 1 END) as makeup_count
    FROM grades g
    ${semesterCondition}
  `).bind(...params).first();
  
  // 分数段分布
  const distribution = await env.DB.prepare(`
    SELECT 
      CASE 
        WHEN total_score >= 90 THEN '优秀 (90-100)'
        WHEN total_score >= 80 THEN '良好 (80-89)'
        WHEN total_score >= 70 THEN '中等 (70-79)'
        WHEN total_score >= 60 THEN '及格 (60-69)'
        ELSE '不及格 (<60)'
      END as score_range,
      COUNT(*) as count
    FROM grades
    ${semesterCondition}
    GROUP BY score_range
    ORDER BY MIN(total_score) DESC
  `).bind(...params).all();
  
  // 各科平均分
  const courseAverages = await env.DB.prepare(`
    SELECT 
      c.name as course_name,
      AVG(g.total_score) as avg_score,
      COUNT(g.id) as student_count
    FROM grades g
    JOIN courses c ON g.course_id = c.id
    ${semesterCondition}
    GROUP BY c.id, c.name
    ORDER BY avg_score DESC
  `).bind(...params).all();
  
  // 需要补考的学生
  const makeupStudents = await env.DB.prepare(`
    SELECT 
      u.name as student_name,
      st.student_number,
      cl.name as class_name,
      c.name as course_name,
      g.total_score
    FROM grades g
    JOIN students st ON g.student_id = st.id
    JOIN users u ON st.user_id = u.id
    JOIN classes cl ON st.class_id = cl.id
    JOIN courses c ON g.course_id = c.id
    WHERE g.needs_makeup = 1
    ${semesterCondition.replace('WHERE', 'AND')}
    ORDER BY cl.name, st.student_number
  `).bind(...params).all();
  
  return {
    overall,
    distribution: distribution.results,
    courseAverages: courseAverages.results,
    makeupStudents: makeupStudents.results
  };
}

// 创建用户（学生或教师）
export async function createUser(env: Env, data: any) {
  const { username, password, role, name, email, additionalInfo } = data;
  
  // 哈希密码
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', passwordData);
  const passwordHash = btoa(String.fromCharCode(...new Uint8Array(hash)));
  
  // 创建用户
  const userResult = await env.DB.prepare(`
    INSERT INTO users (username, password_hash, role, name, email)
    VALUES (?, ?, ?, ?, ?)
  `).bind(username, passwordHash, role, name, email).run();
  
  const userId = userResult.meta.last_row_id;
  
  // 根据角色创建额外信息
  if (role === 'student') {
    await env.DB.prepare(`
      INSERT INTO students (user_id, student_number, class_id, grade)
      VALUES (?, ?, ?, ?)
    `).bind(userId, additionalInfo.studentNumber, additionalInfo.classId, additionalInfo.grade).run();
  } else if (role === 'teacher') {
    await env.DB.prepare(`
      INSERT INTO teachers (user_id, teacher_number, department, title)
      VALUES (?, ?, ?, ?)
    `).bind(userId, additionalInfo.teacherNumber, additionalInfo.department, additionalInfo.title).run();
  }
  
  return { success: true, userId };
}

// 获取待审批的补考申请
export async function getPendingMakeupRequests(env: Env) {
  const query = `
    SELECT 
      g.id as grade_id,
      g.total_score,
      g.needs_makeup,
      g.makeup_approved,
      u.name as student_name,
      st.student_number,
      st.grade,
      cl.name as class_name,
      c.name as course_name,
      ut.name as teacher_name
    FROM grades g
    JOIN students st ON g.student_id = st.id
    JOIN users u ON st.user_id = u.id
    JOIN classes cl ON st.class_id = cl.id
    JOIN courses c ON g.course_id = c.id
    JOIN teachers t ON g.teacher_id = t.id
    JOIN users ut ON t.user_id = ut.id
    WHERE g.needs_makeup = 1 AND g.makeup_approved = 0
    ORDER BY st.grade, cl.name, st.student_number
  `;
  
  const result = await env.DB.prepare(query).all();
  return result.results;
}

// 审批补考申请
export async function approveMakeupRequest(env: Env, gradeId: number, approved: boolean) {
  await env.DB.prepare(`
    UPDATE grades
    SET makeup_approved = ?
    WHERE id = ?
  `).bind(approved ? 1 : 0, gradeId).run();
  
  return { success: true };
}

// 审批补考成绩
export async function approveMakeupScore(env: Env, gradeId: number, approved: boolean) {
  await env.DB.prepare(`
    UPDATE grades
    SET makeup_approved_final = ?
    WHERE id = ?
  `).bind(approved ? 1 : 0, gradeId).run();
  
  return { success: true };
}

// 获取待审批的补考成绩
export async function getPendingMakeupScores(env: Env) {
  const query = `
    SELECT 
      g.id as grade_id,
      g.total_score,
      g.makeup_score,
      g.makeup_passed,
      g.makeup_approved_final,
      u.name as student_name,
      st.student_number,
      cl.name as class_name,
      c.name as course_name,
      ut.name as teacher_name
    FROM grades g
    JOIN students st ON g.student_id = st.id
    JOIN users u ON st.user_id = u.id
    JOIN classes cl ON st.class_id = cl.id
    JOIN courses c ON g.course_id = c.id
    JOIN teachers t ON g.teacher_id = t.id
    JOIN users ut ON t.user_id = ut.id
    WHERE g.makeup_approved = 1 
    AND g.makeup_score IS NOT NULL 
    AND g.makeup_approved_final = 0
    ORDER BY cl.name, st.student_number
  `;
  
  const result = await env.DB.prepare(query).all();
  return result.results;
}

// 创建课表（排课）
export async function createSchedule(env: Env, data: any) {
  const { courseId, teacherId, classId, classroomId, semesterId, dayOfWeek, periodStart, periodEnd } = data;
  
  // 检查冲突
  const conflict = await env.DB.prepare(`
    SELECT id FROM schedules
    WHERE classroom_id = ? AND semester_id = ? AND day_of_week = ?
    AND ((period_start <= ? AND period_end > ?) OR (period_start < ? AND period_end >= ?))
  `).bind(classroomId, semesterId, dayOfWeek, periodStart, periodStart, periodEnd, periodEnd).first();
  
  if (conflict) {
    throw new Error('Schedule conflict: classroom is occupied');
  }
  
  const result = await env.DB.prepare(`
    INSERT INTO schedules (course_id, teacher_id, class_id, classroom_id, semester_id, day_of_week, period_start, period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(courseId, teacherId, classId, classroomId, semesterId, dayOfWeek, periodStart, periodEnd).run();
  
  return { success: true, scheduleId: result.meta.last_row_id };
}

// 删除课表
export async function deleteSchedule(env: Env, scheduleId: number) {
  await env.DB.prepare(`DELETE FROM schedules WHERE id = ?`).bind(scheduleId).run();
  return { success: true };
}

// 获取所有课表
export async function getAllSchedules(env: Env, semesterId?: number) {
  const query = `
    SELECT 
      s.*,
      c.name as course_name,
      c.code as course_code,
      t.teacher_number,
      u.name as teacher_name,
      cl.name as class_name,
      cr.room_number,
      cr.building
    FROM schedules s
    JOIN courses c ON s.course_id = c.id
    JOIN teachers t ON s.teacher_id = t.id
    JOIN users u ON t.user_id = u.id
    JOIN classes cl ON s.class_id = cl.id
    JOIN classrooms cr ON s.classroom_id = cr.id
    ${semesterId ? 'WHERE s.semester_id = ?' : ''}
    ORDER BY s.day_of_week, s.period_start
  `;
  
  const result = semesterId 
    ? await env.DB.prepare(query).bind(semesterId).all()
    : await env.DB.prepare(query).all();
  
  return result.results;
}

// 批量创建学生
export async function batchCreateStudents(env: Env, students: any[]) {
  const results = [];
  
  for (const student of students) {
    const { username, password, name, email, studentNumber, classId, grade } = student;
    
    try {
      // 哈希密码
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const hash = await crypto.subtle.digest('SHA-256', passwordData);
      const passwordHash = btoa(String.fromCharCode(...new Uint8Array(hash)));
      
      // 创建用户
      const userResult = await env.DB.prepare(`
        INSERT INTO users (username, password_hash, role, name, email)
        VALUES (?, ?, 'student', ?, ?)
      `).bind(username, passwordHash, name, email).run();
      
      const userId = userResult.meta.last_row_id;
      
      // 创建学生信息
      await env.DB.prepare(`
        INSERT INTO students (user_id, student_number, class_id, grade)
        VALUES (?, ?, ?, ?)
      `).bind(userId, studentNumber, classId, grade).run();
      
      results.push({ success: true, username, userId });
    } catch (error: any) {
      results.push({ success: false, username, error: error.message });
    }
  }
  
  return results;
}

// 更新课程设置（是否有期中考试）
export async function updateCourseSettings(env: Env, courseId: number, hasMidtermExam: boolean) {
  await env.DB.prepare(`
    UPDATE courses SET has_midterm_exam = ? WHERE id = ?
  `).bind(hasMidtermExam ? 1 : 0, courseId).run();
  
  return { success: true };
}

// 获取所有课程
export async function getAllCourses(env: Env) {
  const result = await env.DB.prepare(`
    SELECT * FROM courses ORDER BY name
  `).all();
  return result.results;
}

// 获取所有教师
export async function getAllTeachers(env: Env) {
  const result = await env.DB.prepare(`
    SELECT t.*, u.name, u.email
    FROM teachers t
    JOIN users u ON t.user_id = u.id
    ORDER BY u.name
  `).all();
  return result.results;
}

// 获取所有班级
export async function getAllClasses(env: Env) {
  const result = await env.DB.prepare(`
    SELECT * FROM classes ORDER BY grade, class_number
  `).all();
  return result.results;
}

// 获取所有教室
export async function getAllClassrooms(env: Env) {
  const result = await env.DB.prepare(`
    SELECT * FROM classrooms ORDER BY building, room_number
  `).all();
  return result.results;
}

// 创建课程
export async function createCourse(env: Env, name: string, code: string, credits: number, hasMidtermExam: boolean) {
  // 检查课程代码是否已存在
  const existing = await env.DB.prepare(`
    SELECT id FROM courses WHERE code = ?
  `).bind(code).first();
  
  if (existing) {
    throw new Error('Course code already exists');
  }
  
  const result = await env.DB.prepare(`
    INSERT INTO courses (name, code, credits, has_midterm_exam)
    VALUES (?, ?, ?, ?)
  `).bind(name, code, credits, hasMidtermExam ? 1 : 0).run();
  
  return { success: true, courseId: result.meta.last_row_id };
}

// 创建教室
export async function createClassroom(env: Env, roomNumber: string, building: string, capacity: number, type: string) {
  // 检查教室编号是否已存在
  const existing = await env.DB.prepare(`
    SELECT id FROM classrooms WHERE room_number = ?
  `).bind(roomNumber).first();
  
  if (existing) {
    throw new Error('Classroom number already exists');
  }
  
  const result = await env.DB.prepare(`
    INSERT INTO classrooms (room_number, building, capacity, type)
    VALUES (?, ?, ?, ?)
  `).bind(roomNumber, building, capacity, type).run();
  
  return { success: true, classroomId: result.meta.last_row_id };
}

// 创建班级
export async function createClass(env: Env, grade: number, classNumber: number, headTeacherId?: number) {
  // 检查班级是否已存在
  const existing = await env.DB.prepare(`
    SELECT id FROM classes WHERE grade = ? AND class_number = ?
  `).bind(grade, classNumber).first();
  
  if (existing) {
    throw new Error('Class already exists');
  }
  
  const result = await env.DB.prepare(`
    INSERT INTO classes (grade, class_number, head_teacher_id)
    VALUES (?, ?, ?)
  `).bind(grade, classNumber, headTeacherId || null).run();
  
  return { success: true, classId: result.meta.last_row_id };
}
