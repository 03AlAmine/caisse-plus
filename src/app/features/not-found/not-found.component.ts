import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-not-found',
  template: `
    <div class="nf-wrapper">
      <div class="nf-card">
        <div class="nf-icon">🔍</div>
        <h1 class="nf-code">404</h1>
        <h2 class="nf-title">Page introuvable</h2>
        <p class="nf-desc">Cette page n'existe pas ou vous n'avez pas les droits pour y accéder.</p>
        <div class="nf-actions">
          <button class="btn btn--primary" (click)="goHome()">🏠 Retour à l'accueil</button>
          <button class="btn btn--outline" (click)="goBack()">← Retour</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nf-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--color-background-tertiary); padding: 24px; }
    .nf-card { background: var(--color-background-primary); border: 1px solid var(--color-border-tertiary); border-radius: 16px; padding: 48px 40px; text-align: center; max-width: 420px; width: 100%; }
    .nf-icon { font-size: 48px; margin-bottom: 16px; }
    .nf-code { font-size: 72px; font-weight: 700; color: var(--color-text-primary); margin: 0 0 8px; line-height: 1; }
    .nf-title { font-size: 20px; font-weight: 500; color: var(--color-text-primary); margin: 0 0 12px; }
    .nf-desc { font-size: 14px; color: var(--color-text-secondary); margin: 0 0 32px; line-height: 1.6; }
    .nf-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: opacity 0.15s; }
    .btn:hover { opacity: 0.85; }
    .btn--primary { background: #0A1628; color: #fff; }
    .btn--outline { background: transparent; border: 1px solid var(--color-border-primary); color: var(--color-text-primary); }
  `]
})
export class NotFoundComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  goHome(): void {
    this.router.navigate([this.auth.currentUser ? '/dashboard' : '/auth/login']);
  }

  goBack(): void {
    window.history.back();
  }
}
