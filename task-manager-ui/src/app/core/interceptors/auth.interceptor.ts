import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isPublicAuthRequest(req.url)) {
      return next.handle(req);
    }

    const authReq = this.attachToken(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401 || req.headers.has('X-Retry-After-Refresh')) {
          return throwError(() => error);
        }

        return this.authService.refreshSession().pipe(
          switchMap(success => {
            if (!success) {
              this.authService.logout();
              this.router.navigate(['/login']);
              return throwError(() => error);
            }

            const retryReq = this.attachToken(req).clone({
              setHeaders: { 'X-Retry-After-Refresh': 'true' }
            });

            return next.handle(retryReq);
          })
        );
      })
    );
  }

  private attachToken(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const authHeader = this.authService.getAuthorizationHeader();
    if (!authHeader) {
      return req;
    }

    return req.clone({
      setHeaders: { Authorization: authHeader }
    });
  }

  private isPublicAuthRequest(url: string): boolean {
    return url.includes('/auth/login')
      || url.includes('/auth/register')
      || url.includes('/auth/refresh');
  }
}
