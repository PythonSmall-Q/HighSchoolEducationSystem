// 类型定义
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export interface User {
  id: number;
  username: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  exp?: number;
}
