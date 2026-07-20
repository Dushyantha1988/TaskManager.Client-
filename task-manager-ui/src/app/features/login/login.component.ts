import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApiService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiError } from '../../models/task.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  isRegisterMode = false;
  isSubmitting = false;
  message = '';
  messageType: 'success' | 'error' = 'error';

  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly authApi: AuthApiService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.session) {
      this.router.navigate(['/tasks']);
    }
  }

  toggleMode(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.message = '';
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.message = '';

    const { username, password } = this.form.getRawValue();
    const request = { username: username!.trim(), password: password! };

    const action$ = this.isRegisterMode
      ? this.authApi.register(request)
      : this.authApi.login(request);

    action$.subscribe({
      next: response => {
        this.authService.setSession(response);
        this.showMessage(response.message, 'success');
        this.router.navigate(['/tasks']);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        const apiError = err.error as ApiError;
        this.showMessage(apiError?.message ?? 'Unable to authenticate. Please try again.', 'error');
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  private showMessage(text: string, type: 'success' | 'error'): void {
    this.message = text;
    this.messageType = type;
  }
}
