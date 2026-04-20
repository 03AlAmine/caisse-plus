import { Component, inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <div *ngIf="showSplash" class="splash-screen">
      <div class="splash-logo">
        <img src="assets/logo.png" alt="Caisse+" />
      </div>
      <div class="splash-spinner"></div>
    </div>
    <router-outlet *ngIf="!showSplash"></router-outlet>
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
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 24px;
        background: #0a1628;
      }
      .splash-logo {
        font-size: 48px;
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
      .splash-logo img {
        width: 94px;
        height: 94px;
        object-fit: contain;
      }
    `,
  ],
})
export class AppComponent {
  private auth = inject(AuthService);
  showSplash = true;

  constructor() {
    // Attendre la première réponse de Firebase Auth (null = en cours)
    this.auth.authReady$
      .pipe(
        filter((ready) => ready !== null),
        take(1),
      )
      .subscribe(() => {
        this.showSplash = false;
      });
  }
}
