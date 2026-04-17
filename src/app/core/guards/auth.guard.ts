import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, take, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.auth.isAuthenticated$.pipe(
      take(1),
      tap(isAuth => {
        if (!isAuth) this.router.navigate(['/auth/login']);
      })
    );
  }
}
