export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  isCompleted: boolean;
  priority: TaskPriority;
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High'
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskRequest {
  title: string;
  description?: string;
  isCompleted: boolean;
  priority: TaskPriority;
  dueDate?: string;
}

export interface TaskQuery {
  search?: string;
  isCompleted?: boolean;
  priority?: TaskPriority;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  username: string;
  message: string;
}

export interface LoginResponse {
  username: string;
  message: string;
  token: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ApiError {
  message: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}
