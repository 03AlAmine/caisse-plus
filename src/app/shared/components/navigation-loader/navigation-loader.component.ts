import { Component, inject } from '@angular/core';
import { NavigationLoaderService } from '../../../services/navigation-loader.service';

@Component({
  selector: 'app-navigation-loader',
  template: `
    <div class="nav-loader-overlay" *ngIf="loader.loading$ | async" @fadeIn>
      <div class="nav-loader">
        <div class="nav-loader__spinner">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="17" stroke="var(--gray-200)" stroke-width="3"/>
            <path d="M20 3a17 17 0 0 1 17 17" stroke="var(--navy-600)" stroke-width="3" stroke-linecap="round">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 20 20"
                to="360 20 20"
                dur="0.8s"
                repeatCount="indefinite"/>
            </path>
          </svg>
        </div>
        <span class="nav-loader__text">Chargement...</span>
      </div>
    </div>
  `,
  styles: [`
    .nav-loader-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(11, 22, 41, 0.3);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.15s ease;
    }

    .nav-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      background: var(--color-white);
      border-radius: var(--radius-xl);
      padding: var(--space-8) var(--space-10);
      box-shadow: var(--shadow-xl);
      animation: scaleIn 0.2s ease;
    }

    .nav-loader__text {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--gray-500);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class NavigationLoaderComponent {
  loader = inject(NavigationLoaderService);
}
