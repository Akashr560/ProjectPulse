/**
 * PROJECTPULSE Data Foundation Models
 * Persistent entity definitions according to STEP 1 specifications
 */

export type ProjectStatus = 'Planning' | 'In Progress' | 'Completed' | 'Archived';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'To Do' | 'In Progress' | 'Completed';

export interface User {
  username: string;
  email: string;
  password: string;
}

export interface Project {
  id: string;
  owner: string; // references User.username
  title: string;
  description: string;
  start_date: string;
  deadline: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string; // references Project.id
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  created_at: string;
  updated_at: string;
}
