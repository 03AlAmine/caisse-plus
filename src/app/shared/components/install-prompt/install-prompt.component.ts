import { Component, OnInit } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-install-prompt',
  template: `
    <div class="install-banner animate-slide-up" *ngIf="showPrompt">
      <button class="install-banner__close" (click)="dismiss()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>

      <div class="install-banner__content">
        <div class="install-banner__icon">
          <img src="assets/logo.png" alt="CAISSE+" />
        </div>
        <div class="install-banner__text">
          <strong>Installer CAISSE+</strong>
          <span>Accédez rapidement, même hors connexion</span>
        </div>
      </div>

      <button class="install-banner__btn" (click)="install()">
        Installer
      </button>
    </div>
  `,
  styles: [`
    .install-banner {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 420px;
      width: calc(100% - 32px);
      background: var(--color-white);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      padding: var(--space-4);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      z-index: 800;
    }

    .install-banner__close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gray-50);
      border: 1px solid var(--gray-100);
      border-radius: var(--radius-sm);
      color: var(--gray-400);
      cursor: pointer;
    }

    .install-banner__close:hover {
      background: var(--gray-100);
      color: var(--gray-600);
    }

    .install-banner__content {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex: 1;
    }

    .install-banner__icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: var(--navy-50);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .install-banner__icon img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    .install-banner__text strong {
      display: block;
      font-size: var(--text-sm);
      color: var(--navy-800);
      margin-bottom: 2px;
    }

    .install-banner__text span {
      font-size: var(--text-xs);
      color: var(--gray-500);
    }

    .install-banner__btn {
      padding: var(--space-2) var(--space-4);
      background: var(--navy-800);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background var(--duration-fast);
    }

    .install-banner__btn:hover {
      background: var(--navy-700);
    }

    @media (max-width: 500px) {
      .install-banner {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
      }

      .install-banner__content {
        flex-direction: column;
      }

      .install-banner__btn {
        width: 100%;
      }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    .animate-slide-up {
      animation: slideUp 0.3s var(--ease-out);
    }
  `]
})
export class InstallPromptComponent implements OnInit {
  showPrompt = false;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  ngOnInit(): void {
    // Vérifier si déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.showPrompt = false;
      return;
    }

    // Vérifier si l'utilisateur a déjà refusé
    const dismissed = localStorage.getItem('install_prompt_dismissed');
    if (dismissed) {
      return;
    }

    // Écouter l'événement beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      // Afficher après un petit délai
      setTimeout(() => {
        this.showPrompt = true;
      }, 2000);
    });

    // Écouter l'événement appinstalled
    window.addEventListener('appinstalled', () => {
      this.showPrompt = false;
      localStorage.setItem('install_prompt_dismissed', 'true');
    });
  }

  async install(): Promise<void> {
    if (!this.deferredPrompt) return;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      this.showPrompt = false;
      localStorage.setItem('install_prompt_dismissed', 'true');
    }

    this.deferredPrompt = null;
  }

  dismiss(): void {
    this.showPrompt = false;
    localStorage.setItem('install_prompt_dismissed', 'true');
  }
}
