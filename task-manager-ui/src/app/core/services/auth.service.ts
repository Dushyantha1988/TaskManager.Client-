import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginResponse } from '../../models/task.model';

const AUTH_KEY = 'task_manager_auth';

export interface StoredAuth {
  username: string;
  token: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authState$ = new BehaviorSubject<StoredAuth | null>(this.loadAuth());
  private refreshInProgress = false;

  constructor(private readonly http: HttpClient) {}

  get isAuthenticated$(): Observable<boolean> {
    return new Observable(subscriber => {
      const sub = this.authState$.subscribe(auth => subscriber.next(this.isRefreshTokenValid(auth)));
      return () => sub.unsubscribe();
    });
  }

  get session(): StoredAuth | null {
    const auth = this.authState$.value ?? this.loadAuth();
    return this.isRefreshTokenValid(auth) ? auth : null;
  }

  get username(): string | null {
    return this.session?.username ?? null;
  }

  get refreshToken(): string | null {
    return this.session?.refreshToken ?? null;
  }

  getAuthorizationHeader(): string | null {
    const auth = this.session ?? this.loadAuth();
    if (!auth?.token || !this.isRefreshTokenValid(auth)) {
      return null;
    }

    return `Bearer ${auth.token}`;
  }

  setSession(response: LoginResponse): void {
    const auth: StoredAuth = {
      username: response.username,
      token: response.token,
      expiresAt: response.expiresAt,
      refreshToken: response.refreshToken,
      refreshTokenExpiresAt: response.refreshTokenExpiresAt
    };
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    this.authState$.next(auth);
  }

  refreshSession(): Observable<boolean> {
    const auth = this.loadAuth();
    if (!auth?.refreshToken || !this.isRefreshTokenValid(auth) || this.refreshInProgress) {
      return of(false);
    }

    this.refreshInProgress = true;

    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/refresh`, {
      refreshToken: auth.refreshToken
    }).pipe(
      tap(response => this.setSession(response)),
      map(() => true),
      catchError(() => of(false)),
      tap(() => {
        this.refreshInProgress = false;
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem(AUTH_KEY);
    this.authState$.next(null);
  }

  private loadAuth(): StoredAuth | null {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as StoredAuth;
    } catch {
      sessionStorage.removeItem(AUTH_KEY);
      return null;
    }
  }

  private isRefreshTokenValid(auth: StoredAuth | null): boolean {
    if (!auth?.refreshToken || !auth.refreshTokenExpiresAt) {
      return false;
    }

    return new Date(auth.refreshTokenExpiresAt).getTime() > Date.now();
  }
}
