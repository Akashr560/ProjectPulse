from django.contrib import admin
from .models import Project, Task


class TaskInline(admin.TabularInline):
    """
    Allows tasks to be viewed and edited directly inside the Project change form.
    """
    model = Task
    extra = 1
    fields = ('title', 'priority', 'status', 'deadline')
    show_change_link = True


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """
    Django Admin configuration for the Project model.
    """
    list_display = ('title', 'owner', 'status', 'start_date', 'deadline', 'created_at')
    list_filter = ('status', 'created_at', 'start_date')
    search_fields = ('title', 'description', 'owner__username', 'owner__email')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    inlines = [TaskInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('owner', 'title', 'description')
        }),
        ('Timeline & Status', {
            'fields': ('status', 'start_date', 'deadline')
        }),
    )


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """
    Django Admin configuration for the Task model.
    """
    list_display = ('title', 'project', 'get_owner', 'priority', 'status', 'deadline', 'created_at')
    list_filter = ('priority', 'status', 'deadline', 'created_at')
    search_fields = ('title', 'description', 'project__title', 'project__owner__username')
    date_hierarchy = 'deadline'
    ordering = ('deadline', '-created_at')
    fieldsets = (
        ('Task Details', {
            'fields': ('project', 'title', 'description')
        }),
        ('Status & Priority', {
            'fields': ('priority', 'status', 'deadline')
        }),
    )

    @admin.display(description='Project Owner', ordering='project__owner')
    def get_owner(self, obj):
        return obj.project.owner.username
