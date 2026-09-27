/**
 * PROJECTPULSE Persistent Storage Service
 * Provides complete data persistence in browser localStorage with relational integrity
 */

import { User, Project, Task } from '../models/types';

const STORAGE_KEYS = {
  USERS: 'projectpulse_users',
  CURRENT_USER: 'projectpulse_current_user',
  PROJECTS: 'projectpulse_projects',
  TASKS: 'projectpulse_tasks',
};

// Seed user for initial onboarding if no users exist
const INITIAL_USERS: User[] = [
  {
    username: 'alex_morgan',
    email: 'alex.morgan@university.edu',
    password: 'password123',
  },
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    owner: 'alex_morgan',
    title: 'CS402 Operating Systems Simulator',
    description: 'Design and implement a multi-level feedback queue CPU scheduler and memory management simulator in C/C++.',
    start_date: '2026-09-01',
    deadline: '2026-10-18',
    status: 'In Progress',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'p2',
    owner: 'alex_morgan',
    title: 'Web Application Portfolio Capstone',
    description: 'Final year capstone engineering project building a full-stack project and task tracker for university students.',
    start_date: '2026-09-10',
    deadline: '2026-11-20',
    status: 'In Progress',
    created_at: '2026-09-10T14:30:00Z',
    updated_at: '2026-09-10T14:30:00Z',
  },
  {
    id: 'p3',
    owner: 'alex_morgan',
    title: 'Machine Learning Lab 3: Sentiment Analysis',
    description: 'Fine-tuning transformer models on student peer review datasets using PyTorch and Scikit-Learn.',
    start_date: '2026-08-15',
    deadline: '2026-09-20',
    status: 'Completed',
    created_at: '2026-08-15T09:15:00Z',
    updated_at: '2026-08-15T09:15:00Z',
  },
];

const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    project_id: 'p1',
    title: 'Implement Round Robin algorithm with time slices',
    description: 'POSIX compliant timer loop handling context switches and CPU bursts.',
    priority: 'High',
    status: 'Completed',
    deadline: '2026-09-22',
    created_at: '2026-09-02T11:00:00Z',
    updated_at: '2026-09-22T17:00:00Z',
  },
  {
    id: 't2',
    project_id: 'p1',
    title: 'Add Virtual Memory Page Replacement (LRU)',
    description: 'Build inverted page table data structure with translation lookaside buffer (TLB).',
    priority: 'High',
    status: 'In Progress',
    deadline: '2026-10-12',
    created_at: '2026-09-03T08:00:00Z',
    updated_at: '2026-09-03T08:00:00Z',
  },
  {
    id: 't3',
    project_id: 'p1',
    title: 'Write benchmark report and testing documentation',
    description: 'Compare scheduler turnaround times across 5 simulated workloads.',
    priority: 'Medium',
    status: 'To Do',
    deadline: '2026-10-17',
    created_at: '2026-09-03T08:30:00Z',
    updated_at: '2026-09-03T08:30:00Z',
  },
  {
    id: 't4',
    project_id: 'p2',
    title: 'Design relational database schema & entity relations',
    description: 'Define models with user foreign keys, cascade deletes, and constraints.',
    priority: 'High',
    status: 'Completed',
    deadline: '2026-09-18',
    created_at: '2026-09-11T16:00:00Z',
    updated_at: '2026-09-18T12:00:00Z',
  },
  {
    id: 't5',
    project_id: 'p2',
    title: 'Implement user authentication & session management',
    description: 'Secure registration, login validation, and user profile management.',
    priority: 'High',
    status: 'Completed',
    deadline: '2026-09-24',
    created_at: '2026-09-12T10:00:00Z',
    updated_at: '2026-09-24T18:00:00Z',
  },
  {
    id: 't6',
    project_id: 'p2',
    title: 'Implement Project and Task CRUD views with validation',
    description: 'Ensure student data isolation and strict input checks.',
    priority: 'Medium',
    status: 'In Progress',
    deadline: '2026-10-05',
    created_at: '2026-09-14T09:00:00Z',
    updated_at: '2026-09-14T09:00:00Z',
  },
  {
    id: 't7',
    project_id: 'p2',
    title: 'Conduct cross-browser usability and responsive testing',
    description: 'Verify behavior on desktop, tablet, and mobile viewport widths.',
    priority: 'Low',
    status: 'To Do',
    deadline: '2026-10-25',
    created_at: '2026-09-15T11:00:00Z',
    updated_at: '2026-09-15T11:00:00Z',
  },
  {
    id: 't8',
    project_id: 'p3',
    title: 'Prepare tokenized training & validation splits',
    description: 'Remove outliers, clean punctuation, and balance classes.',
    priority: 'Medium',
    status: 'Completed',
    deadline: '2026-08-25',
    created_at: '2026-08-16T12:00:00Z',
    updated_at: '2026-08-25T14:00:00Z',
  },
  {
    id: 't9',
    project_id: 'p3',
    title: 'Submit Jupyter Notebook and confusion matrix to portal',
    description: 'Upload final deliverables to professor grading portal.',
    priority: 'High',
    status: 'Completed',
    deadline: '2026-09-20',
    created_at: '2026-08-20T14:00:00Z',
    updated_at: '2026-09-20T16:00:00Z',
  },
];

// ----------------------------------------------------------------------------
// User & Auth Storage
// ----------------------------------------------------------------------------

export function getUsers(): User[] {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return INITIAL_USERS;
    return parsed
      .filter((u): u is User => Boolean(u && typeof u === 'object'))
      .map((u) => ({
        username: u.username || '',
        email: u.email || '',
        password: u.password || '',
      }));
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!data) {
    return null;
  }
  try {
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object' || !parsed.username) {
      return null;
    }
    return {
      username: parsed.username || '',
      email: parsed.email || '',
      password: parsed.password || '',
    };
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function registerUser(user: User): { success: boolean; error?: string } {
  const users = getUsers();
  const lowerUsername = (user?.username || '').trim().toLowerCase();
  const lowerEmail = (user?.email || '').trim().toLowerCase();

  if (!lowerUsername) {
    return { success: false, error: 'Username is required.' };
  }
  if (!lowerEmail) {
    return { success: false, error: 'Email is required.' };
  }
  if (!user?.password) {
    return { success: false, error: 'Password is required.' };
  }

  const usernameExists = users.some((u) => (u?.username || '').trim().toLowerCase() === lowerUsername);
  if (usernameExists) {
    return { success: false, error: 'A user with that username already exists.' };
  }

  const emailExists = users.some((u) => (u?.email || '').trim().toLowerCase() === lowerEmail);
  if (emailExists) {
    return { success: false, error: 'A user with that email already exists.' };
  }

  const cleanUser: User = {
    username: user.username.trim(),
    email: user.email.trim(),
    password: user.password,
  };

  const updatedUsers = [...users, cleanUser];
  saveUsers(updatedUsers);
  // Do NOT log in the user here; after registration the user must be redirected to Login.
  return { success: true };
}

export function loginUser(identifier: string, password: string): { success: boolean; user?: User; error?: string } {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (!cleanId) {
    return { success: false, error: 'Username or email is required.' };
  }
  if (!password) {
    return { success: false, error: 'Password is required.' };
  }

  const users = getUsers();
  const found = users.find(
    (u) =>
      u &&
      (((u.username || '').trim().toLowerCase() === cleanId) ||
       ((u.email || '').trim().toLowerCase() === cleanId)) &&
      u.password === password
  );

  if (found) {
    setCurrentUser(found);
    return { success: true, user: found };
  }

  return { success: false, error: 'Invalid username/email or password.' };
}

// ----------------------------------------------------------------------------
// Projects Storage
// ----------------------------------------------------------------------------

export function getProjects(): Project[] {
  const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
    return INITIAL_PROJECTS;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return INITIAL_PROJECTS;
    return parsed
      .filter((p): p is Project => Boolean(p && typeof p === 'object'))
      .map((p) => ({
        ...p,
        id: p.id || 'p_' + Math.random().toString(36).substring(2, 8),
        owner: p.owner || 'alex_morgan',
        title: p.title || 'Untitled Project',
        description: p.description || '',
        start_date: p.start_date || '',
        deadline: p.deadline || '',
        status: p.status || 'Planning',
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      }));
  } catch {
    return INITIAL_PROJECTS;
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function getUserProjects(username: string): Project[] {
  if (!username) return [];
  const projects = getProjects();
  const cleanUsername = username.toLowerCase();
  return projects.filter((p) => p && (p.owner || '').toLowerCase() === cleanUsername);
}

export function createProject(data: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Project {
  const now = new Date().toISOString();
  const newProject: Project = {
    id: 'p_' + Date.now() + Math.random().toString(36).substring(2, 6),
    ...data,
    created_at: now,
    updated_at: now,
  };
  const projects = getProjects();
  const updated = [newProject, ...projects];
  saveProjects(updated);
  return newProject;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const projects = getProjects();
  const now = new Date().toISOString();
  let updatedProject: Project | null = null;

  const updated = projects.map((p) => {
    if (p.id === id) {
      updatedProject = {
        ...p,
        ...updates,
        updated_at: now,
      };
      return updatedProject;
    }
    return p;
  });

  if (updatedProject) {
    saveProjects(updated);
  }
  return updatedProject;
}

export function deleteProject(id: string): void {
  const projects = getProjects();
  const updatedProjects = projects.filter((p) => p.id !== id);
  saveProjects(updatedProjects);

  // Cascade delete tasks associated with this project
  const tasks = getTasks();
  const updatedTasks = tasks.filter((t) => t.project_id !== id);
  saveTasks(updatedTasks);
}

// ----------------------------------------------------------------------------
// Tasks Storage
// ----------------------------------------------------------------------------

export function getTasks(): Task[] {
  const data = localStorage.getItem(STORAGE_KEYS.TASKS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    return INITIAL_TASKS;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return INITIAL_TASKS;
    return parsed
      .filter((t): t is Task => Boolean(t && typeof t === 'object'))
      .map((t) => ({
        ...t,
        id: t.id || 't_' + Math.random().toString(36).substring(2, 8),
        project_id: t.project_id || '',
        title: t.title || 'Untitled Task',
        description: t.description || '',
        priority: t.priority || 'Medium',
        status: t.status || 'To Do',
        deadline: t.deadline || '',
        created_at: t.created_at || new Date().toISOString(),
        updated_at: t.updated_at || new Date().toISOString(),
      }));
  } catch {
    return INITIAL_TASKS;
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

export function getProjectTasks(projectId: string): Task[] {
  const tasks = getTasks();
  return tasks.filter((t) => t.project_id === projectId);
}

export function createTask(data: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task {
  const now = new Date().toISOString();
  const newTask: Task = {
    id: 't_' + Date.now() + Math.random().toString(36).substring(2, 6),
    ...data,
    created_at: now,
    updated_at: now,
  };
  const tasks = getTasks();
  const updated = [...tasks, newTask];
  saveTasks(updated);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = getTasks();
  const now = new Date().toISOString();
  let updatedTask: Task | null = null;

  const updated = tasks.map((t) => {
    if (t.id === id) {
      updatedTask = {
        ...t,
        ...updates,
        updated_at: now,
      };
      return updatedTask;
    }
    return t;
  });

  if (updatedTask) {
    saveTasks(updated);
  }
  return updatedTask;
}

export function deleteTask(id: string): void {
  const tasks = getTasks();
  const updated = tasks.filter((t) => t.id !== id);
  saveTasks(updated);
}

// ----------------------------------------------------------------------------
// Progress Calculation Helper
// ----------------------------------------------------------------------------

export function calculateProjectProgress(projectId: string, allTasks?: Task[]): number {
  const tasksList = allTasks || getTasks();
  const projectTasks = tasksList.filter((t) => t.project_id === projectId);
  if (projectTasks.length === 0) return 0;
  const completed = projectTasks.filter((t) => t.status === 'Completed').length;
  return Math.round((completed / projectTasks.length) * 100);
}
