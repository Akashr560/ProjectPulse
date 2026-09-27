/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit3,
  User as UserIcon,
  LogOut,
  ArrowLeft,
  Check,
  ChevronRight,
  Menu,
  X,
  ListTodo,
  TrendingUp,
  LayoutDashboard,
  ShieldAlert
} from 'lucide-react';

import { User, Project, Task, ProjectStatus, TaskPriority, TaskStatus } from './models/types';
import * as storage from './services/storage';

// Helper: get today's date string in local YYYY-MM-DD
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: check if a target date is overdue (deadline < today and status != Completed)
function isDateOverdue(dateStr?: string | null, isCompleted?: boolean): boolean {
  if (!dateStr || !dateStr.trim() || isCompleted) return false;
  const today = getTodayDateString();
  return dateStr.trim() < today;
}

export default function App() {
  // --------------------------------------------------------------------------
  // Application State (Hydrated from persistent storage)
  // --------------------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getCurrentUser());
  const [projects, setProjects] = useState<Project[]>(() => storage.getProjects());
  const [tasks, setTasks] = useState<Task[]>(() => storage.getTasks());

  // Page View: 'dashboard' | 'projects' | 'project-detail' | 'profile'
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'projects' | 'project-detail' | 'profile'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('p1');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication Form State
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ProjectStatus>('All');

  // Project Modal Form State
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectFormTitle, setProjectFormTitle] = useState('');
  const [projectFormDescription, setProjectFormDescription] = useState('');
  const [projectFormStartDate, setProjectFormStartDate] = useState('');
  const [projectFormDeadline, setProjectFormDeadline] = useState('');
  const [projectFormStatus, setProjectFormStatus] = useState<ProjectStatus>('Planning');
  const [projectFormError, setProjectFormError] = useState<string | null>(null);

  // Task Modal Form State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDescription, setTaskFormDescription] = useState('');
  const [taskFormPriority, setTaskFormPriority] = useState<TaskPriority>('Medium');
  const [taskFormStatus, setTaskFormStatus] = useState<TaskStatus>('To Do');
  const [taskFormDeadline, setTaskFormDeadline] = useState('');
  const [taskFormError, setTaskFormError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'project' | 'task'; id: string; title: string } | null>(null);

  // Toast / Flash Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Synchronize Active User Session
  useEffect(() => {
    storage.setCurrentUser(currentUser);
  }, [currentUser]);

  // Greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Filter projects owned by the currently authenticated user
  const userProjects = useMemo(() => {
    if (!currentUser || !currentUser.username) return [];
    const targetUsername = currentUser.username.trim().toLowerCase();
    return projects.filter((p) => p && (p.owner || '').trim().toLowerCase() === targetUsername);
  }, [projects, currentUser]);

  // Filter tasks belonging to current user's projects
  const userTasks = useMemo(() => {
    const userProjIds = new Set(userProjects.map((p) => p.id));
    return tasks.filter((t) => t && userProjIds.has(t.project_id));
  }, [tasks, userProjects]);

  // Dynamic Statistics calculated from persistent application data
  const stats = useMemo(() => {
    const totalProjects = userProjects.length;
    const activeProjects = userProjects.filter((p) => p.status === 'In Progress').length;
    const completedProjects = userProjects.filter((p) => p.status === 'Completed').length;
    const pendingTasks = userTasks.filter((t) => t.status === 'To Do').length;
    const overdueTasks = userTasks.filter((t) => isDateOverdue(t.deadline, t.status === 'Completed')).length;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      pendingTasks,
      overdueTasks,
    };
  }, [userProjects, userTasks]);

  // Compute Project Progress Percentage
  const getProjectProgress = (projectId: string) => {
    return storage.calculateProjectProgress(projectId, tasks);
  };

  // Filtered Projects for Projects Page
  const filteredProjects = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return userProjects.filter((p) => {
      const title = (p?.title || '').toLowerCase();
      const matchesSearch = !q || title.includes(q);
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [userProjects, searchQuery, statusFilter]);

  // Currently Active Project in Details View
  const selectedProject = useMemo(() => {
    if (!currentUser || !currentUser.username) return null;
    if (!selectedProjectId) {
      return userProjects[0] || null;
    }
    // Find project across all projects to check ownership
    const found = projects.find((p) => p.id === selectedProjectId);
    if (!found) return null;
    // Enforce owner check: only the owner can access and modify it
    if ((found.owner || '').trim().toLowerCase() !== currentUser.username.trim().toLowerCase()) {
      return null;
    }
    return found;
  }, [projects, userProjects, selectedProjectId, currentUser]);

  const selectedProjectTasks = useMemo(() => {
    if (!selectedProject) return [];
    return tasks.filter((t) => t.project_id === selectedProject.id);
  }, [tasks, selectedProject]);

  // --------------------------------------------------------------------------
  // Authentication Handlers
  // --------------------------------------------------------------------------

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMessage(null);

    const cleanIdentifier = authUsername.trim();
    if (!cleanIdentifier) {
      setAuthError('Username / Email is required.');
      return;
    }
    if (!authPassword) {
      setAuthError('Password is required.');
      return;
    }

    const res = storage.loginUser(cleanIdentifier, authPassword);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      triggerToast(`Welcome back, ${res.user.username}!`);
      setCurrentPage('dashboard');
      setAuthPassword('');
      setAuthError(null);
      setAuthSuccessMessage(null);
    } else {
      setAuthError(res.error || 'Invalid username/email or password.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMessage(null);

    const cleanUsername = authUsername.trim();
    const cleanEmail = authEmail.trim();

    if (!cleanUsername) {
      setAuthError('Username is required.');
      return;
    }
    if (!cleanEmail) {
      setAuthError('Email is required.');
      return;
    }
    if (!authPassword) {
      setAuthError('Password is required.');
      return;
    }
    if (!authConfirmPassword) {
      setAuthError('Confirm Password is required.');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Password and Confirm Password must match.');
      return;
    }

    const newUser: User = {
      username: cleanUsername,
      email: cleanEmail,
      password: authPassword,
    };

    const res = storage.registerUser(newUser);
    if (res.success) {
      // 9. After successful registration, redirect the user to Login.
      // 10. Do not use fake success messages - real user account in storage.
      setAuthView('login');
      setAuthSuccessMessage(`Account created successfully for ${cleanUsername}! Please log in with your credentials.`);
      setAuthError(null);
      setAuthPassword('');
      setAuthConfirmPassword('');
      triggerToast('Registration successful! Please log in.');
    } else {
      // 8. Do not create an account if validation fails (e.g. duplicate username)
      setAuthError(res.error || 'Registration failed.');
    }
  };

  const handleLogout = () => {
    storage.setCurrentUser(null);
    setCurrentUser(null);
    setCurrentPage('dashboard');
    setAuthView('login');
    setAuthPassword('');
    setAuthSuccessMessage(null);
    setAuthError(null);
    triggerToast('You have been logged out successfully.');
  };

  // --------------------------------------------------------------------------
  // Project CRUD Handlers
  // --------------------------------------------------------------------------

  const openCreateProjectModal = () => {
    setEditingProject(null);
    setProjectFormTitle('');
    setProjectFormDescription('');
    setProjectFormStartDate(new Date().toISOString().split('T')[0]);
    setProjectFormDeadline('');
    setProjectFormStatus('Planning');
    setProjectFormError(null);
    setProjectModalOpen(true);
  };

  const openEditProjectModal = (project: Project) => {
    if (!currentUser || (project.owner || '').trim().toLowerCase() !== currentUser.username.trim().toLowerCase()) {
      triggerToast('Access denied. Only the project owner can edit this project.');
      return;
    }
    setEditingProject(project);
    setProjectFormTitle(project.title);
    setProjectFormDescription(project.description);
    setProjectFormStartDate(project.start_date || '');
    setProjectFormDeadline(project.deadline || '');
    setProjectFormStatus(project.status);
    setProjectFormError(null);
    setProjectModalOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    setProjectFormError(null);

    if (!projectFormTitle.trim()) {
      setProjectFormError('Project title is required.');
      return;
    }

    if (!projectFormDescription.trim()) {
      setProjectFormError('Description is required.');
      return;
    }

    if (!projectFormDeadline.trim()) {
      setProjectFormError('Deadline is required.');
      return;
    }

    if (projectFormStartDate && projectFormDeadline && projectFormDeadline < projectFormStartDate) {
      setProjectFormError('Target deadline cannot be earlier than the project start date.');
      return;
    }

    if (!currentUser) return;

    if (editingProject) {
      if ((editingProject.owner || '').toLowerCase() !== currentUser.username.toLowerCase()) {
        setProjectFormError('Access denied. Only the project owner can edit this project.');
        return;
      }
      const updated = storage.updateProject(editingProject.id, {
        title: projectFormTitle.trim(),
        description: projectFormDescription.trim(),
        start_date: projectFormStartDate,
        deadline: projectFormDeadline,
        status: projectFormStatus,
      });
      if (updated) {
        setProjects(storage.getProjects());
        triggerToast(`Project "${projectFormTitle}" updated successfully!`);
      }
    } else {
      const newProj = storage.createProject({
        owner: currentUser.username,
        title: projectFormTitle.trim(),
        description: projectFormDescription.trim(),
        start_date: projectFormStartDate || new Date().toISOString().split('T')[0],
        deadline: projectFormDeadline,
        status: projectFormStatus,
      });
      setProjects(storage.getProjects());
      setSelectedProjectId(newProj.id);
      setCurrentPage('project-detail');
      triggerToast(`Project "${newProj.title}" created successfully!`);
    }

    setProjectModalOpen(false);
  };

  const confirmDeleteProject = (project: Project) => {
    if (!currentUser || (project.owner || '').toLowerCase() !== currentUser.username.toLowerCase()) {
      triggerToast('Access denied. Only the project owner can delete this project.');
      return;
    }
    setItemToDelete({
      type: 'project',
      id: project.id,
      title: project.title,
    });
    setDeleteModalOpen(true);
  };

  // --------------------------------------------------------------------------
  // Task CRUD Handlers
  // --------------------------------------------------------------------------

  const openCreateTaskModal = () => {
    if (!selectedProject || !currentUser || (selectedProject.owner || '').toLowerCase() !== currentUser.username.toLowerCase()) {
      triggerToast('Access denied. Only the project owner can add tasks.');
      return;
    }
    setEditingTask(null);
    setTaskFormTitle('');
    setTaskFormDescription('');
    setTaskFormPriority('Medium');
    setTaskFormStatus('To Do');
    setTaskFormDeadline('');
    setTaskFormError(null);
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    if (!selectedProject || !currentUser || (selectedProject.owner || '').toLowerCase() !== currentUser.username.toLowerCase()) {
      triggerToast('Access denied. Only the project owner can edit tasks.');
      return;
    }
    setEditingTask(task);
    setTaskFormTitle(task.title);
    setTaskFormDescription(task.description);
    setTaskFormPriority(task.priority);
    setTaskFormStatus(task.status);
    setTaskFormDeadline(task.deadline);
    setTaskFormError(null);
    setTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError(null);

    if (!selectedProject || !currentUser || (selectedProject.owner || '').toLowerCase() !== currentUser.username.toLowerCase()) {
      setTaskFormError('Access denied. Only the project owner can modify tasks.');
      return;
    }

    if (!taskFormTitle.trim()) {
      setTaskFormError('Task title is required.');
      return;
    }

    if (!taskFormPriority || !['Low', 'Medium', 'High'].includes(taskFormPriority)) {
      setTaskFormError('Priority is required.');
      return;
    }

    if (editingTask) {
      const updated = storage.updateTask(editingTask.id, {
        title: taskFormTitle.trim(),
        description: taskFormDescription.trim(),
        priority: taskFormPriority,
        status: taskFormStatus,
        deadline: taskFormDeadline,
      });
      if (updated) {
        setTasks(storage.getTasks());
        triggerToast(`Task "${taskFormTitle}" updated!`);
      }
    } else {
      storage.createTask({
        project_id: selectedProject.id,
        title: taskFormTitle.trim(),
        description: taskFormDescription.trim(),
        priority: taskFormPriority,
        status: taskFormStatus,
        deadline: taskFormDeadline,
      });
      setTasks(storage.getTasks());
      triggerToast(`Task added to "${selectedProject.title}".`);
    }

    setTaskModalOpen(false);
  };

  const toggleTaskComplete = (task: Task) => {
    if (!selectedProject || !currentUser || (selectedProject.owner || '').toLowerCase() !== currentUser.username.toLowerCase()) {
      triggerToast('Access denied. Only the project owner can update task completion.');
      return;
    }
    const nextStatus: TaskStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
    storage.updateTask(task.id, { status: nextStatus });
    setTasks(storage.getTasks());
    triggerToast(
      nextStatus === 'Completed'
        ? `Task "${task.title}" marked as completed!`
        : `Task "${task.title}" reopened.`
    );
  };

  const handleTaskStatusChange = (task: Task, nextStatus: TaskStatus) => {
    if (!selectedProject || !currentUser || (selectedProject.owner || '').toLowerCase() !== currentUser.username.toLowerCase()) {
      triggerToast('Access denied. Only the project owner can update task status.');
      return;
    }
    storage.updateTask(task.id, { status: nextStatus });
    setTasks(storage.getTasks());
    triggerToast(`Task "${task.title}" moved to ${nextStatus}.`);
  };

  const confirmDeleteTask = (task: Task) => {
    if (!selectedProject || !currentUser || (selectedProject.owner || '').toLowerCase() !== currentUser.username.toLowerCase()) {
      triggerToast('Access denied. Only the project owner can delete tasks.');
      return;
    }
    setItemToDelete({
      type: 'task',
      id: task.id,
      title: task.title,
    });
    setDeleteModalOpen(true);
  };

  const executeDelete = () => {
    if (!itemToDelete || !currentUser) return;

    if (itemToDelete.type === 'project') {
      const targetProj = projects.find((p) => p.id === itemToDelete.id);
      if (!targetProj || (targetProj.owner || '').trim().toLowerCase() !== currentUser.username.trim().toLowerCase()) {
        triggerToast('Access denied. Only the project owner can delete this project.');
        setDeleteModalOpen(false);
        setItemToDelete(null);
        return;
      }
      storage.deleteProject(itemToDelete.id);
      setProjects(storage.getProjects());
      setTasks(storage.getTasks());
      triggerToast(`Project "${itemToDelete.title}" and its tasks deleted.`);
      const remaining = storage.getUserProjects(currentUser.username);
      setSelectedProjectId(remaining[0]?.id || null);
      setCurrentPage('projects');
    } else {
      const targetTask = tasks.find((t) => t.id === itemToDelete.id);
      const parentProj = targetTask ? projects.find((p) => p.id === targetTask.project_id) : null;
      if (!parentProj || (parentProj.owner || '').toLowerCase() !== currentUser.username.toLowerCase()) {
        triggerToast('Access denied. Only the project owner can delete this task.');
        setDeleteModalOpen(false);
        setItemToDelete(null);
        return;
      }
      storage.deleteTask(itemToDelete.id);
      setTasks(storage.getTasks());
      triggerToast(`Task "${itemToDelete.title}" deleted.`);
    }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  // --------------------------------------------------------------------------
  // Badge Component Helpers
  // --------------------------------------------------------------------------

  const renderStatusBadge = (status: ProjectStatus | TaskStatus) => {
    switch (status) {
      case 'Planning':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Planning</span>;
      case 'In Progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">In Progress</span>;
      case 'Completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case 'Archived':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Archived</span>;
      case 'To Do':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">To Do</span>;
      default:
        return null;
    }
  };

  const renderPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'High':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800">High Priority</span>;
      case 'Medium':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">Medium</span>;
      case 'Low':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">Low</span>;
    }
  };

  // --------------------------------------------------------------------------
  // 1 & 2. AUTHENTICATION PAGES (LOGIN & REGISTER)
  // --------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased text-slate-900">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/25 mb-4">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">PROJECTPULSE</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Student Project &amp; Task Management Platform</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
          <div className="bg-white py-8 px-6 sm:px-10 shadow-lg rounded-2xl border border-slate-200/80">
            {authError && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccessMessage && authView === 'login' && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{authSuccessMessage}</span>
              </div>
            )}

            {authView === 'login' ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Welcome Back</h2>
                  <p className="text-xs text-slate-500 mt-1">Enter your student credentials to access your dashboard.</p>
                </div>

                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Username / Email
                    </label>
                    <input
                      type="text"
                      value={authUsername}
                      onChange={(e) => {
                        setAuthUsername(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="e.g. alex_morgan or student@university.edu"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => triggerToast('Password reset instructions will be sent to your registered email address.')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => {
                        setAuthPassword(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition duration-150 ease-in-out cursor-pointer"
                  >
                    Log In
                  </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-500">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthView('register');
                      setAuthError(null);
                      setAuthSuccessMessage(null);
                    }}
                    className="text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Create your account</h2>
                  <p className="text-xs text-slate-500 mt-1">Sign up to begin organizing courses and project deadlines.</p>
                </div>

                <form onSubmit={handleRegister} noValidate className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      value={authUsername}
                      onChange={(e) => {
                        setAuthUsername(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Choose a username"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => {
                        setAuthEmail(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="student@university.edu"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => {
                        setAuthPassword(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Create a strong password"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={authConfirmPassword}
                      onChange={(e) => {
                        setAuthConfirmPassword(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Re-type your password"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition duration-150 ease-in-out cursor-pointer"
                  >
                    Create Account
                  </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-500">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthView('login');
                      setAuthError(null);
                      setAuthSuccessMessage(null);
                    }}
                    className="text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    Login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATED WEB APPLICATION LAYOUT
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 flex flex-col">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Navigation Bar */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => setCurrentPage('dashboard')}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-slate-900">PROJECTPULSE</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                  currentPage === 'dashboard'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage('projects')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                  currentPage === 'projects' || currentPage === 'project-detail'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                Projects
              </button>
              <button
                onClick={() => setCurrentPage('profile')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                  currentPage === 'profile'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition flex items-center gap-1.5 ml-2 cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
            <button
              onClick={() => {
                setCurrentPage('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
                currentPage === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => {
                setCurrentPage('projects');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
                currentPage === 'projects' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
              }`}
            >
              <FolderKanban className="w-4 h-4" /> Projects
            </button>
            <button
              onClick={() => {
                setCurrentPage('profile');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
                currentPage === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
              }`}
            >
              <UserIcon className="w-4 h-4" /> Profile
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 flex items-center gap-2.5"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        )}
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* -------------------------------------------------------------------
            3. DASHBOARD PAGE
        ------------------------------------------------------------------- */}
        {currentPage === 'dashboard' && (
          <div className="space-y-8">
            {/* Header Greeting */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {greeting}, {currentUser.username}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Here is the real-time status of your academic projects and upcoming deadlines.
                </p>
              </div>
              <button
                onClick={openCreateProjectModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">Total Projects</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{stats.totalProjects}</div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">Coursework &amp; study</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-blue-600">Active Projects</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-2">{stats.activeProjects}</div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">In progress</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600">Completed Projects</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">{stats.completedProjects}</div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">Finished milestones</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Tasks</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2">{stats.pendingTasks}</div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">Status: To Do</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm col-span-2 sm:col-span-1 lg:col-span-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-red-600">Overdue Tasks</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-2">{stats.overdueTasks}</div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">Past target date</span>
              </div>
            </div>

            {/* Overdue Tasks Alert Notice */}
            {stats.overdueTasks > 0 && (
              <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-900">
                    Attention: You have {stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? 's' : ''}!
                  </h3>
                  <p className="text-xs text-red-700 mt-0.5">
                    Tasks past their completion deadline should be prioritized or rescheduled.
                  </p>
                </div>
              </div>
            )}

            {/* "My Projects" Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900">My Projects</h2>
                <button
                  onClick={() => setCurrentPage('projects')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All Projects &rarr;
                </button>
              </div>

              {userProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {userProjects.map((project) => {
                    const progress = getProjectProgress(project.id);
                    const projectTasksCount = tasks.filter((t) => t.project_id === project.id).length;
                    const isOverdue = isDateOverdue(project.deadline, project.status === 'Completed');

                    return (
                      <div
                        key={project.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            {renderStatusBadge(project.status)}
                            {isOverdue && (
                              <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                Overdue
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 line-clamp-1">{project.title}</h3>
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                            {project.description || 'No description provided.'}
                          </p>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100">
                          {/* Progress */}
                          <div className="flex justify-between items-center text-xs font-medium text-slate-600 mb-1.5">
                            <span>
                              {tasks.filter((t) => t.project_id === project.id && t.status === 'Completed').length} / {projectTasksCount} Tasks Completed
                            </span>
                            <span className="font-bold text-slate-900">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <ListTodo className="w-3.5 h-3.5 text-slate-400" />
                              {projectTasksCount} task{projectTasksCount === 1 ? '' : 's'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {project.deadline || 'No deadline'}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedProjectId(project.id);
                              setCurrentPage('project-detail');
                            }}
                            className="w-full mt-4 py-2 px-3 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            View Project
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">No Projects Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Get started by creating your first student project to keep track of tasks and milestones.
                  </p>
                  <button
                    onClick={openCreateProjectModal}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow cursor-pointer"
                  >
                    + Create Project
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            4. PROJECTS PAGE
        ------------------------------------------------------------------- */}
        {currentPage === 'projects' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Projects</h1>
                <p className="text-sm text-slate-500 mt-1">Manage and track your active academic and capstone projects.</p>
              </div>
              <button
                onClick={openCreateProjectModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects by title..."
                  className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    title="Clear search (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block absolute right-3 top-2.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200 pointer-events-none" title="Press / to search">
                    /
                  </kbd>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {(['All', 'Planning', 'In Progress', 'Completed', 'Archived'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition whitespace-nowrap cursor-pointer ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Grid */}
            {userProjects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3.5">
                  <FolderKanban className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No projects found.</h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  You haven&apos;t created any projects yet. Start tracking your academic coursework, tasks, and deadlines by creating your first project.
                </p>
                <button
                  onClick={openCreateProjectModal}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProjects.map((project) => {
                  const progress = getProjectProgress(project.id);
                  const projectTasksCount = tasks.filter((t) => t.project_id === project.id).length;
                  const isOverdue = isDateOverdue(project.deadline, project.status === 'Completed');

                  return (
                    <div
                      key={project.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          {renderStatusBadge(project.status)}
                          {isOverdue && (
                            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              Overdue
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{project.title}</h3>
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {project.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100">
                        {/* Progress */}
                        <div className="flex justify-between items-center text-xs font-medium text-slate-600 mb-1.5">
                          <span>
                            {tasks.filter((t) => t.project_id === project.id && t.status === 'Completed').length} / {projectTasksCount} Tasks Completed
                          </span>
                          <span className="font-bold text-slate-900">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-500 mb-4">
                          <span className="flex items-center gap-1">
                            <ListTodo className="w-3.5 h-3.5 text-slate-400" />
                            {projectTasksCount} task{projectTasksCount === 1 ? '' : 's'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {project.deadline || 'No deadline'}
                          </span>
                        </div>

                        {/* Card Action Buttons: View, Edit, Delete */}
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => {
                              setSelectedProjectId(project.id);
                              setCurrentPage('project-detail');
                            }}
                            className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl text-center transition cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openEditProjectModal(project)}
                            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl text-center transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => confirmDeleteProject(project)}
                            className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl text-center transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">No projects found.</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or status filter.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                  }}
                  className="mt-3 text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------
            6. PROJECT DETAILS PAGE
        ------------------------------------------------------------------- */}
        {currentPage === 'project-detail' && (
          selectedProject ? (
          <div className="space-y-6">
            {/* Top Breadcrumb & Actions */}
            <div className="flex flex-wrap justify-between items-center gap-4">
              <button
                onClick={() => setCurrentPage('projects')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditProjectModal(selectedProject)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 shadow-sm transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  Edit Project
                </button>
                <button
                  onClick={() => confirmDeleteProject(selectedProject)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200/80 rounded-xl hover:bg-red-100 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Project
                </button>
              </div>
            </div>

            {/* Project Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  {renderStatusBadge(selectedProject.status)}
                  {isDateOverdue(selectedProject.deadline, selectedProject.status === 'Completed') && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                      Overdue Target
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {selectedProject.title}
                </h1>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {selectedProject.description || 'No detailed scope description provided.'}
                </p>
              </div>

              {/* Start Date & Deadline */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Start Date</span>
                  <span className="font-semibold text-slate-800">{selectedProject.start_date || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Target Deadline</span>
                  <span className="font-semibold text-slate-800">{selectedProject.deadline || 'None specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Status</span>
                  <span className="font-semibold text-slate-800">{selectedProject.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Tasks</span>
                  <span className="font-semibold text-slate-800">{selectedProjectTasks.length} total</span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Project Progress</span>
                  </div>
                  <span className="text-blue-600 font-extrabold text-base">
                    {getProjectProgress(selectedProject.id)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      getProjectProgress(selectedProject.id) === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${getProjectProgress(selectedProject.id)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 mt-2.5 font-medium">
                  <span className="text-slate-700 font-medium">
                    <strong className="text-slate-900 font-bold">
                      {selectedProjectTasks.filter((t) => t.status === 'Completed').length}
                    </strong>{' '}
                    /{' '}
                    <strong className="text-slate-900 font-bold">{selectedProjectTasks.length}</strong> Tasks Completed
                  </span>
                  <span className="font-bold text-slate-900">
                    {getProjectProgress(selectedProject.id)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Tasks</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tasks associated with this project. Completing tasks automatically updates project progress.
                  </p>
                </div>
                <button
                  onClick={openCreateTaskModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>

              {selectedProjectTasks.length > 0 ? (
                <div className="space-y-3">
                  {selectedProjectTasks.map((task) => {
                    const isTaskOverdue = isDateOverdue(task.deadline, task.status === 'Completed');

                    return (
                      <div
                        key={task.id}
                        className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          task.status === 'Completed'
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : isTaskOverdue
                            ? 'border-red-200'
                            : 'border-slate-200/90'
                        }`}
                      >
                        <div className="flex items-start gap-3.5 flex-1">
                          {/* Checkbox Complete Button */}
                          <button
                            onClick={() => toggleTaskComplete(task)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 mt-0.5 ${
                              task.status === 'Completed'
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 hover:border-blue-600 bg-white'
                            }`}
                            title={task.status === 'Completed' ? 'Mark Incomplete' : 'Complete Task'}
                          >
                            {task.status === 'Completed' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={`text-sm font-bold ${
                                  task.status === 'Completed'
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-900'
                                }`}
                              >
                                {task.title}
                              </h3>
                              {renderPriorityBadge(task.priority)}
                              {renderStatusBadge(task.status)}
                              {isTaskOverdue && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                  Overdue
                                </span>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-xs text-slate-500 leading-relaxed">{task.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Deadline: {task.deadline || 'No deadline'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Task Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task, e.target.value as TaskStatus)}
                            className="text-xs font-semibold py-1.5 px-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            title="Change Task Status"
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                          <button
                            onClick={() => toggleTaskComplete(task)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                              task.status === 'Completed'
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {task.status === 'Completed' ? 'Reopen' : 'Complete'}
                          </button>
                          <button
                            onClick={() => openEditTaskModal(task)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            title="Edit Task"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDeleteTask(task)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <ListTodo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-900">No tasks in this project yet</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click &quot;Add Task&quot; above to create your first milestone.
                  </p>
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-sm max-w-lg mx-auto my-8">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3.5">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Project Not Found or Access Denied</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Only the owner of this project can access and modify it. You do not have permission or this project does not exist.
              </p>
              <button
                onClick={() => setCurrentPage('projects')}
                className="mt-5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Back to Projects
              </button>
            </div>
          )
        )}

        {/* -------------------------------------------------------------------
            11. PROFILE PAGE
        ------------------------------------------------------------------- */}
        {currentPage === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Profile</h1>
              <p className="text-sm text-slate-500 mt-1">Your registered student account details.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-blue-500/20">
                  {(currentUser?.username || 'Student').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{currentUser.username}</h2>
                  <p className="text-xs text-slate-500">{currentUser.email}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Username
                  </label>
                  <p className="text-sm font-medium text-slate-900">{currentUser.username}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <p className="text-sm font-medium text-slate-900">{currentUser.email}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Total Active Projects
                  </label>
                  <p className="text-sm font-medium text-slate-900">{userProjects.length} projects</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <button
                  onClick={handleLogout}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* -------------------------------------------------------------------
          5 & 8. CREATE / EDIT PROJECT MODAL
      ------------------------------------------------------------------- */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingProject ? 'Edit Project' : 'Create Project'}
              </h2>
              <button
                onClick={() => setProjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {projectFormError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {projectFormError}
              </div>
            )}

            <form onSubmit={handleSaveProject} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={projectFormTitle}
                  onChange={(e) => {
                    setProjectFormTitle(e.target.value);
                    if (projectFormError) setProjectFormError(null);
                  }}
                  placeholder="e.g. Distributed Database Capstone"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description *
                </label>
                <textarea
                  value={projectFormDescription}
                  onChange={(e) => {
                    setProjectFormDescription(e.target.value);
                    if (projectFormError) setProjectFormError(null);
                  }}
                  maxLength={500}
                  placeholder="Briefly describe the project goals, requirements, or deliverables..."
                  rows={3}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={projectFormStartDate}
                    onChange={(e) => setProjectFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Deadline *
                  </label>
                  <input
                    type="date"
                    value={projectFormDeadline}
                    onChange={(e) => {
                      setProjectFormDeadline(e.target.value);
                      if (projectFormError) setProjectFormError(null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={projectFormStatus}
                  onChange={(e) => setProjectFormStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                >
                  <option value="Planning">Planning</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          7 & 9. ADD / EDIT TASK MODAL
      ------------------------------------------------------------------- */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingTask ? 'Edit Task' : 'Add Task'}
              </h2>
              <button
                onClick={() => setTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {taskFormError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {taskFormError}
              </div>
            )}

            <form onSubmit={handleSaveTask} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskFormTitle}
                  onChange={(e) => {
                    setTaskFormTitle(e.target.value);
                    if (taskFormError) setTaskFormError(null);
                  }}
                  placeholder="e.g. Write test cases for user registration"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={taskFormDescription}
                  onChange={(e) => {
                    setTaskFormDescription(e.target.value);
                    if (taskFormError) setTaskFormError(null);
                  }}
                  maxLength={300}
                  placeholder="Notes, steps, or acceptance criteria..."
                  rows={2}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Priority *
                  </label>
                  <select
                    value={taskFormPriority}
                    onChange={(e) => {
                      setTaskFormPriority(e.target.value as TaskPriority);
                      if (taskFormError) setTaskFormError(null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={taskFormStatus}
                    onChange={(e) => setTaskFormStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={taskFormDeadline}
                  onChange={(e) => setTaskFormDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingTask ? 'Save Task' : 'Add Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          10. DELETE CONFIRMATION DIALOG
      ------------------------------------------------------------------- */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              {itemToDelete.type === 'task' ? (
                <>Are you sure you want to delete this task?</>
              ) : (
                <>
                  Are you sure you want to delete this project?
                  <span className="block text-xs text-red-600 mt-2 bg-red-50 p-2.5 rounded-lg border border-red-100 font-medium">
                    ⚠️ Deleting <strong>&quot;{itemToDelete.title}&quot;</strong> will permanently remove this project and all its associated tasks.
                  </span>
                </>
              )}
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl shadow-md transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Simple Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} PROJECTPULSE &mdash; Student Project &amp; Task Management Platform.
      </footer>
    </div>
  );
}
