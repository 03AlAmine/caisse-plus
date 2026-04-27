import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { VocabulaireService } from '../../../services/vocabulaire.service';
import { VocabulaireMetier } from '../../../models/templates.data';

interface MobileNavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-mobile-nav',
  template: `
    <nav class="mobile-nav" *ngIf="visible">
      <a
        *ngFor="let item of items"
        [routerLink]="item.route"
        class="mobile-nav__item"
        [class.mobile-nav__item--active]="isActive(item.route)"
        (click)="$event.stopPropagation()"
      >
        <span class="mobile-nav__icon">
          <ng-container [ngSwitch]="item.icon">
            <svg *ngSwitchCase="'dashboard'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
              <rect x="14" y="2" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
              <rect x="2" y="14" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
              <rect x="14" y="14" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <svg *ngSwitchCase="'operations'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <svg *ngSwitchCase="'caisses'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="8" width="18" height="13" rx="2.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="12" cy="14.5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <svg *ngSwitchCase="'rapports'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <svg *ngSwitchCase="'plus'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.9"/>
              <path d="M12 7v10M7 12h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg *ngSwitchDefault width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
              <path d="M12 1v3M12 20v3M1 12h3M20 12h3M3.5 3.5l2 2M18.5 18.5l2 2M20.5 3.5l-2 2M5.5 18.5l-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </ng-container>
        </span>
        <span class="mobile-nav__label">{{ item.label }}</span>
        <span class="mobile-nav__badge" *ngIf="item.badge">{{ item.badge }}</span>
      </a>
    </nav>
  `,
  styles: [`
    .mobile-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: var(--color-white);
      border-top: 1px solid var(--border-color);
      z-index: 500;
      padding: 0 var(--space-1);
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    @media (max-width: 768px) {
      .mobile-nav {
        display: flex;
        align-items: center;
        justify-content: space-around;
      }
    }

    .mobile-nav__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      flex: 1;
      height: 100%;
      padding: var(--space-1) var(--space-2);
      text-decoration: none;
      color: var(--gray-400);
      position: relative;
      transition: color var(--duration-fast);
      -webkit-tap-highlight-color: transparent;
    }

    .mobile-nav__item:active {
      transform: scale(0.95);
    }

    .mobile-nav__item--active {
      color: var(--navy-600);
    }

    .mobile-nav__item--active .mobile-nav__label {
      font-weight: 700;
    }

    .mobile-nav__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 26px;
    }

    .mobile-nav__label {
      font-size: 10px;
      font-weight: 500;
      white-space: nowrap;
    }

    .mobile-nav__badge {
      position: absolute;
      top: 4px;
      right: 50%;
      transform: translateX(12px);
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: var(--color-danger);
      color: white;
      font-size: 9px;
      font-weight: 700;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class MobileNavComponent {
  private router = inject(Router);
  private vocabulaireService = inject(VocabulaireService);

  visible = true;
  currentRoute = '';

  get v(): VocabulaireMetier {
    return this.vocabulaireService.vocabulaire;
  }

  items: MobileNavItem[] = [];

  constructor() {
    this.initItems();
    // ✅ Correction : type predicate dans le filter
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects || event.url;
      });
  }

  private initItems(): void {
    this.vocabulaireService.loadVocabulaire().then(() => {
      this.items = [
        { label: 'Accueil', icon: 'dashboard', route: '/dashboard' },
        { label: this.v.entreePluriel || 'Opérations', icon: 'operations', route: '/operations' },
        { label: '', icon: 'plus', route: '/operations/nouveau' },
        { label: 'Caisses', icon: 'caisses', route: '/caisses' },
        { label: 'Plus', icon: 'settings', route: '/parametres' },
      ];
    });
  }

  isActive(route: string): boolean {
    if (route === '/dashboard') {
      return this.currentRoute === '/dashboard' || this.currentRoute === '/';
    }
    return this.currentRoute.startsWith(route);
  }
}
