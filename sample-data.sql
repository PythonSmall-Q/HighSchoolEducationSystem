-- 示例数据填充脚本
-- 用于测试和演示系统功能

-- 1. 创建班级
INSERT OR IGNORE INTO classes (id, name, grade, class_number) VALUES 
(1, '高一(1)班', 10, 1),
(2, '高一(2)班', 10, 2),
(3, '高二(1)班', 11, 1),
(4, '高二(2)班', 11, 2),
(5, '高三(1)班', 12, 1);

-- 2. 创建教师账号（密码都是 teacher123）
INSERT OR IGNORE INTO users (id, username, password_hash, role, name, email) VALUES 
(2, 'teacher_zhang', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher', '张老师', 'zhang@school.com'),
(3, 'teacher_li', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher', '李老师', 'li@school.com'),
(4, 'teacher_wang', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher', '王老师', 'wang@school.com'),
(5, 'teacher_zhao', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher', '赵老师', 'zhao@school.com');

INSERT OR IGNORE INTO teachers (user_id, teacher_number, department, title) VALUES 
(2, 'T001', '数学组', '高级教师'),
(3, 'T002', '语文组', '一级教师'),
(4, 'T003', '英语组', '高级教师'),
(5, 'T004', '物理组', '一级教师');

-- 3. 创建学生账号（密码都是 student123）
INSERT OR IGNORE INTO users (id, username, password_hash, role, name, email) VALUES 
(6, 'student_001', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', '张三', 'zhangsan@school.com'),
(7, 'student_002', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', '李四', 'lisi@school.com'),
(8, 'student_003', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', '王五', 'wangwu@school.com'),
(9, 'student_004', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', '赵六', 'zhaoliu@school.com'),
(10, 'student_005', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', '孙七', 'sunqi@school.com');

INSERT OR IGNORE INTO students (user_id, student_number, class_id, grade) VALUES 
(6, '2024001', 1, 10),
(7, '2024002', 1, 10),
(8, '2024003', 2, 10),
(9, '2024004', 2, 10),
(10, '2024005', 3, 11);

-- 4. 创建课程
INSERT OR IGNORE INTO courses (id, name, code, department, credits) VALUES 
(1, '数学', 'MATH101', '数学组', 5),
(2, '语文', 'CHIN101', '语文组', 5),
(3, '英语', 'ENG101', '英语组', 4),
(4, '物理', 'PHY101', '物理组', 4),
(5, '化学', 'CHEM101', '化学组', 4),
(6, '生物', 'BIO101', '生物组', 3);

-- 5. 创建教室
INSERT OR IGNORE INTO classrooms (id, room_number, building, capacity, type) VALUES 
(1, '101', '教学楼A', 50, '普通教室'),
(2, '102', '教学楼A', 50, '普通教室'),
(3, '103', '教学楼A', 50, '普通教室'),
(4, '201', '教学楼A', 50, '普通教室'),
(5, '301', '实验楼', 40, '物理实验室'),
(6, '302', '实验楼', 40, '化学实验室');

-- 6. 创建课表（示例：高一(1)班的一周课程）
-- 周一
INSERT OR IGNORE INTO schedules (course_id, teacher_id, class_id, classroom_id, semester_id, day_of_week, period_start, period_end) VALUES 
(1, 1, 1, 1, 1, 1, 1, 2),  -- 数学 1-2节
(2, 2, 1, 1, 1, 1, 3, 4),  -- 语文 3-4节
(3, 3, 1, 1, 1, 1, 5, 6),  -- 英语 5-6节
(4, 4, 1, 5, 1, 1, 7, 8);  -- 物理 7-8节

-- 周二
INSERT OR IGNORE INTO schedules (course_id, teacher_id, class_id, classroom_id, semester_id, day_of_week, period_start, period_end) VALUES 
(2, 2, 1, 1, 1, 2, 1, 2),  -- 语文
(1, 1, 1, 1, 1, 2, 3, 4),  -- 数学
(5, 4, 1, 6, 1, 2, 5, 6),  -- 化学
(3, 3, 1, 1, 1, 2, 7, 8);  -- 英语

-- 周三
INSERT OR IGNORE INTO schedules (course_id, teacher_id, class_id, classroom_id, semester_id, day_of_week, period_start, period_end) VALUES 
(3, 3, 1, 1, 1, 3, 1, 2),  -- 英语
(4, 4, 1, 5, 1, 3, 3, 4),  -- 物理
(1, 1, 1, 1, 1, 3, 5, 6),  -- 数学
(2, 2, 1, 1, 1, 3, 7, 8);  -- 语文

-- 周四
INSERT OR IGNORE INTO schedules (course_id, teacher_id, class_id, classroom_id, semester_id, day_of_week, period_start, period_end) VALUES 
(1, 1, 1, 1, 1, 4, 1, 2),  -- 数学
(3, 3, 1, 1, 1, 4, 3, 4),  -- 英语
(6, 4, 1, 1, 1, 4, 5, 6),  -- 生物
(2, 2, 1, 1, 1, 4, 7, 8);  -- 语文

-- 周五
INSERT OR IGNORE INTO schedules (course_id, teacher_id, class_id, classroom_id, semester_id, day_of_week, period_start, period_end) VALUES 
(2, 2, 1, 1, 1, 5, 1, 2),  -- 语文
(1, 1, 1, 1, 1, 5, 3, 4),  -- 数学
(3, 3, 1, 1, 1, 5, 5, 6),  -- 英语
(4, 4, 1, 5, 1, 5, 7, 8);  -- 物理

-- 7. 创建成绩数据
INSERT OR IGNORE INTO grades (student_id, course_id, semester_id, teacher_id, regular_score, midterm_score, final_score, total_score, needs_makeup) VALUES 
-- 张三的成绩
(1, 1, 1, 1, 85.0, 88.0, 90.0, 88.1, 0),  -- 数学
(1, 2, 1, 2, 78.0, 82.0, 85.0, 82.3, 0),  -- 语文
(1, 3, 1, 3, 92.0, 90.0, 95.0, 92.5, 0),  -- 英语
(1, 4, 1, 4, 75.0, 78.0, 80.0, 78.1, 0),  -- 物理

-- 李四的成绩
(2, 1, 1, 1, 65.0, 68.0, 70.0, 68.1, 0),  -- 数学
(2, 2, 1, 2, 88.0, 85.0, 90.0, 87.7, 0),  -- 语文
(2, 3, 1, 3, 82.0, 85.0, 88.0, 85.4, 0),  -- 英语
(2, 4, 1, 4, 55.0, 58.0, 60.0, 58.1, 1);  -- 物理（需补考）

-- 8. 创建评教期
INSERT OR IGNORE INTO evaluation_periods (semester_id, start_date, end_date, is_active) VALUES 
(1, '2026-06-01 00:00:00', '2026-06-30 23:59:59', 1);

-- 查询验证数据
SELECT '=== 用户统计 ===' as info;
SELECT role, COUNT(*) as count FROM users GROUP BY role;

SELECT '=== 班级统计 ===' as info;
SELECT COUNT(*) as count FROM classes;

SELECT '=== 课程统计 ===' as info;
SELECT COUNT(*) as count FROM courses;

SELECT '=== 课表统计 ===' as info;
SELECT COUNT(*) as count FROM schedules;

SELECT '=== 成绩统计 ===' as info;
SELECT COUNT(*) as count FROM grades;

SELECT '测试账号：' as info;
SELECT '管理员: admin / admin123' as account
UNION ALL SELECT '教师: teacher_zhang / teacher123'
UNION ALL SELECT '学生: student_001 / student123';
