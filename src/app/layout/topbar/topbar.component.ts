import { Component, Output, EventEmitter, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

// Interface pour les notifications (à créer si nécessaire)
interface Notification {
  id?: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Input() isSidebarOpen = true;

  auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  today = new Date();
  showUserMenu = false;
  showNotifications = false;
  notifications: Notification[] = [];
  hasNotifications = false;
  notificationsCount = 0;
  private intervalId: any;

  ngOnInit(): void {
    // Mettre à jour l'heure toutes les minutes
    this.intervalId = setInterval(() => {
      this.today = new Date();
    }, 60000);

    // Simuler des notifications (à remplacer par un vrai service)
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  getUserInitial(): string {
    const user = this.auth.currentUser;
    if (!user) return '?';
    if (user.displayName && user.displayName.length > 0) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user.email && user.email.length > 0) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
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

  getRoleLabel(role?: string): string {
    const roles: Record<string, string> = {
      admin: 'Administrateur',
      tresorier: 'Trésorier',
      auditeur: 'Auditeur',
      utilisateur: 'Utilisateur'
    };
    return roles[role || 'utilisateur'];
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) {
      this.showNotifications = false;
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.showUserMenu = false;
      this.markAsRead();
    }
  }

  private loadNotifications(): void {
    // Simulation - à remplacer par un vrai service
    this.notifications = [];
    this.hasNotifications = false;
    this.notificationsCount = 0;
  }

  markAsRead(): void {
    this.hasNotifications = false;
    this.notificationsCount = 0;
    this.notifications.forEach(n => n.read = true);
  }

  markAllAsRead(): void {
    this.markAsRead();
    this.toastr.info('Toutes les notifications ont été marquées comme lues');
  }

  async onLogout(): Promise<void> {
    const confirmLogout = confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
    if (confirmLogout) {
      await this.auth.logout();
      this.toastr.success('Déconnecté avec succès');
      this.router.navigate(['/auth/login']);
    }
  }

  // Fermer les menus quand on clique ailleurs
  closeMenus(): void {
    this.showUserMenu = false;
    this.showNotifications = false;
  }
}
