import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

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
export class SidebarComponent {
  @Input() isOpen = true;

  auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  navSections: NavSection[] = [
    {
      label: 'PRINCIPAL',
      items: [
        { label: 'Tableau de bord', icon: '📊', route: '/dashboard' },
        { label: 'Caisses', icon: '🏦', route: '/caisses' },
        { label: 'Opérations', icon: '💸', route: '/operations' },
      ],
    },
    {
      label: 'GESTION',
      items: [
        { label: 'Budgets', icon: '📈', route: '/budgets' },
        { label: 'Rapports', icon: '📋', route: '/rapports' },
      ],
    },
    {
      label: 'ADMINISTRATION',
      items: [
        {
          label: 'Paramètres',
          icon: '⚙️',
          route: '/parametres',
          roles: ['admin'],
        },
      ],
    },
  ];

  get visibleSections(): NavSection[] {
    return this.navSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            !item.roles || item.roles.some((r) => this.auth.hasRole(r as any)),
        ),
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
      'linear-gradient(135deg, #F4A623 0%, #C8851A 100%)',
      'linear-gradient(135deg, #00A86B 0%, #007A4D 100%)',
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

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  toggleUserOptions(): void {
    // Optionnel: ouvrir un modal ou dropdown
  }
  getUserDisplayName(user: any): string {
    if (!user) return 'Utilisateur';
    if (user.displayName) {
      const firstName = user.displayName.split(' ')[0];
      return firstName;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Utilisateur';
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
