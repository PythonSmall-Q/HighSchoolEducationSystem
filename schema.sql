-- 高中教育管理系统数据库 Schema

-- 用户表（包括学生、教师、管理员）
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')),
    name TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 学生信息表
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    student_number TEXT UNIQUE NOT NULL,
    class_id INTEGER NOT NULL,
    grade INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- 教师信息表
CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    teacher_number TEXT UNIQUE NOT NULL,
    department TEXT,
    title TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 班级表
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade INTEGER NOT NULL,
    class_number INTEGER NOT NULL,
    headteacher_id INTEGER,
    FOREIGN KEY (headteacher_id) REFERENCES teachers(id)
);

-- 课程表
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    department TEXT,
    credits INTEGER DEFAULT 0,
    description TEXT
);

-- 教室表
CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT UNIQUE NOT NULL,
    building TEXT,
    capacity INTEGER,
    type TEXT
);

-- 学期表
CREATE TABLE IF NOT EXISTS semesters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT 0
);

-- 课程安排表（课表）
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    classroom_id INTEGER NOT NULL,
    semester_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    is_substitute BOOLEAN DEFAULT 0,
    substitute_note TEXT,
    is_rescheduled BOOLEAN DEFAULT 0,
    reschedule_note TEXT,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

-- 成绩表
CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    semester_id INTEGER NOT NULL,
    regular_score REAL,
    midterm_score REAL,
    final_score REAL,
    total_score REAL,
    needs_makeup BOOLEAN DEFAULT 0,
    teacher_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 评教题目表
CREATE TABLE IF NOT EXISTS evaluation_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('rating', 'text')),
    order_number INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 评教期配置表
CREATE TABLE IF NOT EXISTS evaluation_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT 0,
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

-- 评教结果表
CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    semester_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    rating_score INTEGER,
    text_answer TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id),
    FOREIGN KEY (question_id) REFERENCES evaluation_questions(id)
);

-- 调课申请表
CREATE TABLE IF NOT EXISTS reschedule_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK(request_type IN ('temporary', 'permanent')),
    original_date DATE,
    new_date DATE,
    new_day_of_week INTEGER,
    new_period_start INTEGER,
    new_period_end INTEGER,
    new_classroom_id INTEGER,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (new_classroom_id) REFERENCES classrooms(id)
);

-- 代课申请表
CREATE TABLE IF NOT EXISTS substitute_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    original_teacher_id INTEGER NOT NULL,
    substitute_teacher_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    substitute_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (original_teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (substitute_teacher_id) REFERENCES teachers(id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_id ON schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_semester_id ON schedules(semester_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_semester_id ON grades(semester_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_teacher_id ON evaluations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_semester_id ON evaluations(semester_id);

-- 插入示例数据
-- 默认管理员账户 (密码: admin123)
INSERT OR IGNORE INTO users (id, username, password_hash, role, name, email) VALUES 
(1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', '系统管理员', 'admin@school.com');

-- 示例学期
INSERT OR IGNORE INTO semesters (id, name, start_date, end_date, is_current) VALUES 
(1, '2025-2026学年第二学期', '2026-02-01', '2026-07-15', 1);

-- 示例评教题目
INSERT OR IGNORE INTO evaluation_questions (question_text, question_type, order_number) VALUES 
('教师授课内容清晰易懂', 'rating', 1),
('教师能够调动课堂气氛', 'rating', 2),
('教师对学生认真负责', 'rating', 3),
('教师布置的作业量合理', 'rating', 4),
('您对该教师的其他意见和建议', 'text', 5);
