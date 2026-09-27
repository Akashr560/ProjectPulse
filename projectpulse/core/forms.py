from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import Project, Task


class StudentRegistrationForm(UserCreationForm):
    """
    Registration form utilizing Django's UserCreationForm.
    Securely hashes passwords, enforces password confirmation and uniqueness.
    """
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-input',
            'placeholder': 'student@university.edu'
        })
    )
    first_name = forms.CharField(
        max_length=50,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'First name'
        })
    )
    last_name = forms.CharField(
        max_length=50,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Last name'
        })
    )

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'email', 'first_name', 'last_name')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({
            'class': 'form-input',
            'placeholder': 'Choose unique username',
            'autofocus': True
        })
        if 'password1' in self.fields:
            self.fields['password1'].widget.attrs.update({
                'class': 'form-input',
                'placeholder': 'Create strong password'
            })
        if 'password2' in self.fields:
            self.fields['password2'].widget.attrs.update({
                'class': 'form-input',
                'placeholder': 'Confirm your password'
            })


class StudentLoginForm(AuthenticationForm):
    """
    Authentication form utilizing Django's AuthenticationForm.
    """
    username = forms.CharField(
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Enter your username',
            'autofocus': True
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': 'Enter your password'
        })
    )

    error_messages = {
        'invalid_login': "Invalid username or password. Please verify your credentials and try again.",
        'inactive': "This student account is currently inactive.",
    }


class ProjectForm(forms.ModelForm):
    """
    ModelForm for creating and editing projects.
    """
    class Meta:
        model = Project
        fields = ['title', 'description', 'status', 'start_date', 'deadline']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'e.g. CS402 Operating Systems Lab',
                'required': True
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-textarea',
                'rows': 4,
                'placeholder': 'Outline the scope, deliverables, and objectives of this project...'
            }),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'start_date': forms.DateInput(attrs={'class': 'form-input', 'type': 'date'}),
            'deadline': forms.DateInput(attrs={'class': 'form-input', 'type': 'date'}),
        }

    def clean_title(self):
        title = self.cleaned_data.get('title', '').strip()
        if not title:
            raise forms.ValidationError("Project title is required.")
        return title

    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        deadline = cleaned_data.get('deadline')

        if start_date and deadline and deadline < start_date:
            self.add_error('deadline', "Deadline cannot be earlier than the project start date.")

        return cleaned_data


class TaskForm(forms.ModelForm):
    """
    ModelForm for creating and editing tasks inside a project.
    """
    class Meta:
        model = Task
        fields = ['title', 'description', 'priority', 'status', 'deadline']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'e.g. Implement CPU scheduler algorithm',
                'required': True
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-textarea',
                'rows': 3,
                'placeholder': 'Task steps, notes, or acceptance criteria...'
            }),
            'priority': forms.Select(attrs={'class': 'form-select'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'deadline': forms.DateInput(attrs={'class': 'form-input', 'type': 'date'}),
        }

    def clean_title(self):
        title = self.cleaned_data.get('title', '').strip()
        if not title:
            raise forms.ValidationError("Task title is required.")
        return title
