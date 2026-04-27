import { Component, inject, OnInit } from '@angular/core';
import {
  Router,
  NavigationEnd,
  NavigationStart,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { AuthService } from './services/auth.service';
import { NavigationLoaderService } from './services/navigation-loader.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <!-- Splash screen -->
    <div *ngIf="showSplash" class="splash-screen">
      <div class="splash-logo">
        <img src="assets/logo.png" alt="Caisse+" />
      </div>
      <div class="splash-spinner"></div>
    </div>

    <!-- Application -->
    <ng-container *ngIf="!showSplash">
      <router-outlet></router-outlet>
    </ng-container>

    <!-- Loader de navigation (caché pendant le splash) -->
    <ng-container *ngIf="!showSplash">
      <app-navigation-loader></app-navigation-loader>
    </ng-container>

    <!-- Modal de bienvenue -->
    <app-welcome-modal
      *ngIf="showWelcomeModal"
      [userName]="welcomeUserName"
      (close)="closeWelcomeModal()"
      (completeProfile)="goToOrganisation()"
      (goToDashboard)="goToDashboard()"
    >
    </app-welcome-modal>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
      .splash-screen {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 24px;
        background: #0a1628;
      }
      .splash-logo img {
        width: 94px;
        height: 94px;
        object-fit: contain;
      }
      .splash-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(255, 255, 255, 0.15);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private navigationLoader = inject(NavigationLoaderService);

  showSplash = true;
  showWelcomeModal = false;
  welcomeUserName = '';

  private loaderTimer: any = null;
  private readonly LOADER_DELAY = 200;
  private firstCheckDone = false;

  constructor() {
    this.router.events.subscribe((event) => {
      if (this.showSplash) return;

      if (event instanceof NavigationStart) {
        this.loaderTimer = setTimeout(() => {
          this.navigationLoader.show();
        }, this.LOADER_DELAY);
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (this.loaderTimer) {
          clearTimeout(this.loaderTimer);
          this.loaderTimer = null;
        }
        this.navigationLoader.hide();

        // ✅ Vérifier le modal de bienvenue après CHAQUE navigation
        if (!this.firstCheckDone) {
          this.firstCheckDone = true;
          // Déjà fait dans ngOnInit, ne pas refaire
        } else {
          // Pour les navigations suivantes, on vérifie quand même
          this.checkFirstLogin();
        }
      }
    });
  }

  ngOnInit(): void {
    this.auth.authReady$
      .pipe(
        filter((ready) => ready !== null),
        take(1),
      )
      .subscribe((ready) => {
        this.showSplash = false;
        this.firstCheckDone = true;

        if (ready) {
          // Vérifier après le premier rendu
          setTimeout(() => {
            this.checkFirstLogin();
          }, 1000);
        }
      });
  }

  private checkFirstLogin(): void {
    // ✅ Ne pas vérifier si le modal est déjà ouvert
    if (this.showWelcomeModal) return;

    const hasSeenWelcome = localStorage.getItem('caisseplus_welcome_seen');

    if (!hasSeenWelcome) {
      const user = this.auth.currentUser;

      if (user) {
        localStorage.setItem('caisseplus_welcome_seen', 'true');
        this.welcomeUserName =
          user.displayName || user.email?.split('@')[0] || '';
        this.showWelcomeModal = true;
      }
    }
  }

  closeWelcomeModal(): void {
    this.showWelcomeModal = false;
  }

  goToOrganisation(): void {
    this.showWelcomeModal = false;
    this.router.navigate(['/parametres/organisation']);
  }

  goToDashboard(): void {
    this.showWelcomeModal = false;
    this.router.navigate(['/dashboard']);
  }
}
