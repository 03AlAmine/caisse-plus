import { Component, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent {
  sidebarOpen = true;
  isMobile = false;

  constructor(private router: Router) {
    this.checkMobile();

    // ✅ Fermer le sidebar sur mobile après chaque navigation
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
  /**
   * Appelé quand on clique sur un lien dans le sidebar
   * Ferme le sidebar sur mobile
   */
  onSidebarNavClick(): void {
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
  }
}
