import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-welcome-modal',
  template: `
    <div class="modal-overlay welcome-overlay" (click)="close.emit()">
      <div class="welcome-modal" (click)="$event.stopPropagation()">

        <!-- Partie supérieure avec dégradé -->
        <div class="welcome-modal__hero">
          <div class="welcome-modal__logo">
            <img src="assets/logo.png" alt="Caisse+" />
          </div>
          <div class="welcome-modal__brand">
            <span class="welcome-modal__brand-name">CAISSE<span>+</span></span>
          </div>

          <!-- Confettis / décorations -->
          <div class="welcome-modal__confetti">
            <span *ngFor="let i of [1,2,3,4,5,6,7,8]" class="confetti-dot confetti-dot--{{ i }}"></span>
          </div>
        </div>

        <!-- Partie contenu -->
        <div class="welcome-modal__body">
          <h2>
            Bienvenue
            <span class="welcome-modal__name">{{ userName }}</span> !
          </h2>
          <p class="welcome-modal__subtitle">
            Votre compte est prêt. Vous faites maintenant partie de la communauté <strong>CAISSE+</strong>.
          </p>

          <div class="welcome-modal__steps">
            <h3>Pour bien démarrer :</h3>

            <div class="welcome-step">
              <div class="welcome-step__icon welcome-step__icon--1">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="5" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M7 5V3M13 5V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="welcome-step__text">
                <strong>Complétez votre profil</strong>
                <span>Ajoutez la description, l'adresse et les contacts de votre organisation</span>
              </div>
            </div>

            <div class="welcome-step">
              <div class="welcome-step__icon welcome-step__icon--2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 17V3M3 10l7-7 7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="welcome-step__text">
                <strong>Créez votre première opération</strong>
                <span>Enregistrez une entrée ou une sortie d'argent</span>
              </div>
            </div>

            <div class="welcome-step">
              <div class="welcome-step__icon welcome-step__icon--3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="welcome-step__text">
                <strong>Explorez le tableau de bord</strong>
                <span>Suivez vos finances en temps réel avec les graphiques</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="welcome-modal__footer">
          <button class="btn btn--primary btn--lg" (click)="onCompleteProfile()">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 10L10 2L12 4L4 12L1 13L2 10Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            Compléter mon profil
          </button>
          <button class="btn btn--ghost" (click)="onGoToDashboard()">
            Aller au tableau de bord
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .welcome-overlay {
      z-index: 2000;
      background: rgba(11, 22, 41, 0.7);
      animation: fadeIn 0.2s ease;
    }

    .welcome-modal {
      background: var(--color-white);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-xl);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.4s var(--ease-out);
    }

    /* ─── Hero ──────────────────────────────────────────── */
    .welcome-modal__hero {
      background: linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 100%);
      padding: var(--space-8) var(--space-6) var(--space-6);
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .welcome-modal__logo {
      width: 64px;
      height: 64px;
      margin: 0 auto var(--space-3);
      border-radius: var(--radius-xl);
      overflow: hidden;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .welcome-modal__logo img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }

    .welcome-modal__brand-name {
      font-size: var(--text-2xl);
      font-weight: 800;
      color: var(--color-white);
      letter-spacing: -0.03em;
    }

    .welcome-modal__brand-name span {
      color: var(--navy-400);
    }

    /* ─── Confettis ─────────────────────────────────────── */
    .welcome-modal__confetti {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }

    .confetti-dot {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      animation: confettiFall 3s ease-in-out infinite;
    }

    .confetti-dot--1 { background: #10B981; left: 10%; top: -10px; animation-delay: 0s; }
    .confetti-dot--2 { background: #3B82F6; left: 25%; top: -10px; animation-delay: 0.3s; }
    .confetti-dot--3 { background: #F59E0B; left: 40%; top: -10px; animation-delay: 0.6s; }
    .confetti-dot--4 { background: #EC4899; left: 55%; top: -10px; animation-delay: 0.9s; }
    .confetti-dot--5 { background: #7C3AED; left: 70%; top: -10px; animation-delay: 1.2s; }
    .confetti-dot--6 { background: #0EA5E9; left: 85%; top: -10px; animation-delay: 1.5s; }
    .confetti-dot--7 { background: #10B981; left: 15%; top: -10px; animation-delay: 1.8s; }
    .confetti-dot--8 { background: #F59E0B; left: 60%; top: -10px; animation-delay: 2.1s; }

    @keyframes confettiFall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(200px) rotate(720deg); opacity: 0; }
    }

    /* ─── Body ──────────────────────────────────────────── */
    .welcome-modal__body {
      padding: var(--space-6);
      text-align: center;
    }

    .welcome-modal__body h2 {
      font-size: var(--text-xl);
      font-weight: 700;
      color: var(--navy-900);
      margin: 0 0 var(--space-1);
    }

    .welcome-modal__name {
      color: var(--navy-600);
    }

    .welcome-modal__subtitle {
      font-size: var(--text-sm);
      color: var(--gray-500);
      margin: 0 0 var(--space-5);
      line-height: 1.5;
    }

    .welcome-modal__steps {
      text-align: left;
      background: var(--gray-50);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
    }

    .welcome-modal__steps h3 {
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--gray-400);
      margin: 0 0 var(--space-3);
    }

    .welcome-step {
      display: flex;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
      align-items: flex-start;
    }

    .welcome-step:last-child {
      margin-bottom: 0;
    }

    .welcome-step__icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .welcome-step__icon--1 {
      background: #D1FAE5;
      color: #059669;
    }
    .welcome-step__icon--2 {
      background: #DBEAFE;
      color: #2563EB;
    }
    .welcome-step__icon--3 {
      background: #EDE9FE;
      color: #7C3AED;
    }

    .welcome-step__text {
      flex: 1;
      padding-top: 2px;
    }

    .welcome-step__text strong {
      display: block;
      font-size: var(--text-sm);
      color: var(--gray-800);
      margin-bottom: 1px;
    }

    .welcome-step__text span {
      font-size: var(--text-xs);
      color: var(--gray-400);
    }

    /* ─── Footer ────────────────────────────────────────── */
    .welcome-modal__footer {
      padding: var(--space-4) var(--space-6) var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      border-top: 1px solid var(--gray-100);
      background: var(--gray-50);
    }

    .welcome-modal__footer .btn {
      width: 100%;
    }

    @media (max-width: 500px) {
      .welcome-modal {
        margin: var(--space-4);
      }
    }
  `]
})
export class WelcomeModalComponent {
  @Input() userName: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() completeProfile = new EventEmitter<void>();
  @Output() goToDashboard = new EventEmitter<void>();

  onCompleteProfile(): void {
    this.completeProfile.emit();
    this.close.emit();
  }

  onGoToDashboard(): void {
    this.goToDashboard.emit();
    this.close.emit();
  }
}
