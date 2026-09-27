# PROJECTPULSE
### Student Project & Task Management Platform

PROJECTPULSE is a production-ready, full-stack web application built using **Python**, **Django**, and **SQLite**. It provides students with a secure environment to manage coursework, capstones, and personal projects with automated progress tracking and overdue alerts.

---

## 🛠️ Technology Stack
- **Backend:** Python 3, Django 5.x
- **Database:** SQLite3 (standard relational engine)
- **Frontend:** Semantic HTML5, CSS3, Vanilla JavaScript (`app.js`)
- **Architecture:** Django MVT (Model-View-Template) with session-based authentication

---

## 📁 Exact Project Structure
```
projectpulse/
│
├── manage.py
│
├── projectpulse/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── core/
│   ├── migrations/
│   │   └── __init__.py
│   ├── templates/
│   │   ├── base.html
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── dashboard.html
│   │   ├── projects.html
│   │   ├── project_detail.html
│   │   ├── create_project.html
│   │   ├── edit_project.html
│   │   ├── edit_task.html
│   │   └── project_confirm_delete.html
│   │
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── app.js
│   │
│   ├── admin.py
│   ├── apps.py
│   ├── forms.py
│   ├── models.py
│   ├── urls.py
│   ├── views.py
│   └── tests.py
│
├── requirements.txt
└── README.md
```

---

## 🚀 Step-by-Step Local Setup & Execution Guide

### 1. Create and Activate Virtual Environment
**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Apply SQLite Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. (Optional) Create Django Superuser for Admin
```bash
python manage.py createsuperuser
```

### 5. Run the Automated Test Suite
```bash
python manage.py test
```

### 6. Start the Django Development Server
```bash
python manage.py runserver
```

Open your browser and navigate to:
**`http://127.0.0.1:8000/`**

---

## 🔒 Security & Data Privacy Features
- **Django Built-in Authentication:** Passwords securely hashed with PBKDF2/SHA-256.
- **CSRF Protection:** All mutating POST forms require `{% csrf_token %}`.
- **IDOR Safeguards:** All project/task views query with `owner=request.user` or `project__owner=request.user`. User A cannot access, edit, or delete User B's project by modifying the URL ID (Django raises `Http404`).
- **Dynamic SQLite Progress Calculation:** Project progress percentage is dynamically calculated as:
  $$\text{Progress} = \frac{\text{Completed Tasks}}{\text{Total Tasks}} \times 100$$
  *(Returns 0% when zero tasks exist).*
