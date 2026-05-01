import { Component, HostListener } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  trigger,
  transition,
  style,
  animate,
  query,
} from '@angular/animations';

// ─── Animation de page : fade + léger glissement vers le haut ───────────
export const routeAnimations = trigger('routeAnim', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate(
        '220ms cubic-bezier(0.4, 0, 0.2, 1)',
        style({ opacity: 1, transform: 'translateY(0)' })
      ),
    ], { optional: true }),
  ]),
]);

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  animations: [routeAnimations],
})
export class MainLayoutComponent {
  sidebarOpen = true;
  isMobile = false;

  constructor(private router: Router) {
    this.checkMobile();

    // Fermer le sidebar sur mobile après chaque navigation
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe(() => {
        if (this.isMobile) {
          this.sidebarOpen = false;
        }
      });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  onSidebarNavClick(): void {
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
  }

  // Fournit un état unique par route pour déclencher l'animation
  getRouteAnimState(outlet: RouterOutlet): string {
    if (!outlet?.isActivated) return '';
    try {
      return outlet.activatedRouteData?.['animation']
        ?? outlet.activatedRoute?.snapshot?.url?.[0]?.path
        ?? '';
    } catch {
      return '';
    }
  }
}
