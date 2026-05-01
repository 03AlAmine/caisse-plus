import { Component, inject } from '@angular/core';
import { ConnectivityService } from '../../../services/connectivity.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-offline-indicator',
  template: `
    <div class="offline-banner" *ngIf="!(connectivity.online$ | async)" @slideDown>
      <div class="offline-banner__content">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 2l12 12M10.5 10.5a3.5 3.5 0 0 0-5-5M5.5 5.5a3.5 3.5 0 0 0 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M1 1l14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Mode hors ligne — Les données seront synchronisées automatiquement</span>
      </div>
    </div>
  `,
  styles: [`
    .offline-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: var(--color-warning);
      color: white;
      padding: var(--space-2) var(--space-4);
      text-align: center;
    }

    .offline-banner__content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      font-weight: 600;
      max-width: 600px;
      margin: 0 auto;
    }

    @media (max-width: 500px) {
      .offline-banner__content {
        font-size: 11px;
      }
    }
  `],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(-100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class OfflineIndicatorComponent {
  connectivity = inject(ConnectivityService);
}
