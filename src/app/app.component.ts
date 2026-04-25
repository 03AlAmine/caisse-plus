import { Component, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
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

    <!-- Modal de bienvenue (première connexion) — TOUJOURS en dehors du router-outlet -->
    <app-welcome-modal
      *ngIf="showWelcomeModal"
      [userName]="welcomeUserName"
      (close)="closeWelcomeModal()"
      (completeProfile)="goToOrganisation()"
      (goToDashboard)="goToDashboard()">
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
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  showSplash = true;
  showWelcomeModal = false;
  welcomeUserName = '';

  ngOnInit(): void {
    // Attendre la première réponse de Firebase Auth
    this.auth.authReady$
      .pipe(
        filter((ready) => ready !== null),
        take(1),
      )
      .subscribe((ready) => {
        this.showSplash = false;

        // Si l'utilisateur est connecté, attendre que la navigation soit terminée
        if (ready) {
          this.router.events
            .pipe(
              filter((event) => event instanceof NavigationEnd),
              take(1),
            )
            .subscribe(() => {
              // Petit délai pour que la page soit complètement rendue
              setTimeout(() => {
                this.checkFirstLogin();
              }, 1000);
            });
        }
      });
  }

  /**
   * Vérifie si c'est la première connexion et affiche le modal de bienvenue
   */
  private checkFirstLogin(): void {
    const hasSeenWelcome = localStorage.getItem('caisseplus_welcome_seen');

    if (!hasSeenWelcome) {
      const user = this.auth.currentUser;

      if (user) {
        // Marquer comme vu pour ne pas réafficher
        localStorage.setItem('caisseplus_welcome_seen', 'true');

        this.welcomeUserName = user.displayName || user.email?.split('@')[0] || '';
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
