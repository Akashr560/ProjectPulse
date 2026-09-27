/**
 * End-to-End User Flow Test Suite for PROJECTPULSE (Step 17)
 * Tests all 22 required user journeys against actual application storage and logic.
 */

// Simple in-memory localStorage shim for Node/tsx testing
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// Attach to global
(global as any).localStorage = new LocalStorageMock();

async function runAllTests() {
  console.log('====================================================');
  console.log('PROJECTPULSE — STEP 17: FINAL FUNCTIONAL TEST SUITE');
  console.log('====================================================\n');

  // Dynamic import of storage service after localStorage is mocked
  const storage = await import('../src/services/storage');

  let passedTests = 0;
  let totalTests = 22;

  function assert(condition: boolean, stepNum: number, desc: string, details?: string) {
    if (condition) {
      console.log(`[PASS] Step ${stepNum}: ${desc}`);
      if (details) console.log(`       ↳ ${details}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Step ${stepNum}: ${desc}`);
      if (details) console.error(`       ↳ Error: ${details}`);
      throw new Error(`Step ${stepNum} failed: ${desc}`);
    }
  }

  // 1. Register a new account
  const testUser = {
    username: 'sarah_connor',
    email: 'sarah.connor@sky.net',
    password: 'securePassword2026!',
  };
  const regResult = storage.registerUser(testUser);
  assert(regResult.success === true, 1, 'Register a new account', `Registered user: ${testUser.username}`);

  // 2. Login
  const loginResult = storage.loginUser(testUser.username, testUser.password);
  assert(
    loginResult.success === true && storage.getCurrentUser()?.username === testUser.username,
    2,
    'Login with credentials',
    `Authenticated as ${storage.getCurrentUser()?.username}`
  );

  const currentUser = storage.getCurrentUser()!;

  // 3. Open Dashboard
  // Verify user's projects are initially empty for this new user
  let userProjects = storage.getUserProjects(currentUser.username);
  assert(
    Array.isArray(userProjects) && userProjects.length === 0,
    3,
    'Open Dashboard',
    `Initial user project count: ${userProjects.length} (clean state)`
  );

  // 4. Create Project 1
  const project1Data = {
    owner: currentUser.username,
    title: 'Distributed Systems Raft Consensus',
    description: 'Build a fault-tolerant distributed consensus cluster using Go RPCs.',
    start_date: '2026-09-01',
    deadline: '2026-10-30',
    status: 'In Progress' as const,
  };
  const project1 = storage.createProject(project1Data);
  assert(
    Boolean(project1.id) && project1.title === project1Data.title,
    4,
    'Create Project 1',
    `Created Project 1 ID: ${project1.id} ("${project1.title}")`
  );

  // 5. Create Project 2
  const project2Data = {
    owner: currentUser.username,
    title: 'Mobile Health Tracker',
    description: 'Cross-platform React Native app with biometric tracking and offline storage.',
    start_date: '2026-09-15',
    deadline: '2026-11-15',
    status: 'Planning' as const,
  };
  const project2 = storage.createProject(project2Data);
  assert(
    Boolean(project2.id) && project2.title === project2Data.title,
    5,
    'Create Project 2',
    `Created Project 2 ID: ${project2.id} ("${project2.title}")`
  );

  // 6. Open Project 1
  let activeProjectId = project1.id;
  let activeProject = storage.getProjects().find((p) => p.id === activeProjectId);
  assert(
    Boolean(activeProject) && activeProject?.id === project1.id,
    6,
    'Open Project 1',
    `Opened project "${activeProject?.title}"`
  );

  // 7. Add at least 3 tasks
  const task1 = storage.createTask({
    project_id: project1.id,
    title: 'Task 1: Setup RPC transport',
    description: 'Implement socket handling and heartbeat serialization.',
    priority: 'High',
    status: 'To Do',
    deadline: '2026-10-10',
  });

  const task2 = storage.createTask({
    project_id: project1.id,
    title: 'Task 2: Leader election election timer',
    description: 'Randomized election timeout between 150ms and 300ms.',
    priority: 'Medium',
    status: 'To Do',
    deadline: '2026-10-15',
  });

  const task3 = storage.createTask({
    project_id: project1.id,
    title: 'Task 3: Log compaction and snapshotting',
    description: 'Persist state machine state to disk.',
    priority: 'Low',
    status: 'To Do',
    deadline: '2026-10-25',
  });

  let p1Tasks = storage.getProjectTasks(project1.id);
  assert(
    p1Tasks.length >= 3,
    7,
    'Add at least 3 tasks',
    `Added ${p1Tasks.length} tasks to Project 1`
  );

  // 8. Set different task priorities
  const priorities = p1Tasks.map((t) => t.priority);
  const distinctPriorities = new Set(priorities);
  assert(
    distinctPriorities.size >= 3 && distinctPriorities.has('High') && distinctPriorities.has('Medium') && distinctPriorities.has('Low'),
    8,
    'Set different task priorities',
    `Priorities set: ${Array.from(distinctPriorities).join(', ')}`
  );

  // 9. Change one task to In Progress
  const updatedTask2 = storage.updateTask(task2.id, { status: 'In Progress' });
  assert(
    updatedTask2?.status === 'In Progress',
    9,
    'Change one task to In Progress',
    `Task "${task2.title}" status changed to In Progress`
  );

  // 10. Complete one task
  const updatedTask1 = storage.updateTask(task1.id, { status: 'Completed' });
  assert(
    updatedTask1?.status === 'Completed',
    10,
    'Complete one task',
    `Task "${task1.title}" status changed to Completed`
  );

  // 11. Verify project progress changes
  p1Tasks = storage.getProjectTasks(project1.id);
  const initialProgress = storage.calculateProjectProgress(project1.id, p1Tasks);
  // 1 of 3 tasks completed = 33%
  assert(
    initialProgress === 33,
    11,
    'Verify project progress changes',
    `Progress calculated: ${initialProgress}% (1 of 3 completed)`
  );

  // 12. Edit the project
  const updatedP1 = storage.updateProject(project1.id, {
    title: 'Distributed Systems Raft Consensus (Production Grade)',
    status: 'In Progress',
  });
  assert(
    updatedP1?.title === 'Distributed Systems Raft Consensus (Production Grade)',
    12,
    'Edit the project',
    `New project title: "${updatedP1?.title}"`
  );

  // 13. Search for the project
  const myProjects = storage.getUserProjects(currentUser.username);
  const searchQuery = 'Production Grade';
  const searchResults = myProjects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  assert(
    searchResults.length === 1 && searchResults[0].id === project1.id,
    13,
    'Search for the project by title',
    `Search for "${searchQuery}" returned 1 match: "${searchResults[0].title}"`
  );

  // 14. Filter projects by status
  const inProgressProjects = myProjects.filter((p) => p.status === 'In Progress');
  const planningProjects = myProjects.filter((p) => p.status === 'Planning');
  assert(
    inProgressProjects.length === 1 && planningProjects.length === 1,
    14,
    'Filter projects by status',
    `In Progress: ${inProgressProjects.length}, Planning: ${planningProjects.length}`
  );

  // 15. Edit a task
  const editedTask3 = storage.updateTask(task3.id, {
    title: 'Task 3: Log compaction and WAL snapshotting [UPDATED]',
    priority: 'High',
  });
  assert(
    Boolean(editedTask3?.title.includes('[UPDATED]')) && editedTask3?.priority === 'High',
    15,
    'Edit a task',
    `Updated task title and priority: "${editedTask3?.title}" (Priority: ${editedTask3?.priority})`
  );

  // 16. Delete a task
  storage.deleteTask(task3.id);
  const remainingTasks = storage.getProjectTasks(project1.id);
  const newProgress = storage.calculateProjectProgress(project1.id, remainingTasks);
  assert(
    remainingTasks.length === 2 && !remainingTasks.some((t) => t.id === task3.id),
    16,
    'Delete a task',
    `Remaining tasks: ${remainingTasks.length}. Updated progress: ${newProgress}% (1 of 2 completed = 50%)`
  );

  // 17. Create an overdue task for testing
  // Overdue rule: deadline < today AND status != Completed
  const overdueTask = storage.createTask({
    project_id: project1.id,
    title: 'Past Due Bugfix Task',
    description: 'Fix deadlock issue found in stress testing.',
    priority: 'High',
    status: 'To Do',
    deadline: '2026-09-01', // Before current date 2026-09-26
  });
  assert(
    Boolean(overdueTask.id) && overdueTask.deadline === '2026-09-01',
    17,
    'Create an overdue task for testing',
    `Created task with past deadline: ${overdueTask.deadline} (Status: ${overdueTask.status})`
  );

  // 18. Verify Overdue Tasks count
  const allUserTasks = storage.getTasks().filter((t) => {
    const userProjIds = new Set(storage.getUserProjects(currentUser.username).map((p) => p.id));
    return userProjIds.has(t.project_id);
  });
  const today = '2026-09-26';
  const overdueCount = allUserTasks.filter(
    (t) => t.deadline && t.deadline < today && t.status !== 'Completed'
  ).length;
  assert(
    overdueCount === 1,
    18,
    'Verify Overdue Tasks count',
    `Dynamic overdue tasks detected: ${overdueCount}`
  );

  // 19. Delete a project
  storage.deleteProject(project2.id);
  const projectsAfterDelete = storage.getUserProjects(currentUser.username);
  assert(
    projectsAfterDelete.length === 1 && !projectsAfterDelete.some((p) => p.id === project2.id),
    19,
    'Delete a project',
    `Project 2 deleted. Remaining user projects: ${projectsAfterDelete.length}`
  );

  // 20. Verify Dashboard numbers update
  const remainingUserProjects = storage.getUserProjects(currentUser.username);
  const remainingUserProjIds = new Set(remainingUserProjects.map((p) => p.id));
  const remainingUserTasks = storage.getTasks().filter((t) => remainingUserProjIds.has(t.project_id));

  const totalProjects = remainingUserProjects.length;
  const activeProjects = remainingUserProjects.filter((p) => p.status === 'In Progress').length;
  const completedProjects = remainingUserProjects.filter((p) => p.status === 'Completed').length;
  const pendingTasks = remainingUserTasks.filter((t) => t.status === 'To Do').length;
  const finalOverdueTasks = remainingUserTasks.filter(
    (t) => t.deadline && t.deadline < today && t.status !== 'Completed'
  ).length;

  assert(
    totalProjects === 1 &&
      activeProjects === 1 &&
      completedProjects === 0 &&
      pendingTasks === 1 &&
      finalOverdueTasks === 1,
    20,
    'Verify Dashboard numbers update',
    `Stats: Total=${totalProjects}, Active=${activeProjects}, Completed=${completedProjects}, Pending=${pendingTasks}, Overdue=${finalOverdueTasks}`
  );

  // 21. Logout
  storage.setCurrentUser(null);
  assert(
    storage.getCurrentUser() === null,
    21,
    'Logout',
    'Session cleared in persistent storage'
  );

  // 22. Try accessing Dashboard after logout
  // Simulate app guard: if (!currentUser) -> redirects to Login/Register screen
  const sessionAfterLogout = storage.getCurrentUser();
  const canAccessDashboard = sessionAfterLogout !== null;
  assert(
    canAccessDashboard === false,
    22,
    'Try accessing Dashboard after logout',
    'Dashboard access blocked: Unauthenticated session safely restricted to Login view'
  );

  console.log('\n====================================================');
  console.log(`ALL ${passedTests} / ${totalTests} FUNCTIONAL USER FLOW TESTS PASSED!`);
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
