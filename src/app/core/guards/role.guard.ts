import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, take, map } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const allowedRoles: UserRole[] = route.data['roles'] ?? [];

    return this.auth.isAuthenticated$.pipe(
      take(1),
      map(isAuth => {
        if (!isAuth) {
          this.router.navigate(['/auth/login']);
          return false;
        }
        if (!this.auth.hasRole(...allowedRoles)) {
          // Rediriger vers dashboard avec message
          this.router.navigate(['/dashboard'], {
            queryParams: { accesRefuse: true }
          });
          return false;
        }
        return true;
      })
    );
  }
}
