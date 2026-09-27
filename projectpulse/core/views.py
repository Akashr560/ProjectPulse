from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from django.utils import timezone

from .models import Project, Task
from .forms import (
    StudentRegistrationForm,
    StudentLoginForm,
    ProjectForm,
    TaskForm,
)


# ==============================================================================
# Authentication Views
# ==============================================================================

def home(request):
    """
    Public landing page for ProjectPulse.
    Redirects authenticated users straight to the dashboard.
    """
    if request.user.is_authenticated:
        return redirect('dashboard')
    return render(request, 'base.html', {'is_home': True})


def register_view(request):
    """
    User registration using Django's UserCreationForm.
    """
    if request.user.is_authenticated:
        return redirect('dashboard')

    if request.method == 'POST':
        form = StudentRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f"Welcome to ProjectPulse, {user.username}! Your account has been created.")
            return redirect('dashboard')
        else:
            messages.error(request, "Registration failed. Please correct the errors below.")
    else:
        form = StudentRegistrationForm()

    return render(request, 'register.html', {'form': form})


def login_view(request):
    """
    User login using Django's AuthenticationForm.
    """
    if request.user.is_authenticated:
        return redirect('dashboard')

    next_url = request.GET.get('next', '')

    if request.method == 'POST':
        form = StudentLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, f"Welcome back, {user.username}!")

            redirect_target = request.POST.get('next') or request.GET.get('next')
            if redirect_target and redirect_target.startswith('/') and not redirect_target.startswith('//'):
                return redirect(redirect_target)
            return redirect('dashboard')
        else:
            messages.error(request, "Invalid username or password. Please try again.")
    else:
        form = StudentLoginForm(request)

    return render(request, 'login.html', {'form': form, 'next': next_url})


def logout_view(request):
    """
    User logout. Flushes session and redirects to login page.
    """
    if request.user.is_authenticated:
        username = request.user.username
        logout(request)
        messages.info(request, f"You have been logged out, {username}.")
    else:
        logout(request)
    return redirect('login')


# ==============================================================================
# Dashboard (Calculates Real SQLite Metrics)
# ==============================================================================

@login_required
def dashboard_view(request):
    """
    Dashboard calculating real-time metrics from SQLite database:
    - Total Projects
    - Active Projects (status='in_progress')
    - Completed Projects (status='completed')
    - Pending Tasks (status != 'completed')
    - Overdue Tasks (deadline < today AND status != 'completed')
    """
    today = timezone.now().date()

    # User-scoped queries (Strict data privacy)
    user_projects = Project.objects.filter(owner=request.user)
    user_tasks = Task.objects.filter(project__owner=request.user)

    # SQLite calculated metrics
    total_projects = user_projects.count()
    active_projects = user_projects.filter(status='in_progress').count()
    completed_projects = user_projects.filter(status='completed').count()
    pending_tasks = user_tasks.exclude(status='completed').count()
    overdue_tasks = user_tasks.filter(deadline__lt=today).exclude(status='completed')
    overdue_tasks_count = overdue_tasks.count()

    # Recent active projects for dashboard display
    recent_projects = user_projects[:5]

    context = {
        'total_projects': total_projects,
        'active_projects': active_projects,
        'completed_projects': completed_projects,
        'pending_tasks': pending_tasks,
        'overdue_tasks_count': overdue_tasks_count,
        'overdue_tasks': overdue_tasks[:5],
        'recent_projects': recent_projects,
    }
    return render(request, 'dashboard.html', context)


# ==============================================================================
# Project CRUD Views (with Search, Filter, and IDOR Prevention)
# ==============================================================================

@login_required
def project_list(request):
    """
    READ (List): /projects/
    Supports title/description search and status filtering.
    """
    query = request.GET.get('q', '').strip()
    status_filter = request.GET.get('status', '').strip()

    projects = Project.objects.filter(owner=request.user)

    if query:
        projects = projects.filter(
            Q(title__icontains=query) | Q(description__icontains=query)
        )

    if status_filter and status_filter in dict(Project.STATUS_CHOICES):
        projects = projects.filter(status=status_filter)

    context = {
        'projects': projects,
        'query': query,
        'status_filter': status_filter,
        'total_count': projects.count(),
    }
    return render(request, 'projects.html', context)


@login_required
def project_create(request):
    """
    CREATE: /projects/create/
    Binds owner=request.user server-side.
    """
    if request.method == 'POST':
        form = ProjectForm(request.POST)
        if form.is_valid():
            project = form.save(commit=False)
            project.owner = request.user
            project.save()
            messages.success(request, f"Project '{project.title}' created successfully!")
            return redirect('project_detail', id=project.id)
        else:
            messages.error(request, "Failed to create project. Please correct the errors below.")
    else:
        form = ProjectForm()

    return render(request, 'create_project.html', {'form': form})


@login_required
def project_detail(request, id):
    """
    READ (Detail): /projects/<id>/
    IDOR Prevention: Queries with owner=request.user.
    """
    project = get_object_or_404(Project, pk=id, owner=request.user)
    tasks = project.tasks.all()
    task_form = TaskForm()

    context = {
        'project': project,
        'tasks': tasks,
        'task_form': task_form,
    }
    return render(request, 'project_detail.html', context)


@login_required
def project_edit(request, id):
    """
    UPDATE: /projects/<id>/edit/
    IDOR Prevention: Queries with owner=request.user.
    """
    project = get_object_or_404(Project, pk=id, owner=request.user)

    if request.method == 'POST':
        form = ProjectForm(request.POST, instance=project)
        if form.is_valid():
            updated = form.save()
            messages.success(request, f"Project '{updated.title}' updated successfully!")
            return redirect('project_detail', id=updated.id)
        else:
            messages.error(request, "Failed to update project. Please correct the errors below.")
    else:
        form = ProjectForm(instance=project)

    context = {
        'form': form,
        'project': project,
    }
    return render(request, 'edit_project.html', context)


@login_required
def project_delete(request, id):
    """
    DELETE: /projects/<id>/delete/
    IDOR Prevention: Queries with owner=request.user.
    POST method required for destructive action.
    """
    project = get_object_or_404(Project, pk=id, owner=request.user)

    if request.method == 'POST':
        title = project.title
        project.delete()
        messages.success(request, f"Project '{title}' and all its tasks were deleted successfully.")
        return redirect('project_list')

    return render(request, 'project_confirm_delete.html', {'project': project})


# ==============================================================================
# Task CRUD Views
# ==============================================================================

@login_required
def task_create(request, project_id):
    """
    CREATE TASK: Inside a parent project owned by the user.
    """
    project = get_object_or_404(Project, pk=project_id, owner=request.user)

    if request.method == 'POST':
        form = TaskForm(request.POST)
        if form.is_valid():
            task = form.save(commit=False)
            task.project = project
            task.save()
            messages.success(request, f"Task '{task.title}' added to project '{project.title}'.")
        else:
            messages.error(request, "Failed to add task. Please check the task title.")
    return redirect('project_detail', id=project.id)


@login_required
def task_edit(request, id):
    """
    EDIT TASK: /tasks/<id>/edit/
    IDOR Prevention: project__owner=request.user.
    """
    task = get_object_or_404(Task, pk=id, project__owner=request.user)

    if request.method == 'POST':
        form = TaskForm(request.POST, instance=task)
        if form.is_valid():
            form.save()
            messages.success(request, f"Task '{task.title}' updated successfully!")
            return redirect('project_detail', id=task.project.id)
        else:
            messages.error(request, "Failed to update task. Please check the form errors.")
    else:
        form = TaskForm(instance=task)

    context = {
        'form': form,
        'task': task,
        'project': task.project,
    }
    return render(request, 'edit_task.html', context)


@login_required
def task_delete(request, id):
    """
    DELETE TASK: /tasks/<id>/delete/
    IDOR Prevention: project__owner=request.user.
    """
    task = get_object_or_404(Task, pk=id, project__owner=request.user)
    project_id = task.project.id

    if request.method == 'POST':
        title = task.title
        task.delete()
        messages.success(request, f"Task '{title}' has been removed.")

    return redirect('project_detail', id=project_id)


@login_required
def task_status_update(request, id):
    """
    CHANGE TASK STATUS: /tasks/<id>/status/
    Quick inline status switcher (todo, in_progress, completed).
    IDOR Prevention: project__owner=request.user.
    """
    task = get_object_or_404(Task, pk=id, project__owner=request.user)

    if request.method == 'POST':
        new_status = request.POST.get('status')
        if new_status in dict(Task.STATUS_CHOICES):
            task.status = new_status
            task.save()
            messages.success(request, f"Task '{task.title}' status updated to {task.get_status_display()}.")

    # Redirect back to referring page or project detail
    return redirect(request.META.get('HTTP_REFERER') or f'/projects/{task.project.id}/')
