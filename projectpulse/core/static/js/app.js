/**
 * PROJECTPULSE - Client-side Vanilla JavaScript (app.js)
 * Student Project & Task Management Platform
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auto-dismiss Django Flash Alerts after 4.5 seconds
    const alerts = document.querySelectorAll('.alert');
    if (alerts.length > 0) {
        setTimeout(() => {
            alerts.forEach(alert => {
                alert.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                alert.style.opacity = '0';
                alert.style.transform = 'translateY(-8px)';
                setTimeout(() => alert.remove(), 400);
            });
        }, 4500);
    }

    // 2. Automatic form submission when task status dropdown changes
    const taskStatusSelects = document.querySelectorAll('.task-status-select');
    taskStatusSelects.forEach(select => {
        select.addEventListener('change', function() {
            if (this.form) {
                this.form.submit();
            }
        });
    });

    // 3. Confirm dialog for critical delete actions
    const deleteButtons = document.querySelectorAll('[data-confirm]');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const message = btn.getAttribute('data-confirm') || 'Are you sure you want to delete this item?';
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });
});
