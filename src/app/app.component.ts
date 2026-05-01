import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  Router,
  NavigationEnd,
  NavigationStart,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { AuthService } from './services/auth.service';
import { NavigationLoaderService } from './services/navigation-loader.service';
import { PreferencesService } from './services/preferences.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <app-offline-indicator></app-offline-indicator>

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
export class AppComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private navigationLoader = inject(NavigationLoaderService);
  private prefsService = inject(PreferencesService);

  showSplash = true;
  showWelcomeModal = false;
  welcomeUserName = '';

  private loaderTimer: any = null;
  private readonly LOADER_DELAY = 200;
  private firstCheckDone = false;

  // Idle watcher
  private idleInterval: any = null;
  private lastActivity = Date.now();
  private sessionTimeoutMinutes = 0; // 0 = jamais, chargé depuis Firestore

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

        if (!this.firstCheckDone) {
          this.firstCheckDone = true;
        } else {
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
          setTimeout(() => {
            this.checkFirstLogin();
          }, 1000);

          // Démarrer le watcher d'inactivité seulement si l'utilisateur est connecté
          this.startIdleWatcher();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.idleInterval) {
      clearInterval(this.idleInterval);
      this.idleInterval = null;
    }
  }

  // ─── Idle watcher ──────────────────────────────────────────────────────────

  private async startIdleWatcher(): Promise<void> {
    // Charger le sessionTimeout depuis Firestore une seule fois
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      const prefs = await this.prefsService.getUserPreferences(uid);
      this.sessionTimeoutMinutes = prefs.sessionTimeout ?? 0;
    } catch {
      // En cas d'erreur, pas de timeout automatique
      this.sessionTimeoutMinutes = 0;
    }

    // Écouter l'activité utilisateur
    ['click', 'keydown', 'touchstart', 'mousemove'].forEach((eventName) => {
      document.addEventListener(eventName, () => {
        this.lastActivity = Date.now();
      });
    });

    // Vérifier toutes les minutes
    this.idleInterval = setInterval(() => {
      // Ne rien faire si pas connecté ou timeout désactivé
      if (!this.auth.currentUser) return;
      if (this.sessionTimeoutMinutes <= 0) return;

      const inactiveMs = Date.now() - this.lastActivity;
      const inactiveMinutes = inactiveMs / (1000 * 60);

      if (inactiveMinutes >= this.sessionTimeoutMinutes) {
        this.auth.logout();
      }
    }, 60_000);
  }

  // ─── Login / Welcome ───────────────────────────────────────────────────────

  private checkFirstLogin(): void {
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
