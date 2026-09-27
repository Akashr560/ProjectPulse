from django.urls import path
from . import views

urlpatterns = [
    # Authentication & Landing
    path('', views.home, name='home'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    # Dashboard with Real SQLite Metrics
    path('dashboard/', views.dashboard_view, name='dashboard'),

    # Project CRUD
    path('projects/', views.project_list, name='project_list'),
    path('projects/create/', views.project_create, name='project_create'),
    path('projects/<int:id>/', views.project_detail, name='project_detail'),
    path('projects/<int:id>/edit/', views.project_edit, name='project_edit'),
    path('projects/<int:id>/delete/', views.project_delete, name='project_delete'),

    # Task CRUD & Quick Status Updates
    path('projects/<int:project_id>/tasks/create/', views.task_create, name='task_create'),
    path('tasks/<int:id>/edit/', views.task_edit, name='task_edit'),
    path('tasks/<int:id>/delete/', views.task_delete, name='task_delete'),
    path('tasks/<int:id>/status/', views.task_status_update, name='task_status_update'),
]
