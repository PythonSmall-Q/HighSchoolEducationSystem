import { Env, JWTPayload } from '../types';

// 获取教师的课表
export async function getTeacherSchedule(env: Env, user: JWTPayload, semesterId?: number) {
  const query = `
    SELECT 
      s.id, s.day_of_week, s.period_start, s.period_end,
      s.is_substitute, s.substitute_note, s.is_rescheduled, s.reschedule_note,
      c.name as course_name, c.code as course_code,
      cr.room_number, cr.building,
      cl.name as class_name, cl.grade
    FROM schedules s
    JOIN courses c ON s.course_id = c.id
    JOIN classrooms cr ON s.classroom_id = cr.id
    JOIN classes cl ON s.class_id = cl.id
    JOIN teachers t ON s.teacher_id = t.id
    WHERE t.user_id = ?
    ${semesterId ? 'AND s.semester_id = ?' : 'AND s.semester_id = (SELECT id FROM semesters WHERE is_current = 1)'}
    ORDER BY s.day_of_week, s.period_start
  `;
  
  const params = semesterId ? [user.userId, semesterId] : [user.userId];
  const result = await env.DB.prepare(query).bind(...params).all();
  return result.results;
}

// 获取班级学生名单
export async function getClassStudents(env: Env, user: JWTPayload, classId: number) {
  // 验证教师是否教授该班级
  const teacherCheck = await env.DB.prepare(`
    SELECT s.id FROM schedules s
    JOIN teachers t ON s.teacher_id = t.id
    WHERE t.user_id = ?
    AND s.class_id = ?
    AND s.semester_id = (SELECT id FROM semesters WHERE is_current = 1)
    LIMIT 1
  `).bind(user.userId, classId).first();
  
  if (!teacherCheck) {
    throw new Error('Unauthorized: You do not teach this class');
  }
  
  const query = `
    SELECT 
      s.id, s.student_number,
      u.name, u.email,
      c.name as class_name, c.grade
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN classes c ON s.class_id = c.id
    WHERE s.class_id = ?
    ORDER BY s.student_number
  `;
  
  const result = await env.DB.prepare(query).bind(classId).all();
  return result.results;
}

// 上传/更新成绩
export async function uploadGrades(env: Env, user: JWTPayload, data: any) {
  const { courseId, semesterId, grades } = data;
  
  // 验证教师是否教授该课程
  const teacherId = await env.DB.prepare(`
    SELECT id FROM teachers WHERE user_id = ?
  `).bind(user.userId).first();
  
  if (!teacherId) {
    throw new Error('Teacher not found');
  }
  
  const courseCheck = await env.DB.prepare(`
    SELECT id FROM schedules
    WHERE teacher_id = ? AND course_id = ? AND semester_id = ?
    LIMIT 1
  `).bind(teacherId.id, courseId, semesterId).first();
  
  if (!courseCheck) {
    throw new Error('Unauthorized: You do not teach this course');
  }
  
  // 获取课程信息，检查是否有期中考试
  const course = await env.DB.prepare(`
    SELECT has_midterm_exam FROM courses WHERE id = ?
  `).bind(courseId).first();
  
  const hasMidterm = course?.has_midterm_exam === 1;
  
  // 批量插入或更新成绩
  for (const grade of grades) {
    const { studentId, regularScore, midtermScore, finalScore } = grade;
    
    // 计算总分（根据是否有期中考试调整权重）
    let totalScore;
    if (hasMidterm) {
      // 有期中：平时30% + 期中30% + 期末40%
      totalScore = (regularScore * 0.3) + (midtermScore * 0.3) + (finalScore * 0.4);
    } else {
      // 无期中：平时40% + 期末60%
      totalScore = (regularScore * 0.4) + (finalScore * 0.6);
    }
    
    const needsMakeup = totalScore < 60;
    
    // 检查是否已存在记录
    const existing = await env.DB.prepare(`
      SELECT id FROM grades
      WHERE student_id = ? AND course_id = ? AND semester_id = ?
    `).bind(studentId, courseId, semesterId).first();
    
    if (existing) {
      // 更新
      await env.DB.prepare(`
        UPDATE grades
        SET regular_score = ?, midterm_score = ?, final_score = ?, 
            total_score = ?, needs_makeup = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(regularScore, hasMidterm ? midtermScore : null, finalScore, totalScore, needsMakeup ? 1 : 0, existing.id).run();
    } else {
      // 插入
      await env.DB.prepare(`
        INSERT INTO grades (student_id, course_id, semester_id, teacher_id, 
                           regular_score, midterm_score, final_score, total_score, needs_makeup)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(studentId, courseId, semesterId, teacherId.id, 
              regularScore, hasMidterm ? midtermScore : null, finalScore, totalScore, needsMakeup ? 1 : 0).run();
    }
  }
  
  return { success: true, gradesUploaded: grades.length };
}

// 查看评教结果汇总
export async function getEvaluationResults(env: Env, user: JWTPayload, courseId: number, semesterId: number) {
  const teacherId = await env.DB.prepare(`
    SELECT id FROM teachers WHERE user_id = ?
  `).bind(user.userId).first();
  
  if (!teacherId) {
    throw new Error('Teacher not found');
  }
  
  const query = `
    SELECT 
      eq.question_text,
      eq.question_type,
      CASE 
        WHEN eq.question_type = 'rating' THEN AVG(e.rating_score)
        ELSE NULL
      END as avg_rating,
      COUNT(e.id) as response_count
    FROM evaluation_questions eq
    LEFT JOIN evaluations e ON eq.id = e.question_id
      AND e.teacher_id = ?
      AND e.course_id = ?
      AND e.semester_id = ?
    WHERE eq.is_active = 1
    GROUP BY eq.id, eq.question_text, eq.question_type, eq.order_number
    ORDER BY eq.order_number
  `;
  
  const result = await env.DB.prepare(query).bind(teacherId.id, courseId, semesterId).all();
  return result.results;
}

// 提交调课申请
export async function submitRescheduleRequest(env: Env, user: JWTPayload, data: any) {
  const { scheduleId, reason, requestType, originalDate, newDate, newDayOfWeek, newPeriodStart, newPeriodEnd, newClassroomId } = data;
  
  const teacherId = await env.DB.prepare(`
    SELECT id FROM teachers WHERE user_id = ?
  `).bind(user.userId).first();
  
  if (!teacherId) {
    throw new Error('Teacher not found');
  }
  
  // 验证该课表是否属于该教师
  const scheduleCheck = await env.DB.prepare(`
    SELECT id FROM schedules WHERE id = ? AND teacher_id = ?
  `).bind(scheduleId, teacherId.id).first();
  
  if (!scheduleCheck) {
    throw new Error('Unauthorized: This schedule does not belong to you');
  }
  
  const result = await env.DB.prepare(`
    INSERT INTO reschedule_requests 
    (schedule_id, teacher_id, reason, request_type, original_date, new_date, 
     new_day_of_week, new_period_start, new_period_end, new_classroom_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    scheduleId, teacherId.id, reason, requestType, originalDate, newDate,
    newDayOfWeek, newPeriodStart, newPeriodEnd, newClassroomId
  ).run();
  
  return { success: true, requestId: result.meta.last_row_id };
}

// 提交代课申请
export async function submitSubstituteRequest(env: Env, user: JWTPayload, data: any) {
  const { scheduleId, substituteTeacherId, reason, substituteDate } = data;
  
  const teacherId = await env.DB.prepare(`
    SELECT id FROM teachers WHERE user_id = ?
  `).bind(user.userId).first();
  
  if (!teacherId) {
    throw new Error('Teacher not found');
  }
  
  // 验证该课表是否属于该教师
  const scheduleCheck = await env.DB.prepare(`
    SELECT id FROM schedules WHERE id = ? AND teacher_id = ?
  `).bind(scheduleId, teacherId.id).first();
  
  if (!scheduleCheck) {
    throw new Error('Unauthorized: This schedule does not belong to you');
  }
  
  const result = await env.DB.prepare(`
    INSERT INTO substitute_requests 
    (schedule_id, original_teacher_id, substitute_teacher_id, reason, substitute_date)
    VALUES (?, ?, ?, ?, ?)
  `).bind(scheduleId, teacherId.id, substituteTeacherId, reason, substituteDate).run();
  
  return { success: true, requestId: result.meta.last_row_id };
}

// 获取教师的调课/代课申请列表
export async function getTeacherRequests(env: Env, user: JWTPayload) {
  const teacherId = await env.DB.prepare(`
    SELECT id FROM teachers WHERE user_id = ?
  `).bind(user.userId).first();
  
  if (!teacherId) {
    throw new Error('Teacher not found');
  }
  
  const rescheduleRequests = await env.DB.prepare(`
    SELECT 
      rr.id, rr.reason, rr.request_type, rr.status, rr.admin_note,
      rr.created_at, rr.reviewed_at,
      c.name as course_name,
      cl.name as class_name
    FROM reschedule_requests rr
    JOIN schedules s ON rr.schedule_id = s.id
    JOIN courses c ON s.course_id = c.id
    JOIN classes cl ON s.class_id = cl.id
    WHERE rr.teacher_id = ?
    ORDER BY rr.created_at DESC
  `).bind(teacherId.id).all();
  
  const substituteRequests = await env.DB.prepare(`
    SELECT 
      sr.id, sr.reason, sr.substitute_date, sr.status, sr.admin_note,
      sr.created_at, sr.reviewed_at,
      c.name as course_name,
      cl.name as class_name,
      u.name as substitute_teacher_name
    FROM substitute_requests sr
    JOIN schedules s ON sr.schedule_id = s.id
    JOIN courses c ON s.course_id = c.id
    JOIN classes cl ON s.class_id = cl.id
    JOIN teachers t ON sr.substitute_teacher_id = t.id
    JOIN users u ON t.user_id = u.id
    WHERE sr.original_teacher_id = ?
    ORDER BY sr.created_at DESC
  `).bind(teacherId.id).all();
  
  return {
    rescheduleRequests: rescheduleRequests.results,
    substituteRequests: substituteRequests.results
  };
}

// 获取需要补考的学生列表
export async function getStudentsNeedingMakeup(env: Env, user: JWTPayload, courseId: number, semesterId: number) {
  const teacherId = await env.DB.prepare(`
    SELECT id FROM teachers WHERE user_id = ?
  `).bind(user.userId).first();
  
  if (!teacherId) {
    throw new Error('Teacher not found');
  }
  
  const query = `
    SELECT 
      g.id as grade_id,
      g.total_score,
      g.needs_makeup,
      g.makeup_approved,
      g.makeup_score,
      g.makeup_passed,
      g.makeup_approved_final,
      u.name as student_name,
      st.student_number,
      cl.name as class_name
    FROM grades g
    JOIN students st ON g.student_id = st.id
    JOIN users u ON st.user_id = u.id
    JOIN classes cl ON st.class_id = cl.id
    WHERE g.course_id = ?
    AND g.semester_id = ?
    AND g.teacher_id = ?
    AND g.needs_makeup = 1
    ORDER BY cl.name, st.student_number
  `;
  
  const result = await env.DB.prepare(query).bind(courseId, semesterId, teacherId.id).all();
  return result.results;
}

// 上传补考成绩
export async function uploadMakeupScores(env: Env, user: JWTPayload, data: any) {
  const { gradeId, makeupScore, makeupPassed } = data;
  
  const teacherId = await env.DB.prepare(`
    SELECT id FROM teachers WHERE user_id = ?
  `).bind(user.userId).first();
  
  if (!teacherId) {
    throw new Error('Teacher not found');
  }
  
  // 验证该成绩记录属于该教师且已批准补考
  const grade = await env.DB.prepare(`
    SELECT id, makeup_approved FROM grades
    WHERE id = ? AND teacher_id = ? AND makeup_approved = 1
  `).bind(gradeId, teacherId.id).first();
  
  if (!grade) {
    throw new Error('Unauthorized or makeup not approved');
  }
  
  // 更新补考成绩
  await env.DB.prepare(`
    UPDATE grades
    SET makeup_score = ?, makeup_passed = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(makeupScore, makeupPassed ? 1 : 0, gradeId).run();
  
  return { success: true };
}
