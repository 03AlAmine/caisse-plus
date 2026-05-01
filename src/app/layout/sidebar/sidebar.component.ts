import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { VocabulaireService } from '../../services/vocabulaire.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = true;
  @Output() toggleRequest = new EventEmitter<void>();
  @Output() navClick = new EventEmitter<void>();

  auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private vocabulaireService = inject(VocabulaireService);
  private routerSubscription?: Subscription;
  currentRoute: string = '';

  navSections: NavSection[] = [
    {
      label: 'PRINCIPAL',
      items: [
        { label: 'Tableau de bord', icon: 'dashboard', route: '/dashboard' },
        { label: 'Caisses', icon: 'caisses', route: '/caisses' },
        { label: 'Opérations', icon: 'operations', route: '/operations' },
      ],
    },
    {
      label: 'GESTION',
      items: [
        { label: 'Budgets', icon: 'budgets', route: '/budgets' },
        { label: 'Rapports', icon: 'rapports', route: '/rapports' },
      ],
    },
    {
      label: 'ADMINISTRATION',
      items: [
        {
          label: 'Paramètres',
          icon: 'parametres',
          route: '/parametres',
          roles: ['admin'],
        },
      ],
    },
    {
      label: 'SUPER ADMIN',
      items: [
        {
          label: 'Administration',
          icon: '🛡️',
          route: '/super-admin',
          roles: ['superadmin'],
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.currentRoute = this.router.url;

    this.routerSubscription = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects || event.url;
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  get visibleSections(): NavSection[] {
    const transfertActif =
      this.vocabulaireService.comportement?.transfertActif ?? true;

    return this.navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          // Filtre par rôle
          const roleOk =
            !item.roles || item.roles.some((r) => this.auth.hasRole(r as any));

          if (item.route === '/operations/transfert' && !transfertActif)
            return false;
          if (
            item.route === '/budgets' &&
            !(this.vocabulaireService.comportement?.budgetParCategorie ?? true)
          )
            return false;

          return roleOk;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }

  getUserInitial(user: any): string {
    if (!user) return '?';
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }

  getUserColor(user: any): string {
    const colors = [
      'linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)',
      'linear-gradient(135deg, #059669 0%, #047857 100%)',
      'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
      'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    ];
    const index = user?.uid?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  }

  getRoleLabel(role: string): string {
    const roles: Record<string, string> = {
      admin: 'Administrateur',
      tresorier: 'Trésorier',
      auditeur: 'Auditeur',
      utilisateur: 'Utilisateur',
    };
    return roles[role] || role;
  }

  getUserDisplayName(user: any): string {
    if (!user) return 'Utilisateur';
    if (user.displayName) return user.displayName.split(' ')[0];
    if (user.email) return user.email.split('@')[0];
    return 'Utilisateur';
  }

  isActive(route: string): boolean {
    if (route === '/dashboard') {
      return this.currentRoute === '/dashboard' || this.currentRoute === '/';
    }
    return this.currentRoute.startsWith(route);
  }

  onNavItemClick(): void {
    this.navClick.emit();
  }

  async onLogout(): Promise<void> {
    const confirmLogout = confirm(
      'Êtes-vous sûr de vouloir vous déconnecter ?',
    );
    if (confirmLogout) {
      await this.auth.logout();
      this.toastr.success('Déconnecté avec succès');
      this.router.navigate(['/auth/login']);
    }
  }
}
