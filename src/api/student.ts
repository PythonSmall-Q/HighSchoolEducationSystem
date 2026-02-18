import { Env, JWTPayload } from '../types';

// 获取学生的课表
export async function getStudentSchedule(env: Env, user: JWTPayload, semesterId?: number) {
  const query = `
    SELECT 
      s.id, s.day_of_week, s.period_start, s.period_end,
      s.is_substitute, s.substitute_note, s.is_rescheduled, s.reschedule_note,
      c.name as course_name, c.code as course_code,
      cr.room_number, cr.building,
      u.name as teacher_name
    FROM schedules s
    JOIN courses c ON s.course_id = c.id
    JOIN classrooms cr ON s.classroom_id = cr.id
    JOIN teachers t ON s.teacher_id = t.id
    JOIN users u ON t.user_id = u.id
    JOIN students st ON s.class_id = st.class_id
    WHERE st.user_id = ?
    ${semesterId ? 'AND s.semester_id = ?' : 'AND s.semester_id = (SELECT id FROM semesters WHERE is_current = 1)'}
    ORDER BY s.day_of_week, s.period_start
  `;
  
  const params = semesterId ? [user.userId, semesterId] : [user.userId];
  const result = await env.DB.prepare(query).bind(...params).all();
  return result.results;
}

// 获取学生成绩
export async function getStudentGrades(env: Env, user: JWTPayload, semesterId?: number) {
  const query = `
    SELECT 
      g.id, g.regular_score, g.midterm_score, g.final_score, g.total_score, g.needs_makeup,
      c.name as course_name, c.code as course_code,
      sem.name as semester_name,
      u.name as teacher_name
    FROM grades g
    JOIN courses c ON g.course_id = c.id
    JOIN semesters sem ON g.semester_id = sem.id
    JOIN teachers t ON g.teacher_id = t.id
    JOIN users u ON t.user_id = u.id
    WHERE g.student_id = (SELECT id FROM students WHERE user_id = ?)
    ${semesterId ? 'AND g.semester_id = ?' : ''}
    ORDER BY sem.start_date DESC, c.name
  `;
  
  const params = semesterId ? [user.userId, semesterId] : [user.userId];
  const result = await env.DB.prepare(query).bind(...params).all();
  return result.results;
}

// 获取年级排名
export async function getStudentRanking(env: Env, user: JWTPayload, semesterId: number) {
  // 获取学生所在年级
  const studentInfo = await env.DB.prepare(`
    SELECT s.grade, s.id as student_id
    FROM students s
    WHERE s.user_id = ?
  `).bind(user.userId).first();
  
  if (!studentInfo) {
    throw new Error('Student not found');
  }
  
  // 计算该年级所有学生的总成绩和排名
  const query = `
    SELECT 
      s.id,
      u.name,
      COALESCE(AVG(g.total_score), 0) as avg_score,
      COUNT(DISTINCT g.course_id) as course_count
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN grades g ON s.id = g.student_id AND g.semester_id = ?
    WHERE s.grade = ?
    GROUP BY s.id, u.name
    ORDER BY avg_score DESC
  `;
  
  const result = await env.DB.prepare(query).bind(semesterId, studentInfo.grade).all();
  const rankings = result.results;
  
  // 找到当前学生的排名
  const studentRank = rankings.findIndex((r: any) => r.id === studentInfo.student_id) + 1;
  const totalStudents = rankings.length;
  const percentile = ((totalStudents - studentRank) / totalStudents * 100).toFixed(2);
  const avgScore = Number(rankings.find((r: any) => r.id === studentInfo.student_id)?.avg_score || 0);
  
  // 检查是否需要补考：总分<60且年级后5%
  const percentileNum = Number(percentile);
  const isBottom5Percent = percentileNum <= 5;
  const requiresMakeup = avgScore < 60 && isBottom5Percent;
  
  return {
    rank: studentRank,
    totalStudents,
    percentile: parseFloat(percentile),
    avgScore,
    requiresMakeup,
    isBottom5Percent
  };
}

// 获取成绩趋势（多个学期）
export async function getGradeTrend(env: Env, user: JWTPayload) {
  const query = `
    SELECT 
      sem.name as semester_name,
      sem.start_date,
      c.name as course_name,
      g.total_score
    FROM grades g
    JOIN courses c ON g.course_id = c.id
    JOIN semesters sem ON g.semester_id = sem.id
    WHERE g.student_id = (SELECT id FROM students WHERE user_id = ?)
    ORDER BY sem.start_date, c.name
  `;
  
  const result = await env.DB.prepare(query).bind(user.userId).all();
  return result.results;
}

// 获取评教题目
export async function getEvaluationQuestions(env: Env) {
  const query = `
    SELECT id, question_text, question_type, order_number
    FROM evaluation_questions
    WHERE is_active = 1
    ORDER BY order_number
  `;
  
  const result = await env.DB.prepare(query).all();
  return result.results;
}

// 提交评教
export async function submitEvaluation(env: Env, user: JWTPayload, data: any) {
  const { teacherId, courseId, semesterId, answers } = data;
  
  // 检查评教期是否开放
  const periodCheck = await env.DB.prepare(`
    SELECT id FROM evaluation_periods
    WHERE semester_id = ?
    AND is_active = 1
    AND datetime('now') BETWEEN start_date AND end_date
  `).bind(semesterId).first();
  
  if (!periodCheck) {
    throw new Error('Evaluation period is not active');
  }
  
  // 检查是否已经评教过
  const existingEval = await env.DB.prepare(`
    SELECT id FROM evaluations
    WHERE student_id = (SELECT id FROM students WHERE user_id = ?)
    AND teacher_id = ?
    AND course_id = ?
    AND semester_id = ?
    LIMIT 1
  `).bind(user.userId, teacherId, courseId, semesterId).first();
  
  if (existingEval) {
    throw new Error('Already submitted evaluation for this course');
  }
  
  // 插入评教结果
  const studentIdRecord = await env.DB.prepare(`SELECT id FROM students WHERE user_id = ?`).bind(user.userId).first();
  
  if (!studentIdRecord) {
    throw new Error('Student not found');
  }

  for (const answer of answers) {
    await env.DB.prepare(`
      INSERT INTO evaluations (student_id, teacher_id, course_id, semester_id, question_id, rating_score, text_answer)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      studentIdRecord.id,
      teacherId,
      courseId,
      semesterId,
      answer.questionId,
      answer.ratingScore || null,
      answer.textAnswer || null
    ).run();
  }
  
  return { success: true };
}

// 获取学生需要评教的课程列表
export async function getCoursesForEvaluation(env: Env, user: JWTPayload, semesterId: number) {
  const query = `
    SELECT DISTINCT
      c.id as course_id,
      c.name as course_name,
      t.id as teacher_id,
      u.name as teacher_name,
      CASE 
        WHEN EXISTS(
          SELECT 1 FROM evaluations e2 
          WHERE e2.student_id = st.id 
          AND e2.teacher_id = t.id 
          AND e2.course_id = c.id 
          AND e2.semester_id = s.semester_id
          LIMIT 1
        ) THEN 1 
        ELSE 0 
      END as is_evaluated
    FROM schedules s
    JOIN courses c ON s.course_id = c.id
    JOIN teachers t ON s.teacher_id = t.id
    JOIN users u ON t.user_id = u.id
    JOIN students st ON s.class_id = st.class_id
    WHERE st.user_id = ?
    AND s.semester_id = ?
    ORDER BY c.name, u.name
  `;
  
  const result = await env.DB.prepare(query).bind(user.userId, semesterId).all();
  return result.results;
}
