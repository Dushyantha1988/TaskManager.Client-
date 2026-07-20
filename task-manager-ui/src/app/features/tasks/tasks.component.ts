import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { TaskService, AuthApiService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ApiError,
  TaskItem,
  TaskPriority,
  TaskQuery
} from '../../models/task.model';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  tasks: TaskItem[] = [];
  selectedTask: TaskItem | null = null;
  showNewTaskModal = false;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  readonly priorities = Object.values(TaskPriority);
  readonly sortOptions = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'title', label: 'Title' },
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'isCompleted', label: 'Status' }
  ];

  readonly filterForm = this.fb.group({
    search: [''],
    status: ['all'],
    priority: ['all'],
    sortBy: ['createdAt'],
    sortDirection: ['desc']
  });

  readonly newTaskForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', Validators.maxLength(2000)],
    priority: [TaskPriority.Medium, Validators.required],
    dueDate: ['']
  });

  readonly taskForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', Validators.maxLength(2000)],
    priority: [TaskPriority.Medium, Validators.required],
    dueDate: [''],
    isCompleted: [false]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly taskService: TaskService,
    private readonly authApi: AuthApiService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  get username(): string | null {
    return this.authService.username;
  }

  get userInitials(): string {
    return this.username?.slice(0, 2).toUpperCase() ?? '?';
  }

  get pendingCount(): number {
    return this.tasks.filter(t => !t.isCompleted).length;
  }

  get completedCount(): number {
    return this.tasks.filter(t => t.isCompleted).length;
  }

  isOverdue(task: TaskItem): boolean {
    if (!task.dueDate || task.isCompleted) {
      return false;
    }

    return new Date(task.dueDate).getTime() < Date.now();
  }

  loadTasks(): void {
    this.isLoading = true;
    const query = this.buildQuery();

    this.taskService.getTasks(query).subscribe({
      next: tasks => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showMessage('Failed to load tasks.', 'error');
      }
    });
  }

  selectTask(task: TaskItem): void {
    this.selectedTask = task;
    this.taskForm.patchValue({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '',
      isCompleted: task.isCompleted
    });
    this.message = '';
  }

  openNewTaskModal(): void {
    this.newTaskForm.reset({
      title: '',
      description: '',
      priority: TaskPriority.Medium,
      dueDate: ''
    });
    this.showNewTaskModal = true;
  }

  closeNewTaskModal(): void {
    this.showNewTaskModal = false;
    this.newTaskForm.reset();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showNewTaskModal) {
      this.closeNewTaskModal();
    }
  }

  clearSelection(): void {
    this.selectedTask = null;
    this.taskForm.reset({
      title: '',
      description: '',
      priority: TaskPriority.Medium,
      dueDate: '',
      isCompleted: false
    });
  }

  startNewTask(): void {
    this.openNewTaskModal();
  }

  saveTask(): void {
    if (this.taskForm.invalid || this.isSaving || !this.selectedTask) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.taskForm.getRawValue();
    const dueDate = formValue.dueDate ? new Date(formValue.dueDate!).toISOString() : undefined;

    this.taskService.updateTask(this.selectedTask.id, {
      title: formValue.title!.trim(),
      description: formValue.description?.trim() || undefined,
      priority: formValue.priority!,
      isCompleted: formValue.isCompleted ?? false,
      dueDate
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.showMessage('Task updated successfully.', 'success');
        this.loadTasks();
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  createTask(): void {
    if (this.newTaskForm.invalid || this.isSaving) {
      this.newTaskForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.newTaskForm.getRawValue();
    const dueDate = formValue.dueDate ? new Date(formValue.dueDate!).toISOString() : undefined;

    this.taskService.createTask({
      title: formValue.title!.trim(),
      description: formValue.description?.trim() || undefined,
      priority: formValue.priority!,
      dueDate
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.showMessage('Task created successfully.', 'success');
        this.closeNewTaskModal();
        this.loadTasks();
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  markComplete(task: TaskItem, event: Event): void {
    event.stopPropagation();

    if (task.isCompleted) {
      return;
    }

    this.taskService.markComplete(task.id).subscribe({
      next: () => {
        this.showMessage(`"${task.title}" marked as completed.`, 'success');
        this.loadTasks();
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  deleteTask(task: TaskItem, event: Event): void {
    event.stopPropagation();

    if (!confirm(`Delete task "${task.title}"?`)) {
      return;
    }

    this.taskService.deleteTask(task.id).subscribe({
      next: () => {
        if (this.selectedTask?.id === task.id) {
          this.clearSelection();
        }
        this.showMessage('Task deleted successfully.', 'success');
        this.loadTasks();
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  logout(): void {
    const refreshToken = this.authService.refreshToken;

    if (refreshToken) {
      this.authApi.logout({ refreshToken }).subscribe({
        complete: () => this.finishLogout()
      });
      return;
    }

    this.finishLogout();
  }

  private finishLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  priorityClass(priority: TaskPriority): string {
    return priority.toLowerCase();
  }

  private buildQuery(): TaskQuery {
    const filters = this.filterForm.getRawValue();
    const query: TaskQuery = {
      sortBy: filters.sortBy ?? 'createdAt',
      sortDirection: (filters.sortDirection as 'asc' | 'desc') ?? 'desc'
    };

    if (filters.search?.trim()) {
      query.search = filters.search.trim();
    }

    if (filters.status === 'completed') {
      query.isCompleted = true;
    } else if (filters.status === 'pending') {
      query.isCompleted = false;
    }

    if (filters.priority && filters.priority !== 'all') {
      query.priority = filters.priority as TaskPriority;
    }

    return query;
  }

  private handleError(err: HttpErrorResponse): void {
    this.isSaving = false;
    const apiError = err.error as ApiError;
    this.showMessage(apiError?.message ?? 'An error occurred. Please try again.', 'error');
  }

  private showMessage(text: string, type: 'success' | 'error'): void {
    this.message = text;
    this.messageType = type;
    setTimeout(() => {
      if (this.message === text) {
        this.message = '';
      }
    }, 4500);
  }
}
