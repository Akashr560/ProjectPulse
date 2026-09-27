from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from .models import Project, Task


class ProjectPulseCompleteTests(TestCase):
    def setUp(self):
        # Create student A
        self.user_a = User.objects.create_user(
            username='alice',
            email='alice@student.edu',
            password='PasswordAlice123!'
        )
        # Create student B
        self.user_b = User.objects.create_user(
            username='bob',
            email='bob@student.edu',
            password='PasswordBob123!'
        )
        # Create project for Alice
        self.project_a = Project.objects.create(
            owner=self.user_a,
            title='Operating Systems Kernel',
            description='CPU scheduling algorithms in C',
            status='in_progress',
            start_date=timezone.now().date(),
            deadline=timezone.now().date() + timedelta(days=14)
        )
        # Create tasks for Alice's project
        self.task_a1 = Task.objects.create(
            project=self.project_a,
            title='Implement Round Robin',
            status='completed',
            priority='high',
            deadline=timezone.now().date() + timedelta(days=7)
        )
        self.task_a2 = Task.objects.create(
            project=self.project_a,
            title='Implement Priority Scheduling',
            status='todo',
            priority='medium',
            deadline=timezone.now().date() + timedelta(days=10)
        )

    # --------------------------------------------------------------------------
    # 1. Authentication
    # --------------------------------------------------------------------------
    def test_registration_and_redirect(self):
        response = self.client.post(reverse('register'), {
            'username': 'charlie',
            'email': 'charlie@student.edu',
            'password': 'PasswordCharlie123!',
            'password2': 'PasswordCharlie123!',
        })
        self.assertRedirects(response, reverse('dashboard'))
        self.assertTrue(User.objects.filter(username='charlie').exists())

    def test_login_and_logout(self):
        # Login
        response = self.client.post(reverse('login'), {
            'username': 'alice',
            'password': 'PasswordAlice123!'
        })
        self.assertRedirects(response, reverse('dashboard'))

        # Logout redirects to login page
        response_logout = self.client.post(reverse('logout'))
        self.assertRedirects(response_logout, reverse('login'))

    # --------------------------------------------------------------------------
    # 2. Dashboard with Real SQLite Metrics & Progress Calculation
    # --------------------------------------------------------------------------
    def test_dashboard_metrics_and_progress_percentage(self):
        self.client.login(username='alice', password='PasswordAlice123!')
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 200)

        # Context assertions for calculated SQLite metrics
        self.assertEqual(response.context['total_projects'], 1)
        self.assertEqual(response.context['active_projects'], 1)
        self.assertEqual(response.context['completed_projects'], 0)
        self.assertEqual(response.context['pending_tasks'], 1)

        # Progress calculation: 1 completed / 2 total * 100 = 50%
        self.assertEqual(self.project_a.progress_percentage, 50)

    def test_zero_tasks_progress_percentage_is_zero(self):
        empty_project = Project.objects.create(
            owner=self.user_a,
            title='Empty Project',
            status='planning'
        )
        self.assertEqual(empty_project.progress_percentage, 0)

    # --------------------------------------------------------------------------
    # 3. Project CRUD Operations
    # --------------------------------------------------------------------------
    def test_project_create_success(self):
        self.client.login(username='alice', password='PasswordAlice123!')
        response = self.client.post(reverse('project_create'), {
            'title': 'Computer Networks Lab',
            'description': 'TCP/IP socket programming',
            'status': 'planning',
            'start_date': str(timezone.now().date()),
            'deadline': str(timezone.now().date() + timedelta(days=20)),
        })
        new_project = Project.objects.filter(title='Computer Networks Lab').first()
        self.assertIsNotNone(new_project)
        self.assertEqual(new_project.owner, self.user_a)
        self.assertRedirects(response, reverse('project_detail', args=[new_project.id]))

    def test_project_edit_success(self):
        self.client.login(username='alice', password='PasswordAlice123!')
        response = self.client.post(reverse('project_edit', args=[self.project_a.id]), {
            'title': 'OS Kernel Updated',
            'description': 'Updated scope',
            'status': 'completed',
            'start_date': str(self.project_a.start_date),
            'deadline': str(self.project_a.deadline),
        })
        self.assertRedirects(response, reverse('project_detail', args=[self.project_a.id]))
        self.project_a.refresh_from_db()
        self.assertEqual(self.project_a.title, 'OS Kernel Updated')
        self.assertEqual(self.project_a.status, 'completed')

    def test_project_delete_success(self):
        self.client.login(username='alice', password='PasswordAlice123!')
        proj_id = self.project_a.id
        response = self.client.post(reverse('project_delete', args=[proj_id]))
        self.assertRedirects(response, reverse('project_list'))
        self.assertFalse(Project.objects.filter(id=proj_id).exists())

    # --------------------------------------------------------------------------
    # 4. Task CRUD Operations
    # --------------------------------------------------------------------------
    def test_task_create_and_status_update(self):
        self.client.login(username='alice', password='PasswordAlice123!')
        # Create task
        response = self.client.post(reverse('task_create', args=[self.project_a.id]), {
            'title': 'Implement Multithreading',
            'description': 'POSIX pthreads',
            'priority': 'high',
            'status': 'todo',
        })
        self.assertRedirects(response, reverse('project_detail', args=[self.project_a.id]))
        task = Task.objects.filter(title='Implement Multithreading').first()
        self.assertIsNotNone(task)

        # Update task status
        self.client.post(reverse('task_status_update', args=[task.id]), {
            'status': 'completed'
        })
        task.refresh_from_db()
        self.assertEqual(task.status, 'completed')

    # --------------------------------------------------------------------------
    # 5. IDOR Security Checks (Cross-User Isolation)
    # --------------------------------------------------------------------------
    def test_idor_user_b_cannot_view_user_a_project(self):
        self.client.login(username='bob', password='PasswordBob123!')
        response = self.client.get(reverse('project_detail', args=[self.project_a.id]))
        self.assertEqual(response.status_code, 404)

    def test_idor_user_b_cannot_edit_user_a_project(self):
        self.client.login(username='bob', password='PasswordBob123!')
        response = self.client.post(reverse('project_edit', args=[self.project_a.id]), {
            'title': 'Bob Hack Attempt',
            'status': 'archived'
        })
        self.assertEqual(response.status_code, 404)

    def test_idor_user_b_cannot_delete_user_a_project(self):
        self.client.login(username='bob', password='PasswordBob123!')
        response = self.client.post(reverse('project_delete', args=[self.project_a.id]))
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Project.objects.filter(id=self.project_a.id).exists())
