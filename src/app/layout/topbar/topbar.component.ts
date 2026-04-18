import { Component, Output, EventEmitter, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, filter, take } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Input() isSidebarOpen = true;

  auth = inject(AuthService);
  private notifService = inject(NotificationService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  today = new Date();
  showUserMenu = false;
  showNotifications = false;
  notifications: Notification[] = [];
  private intervalId: any;
  private notifSub?: Subscription;

  get hasNotifications(): boolean {
    return this.notifications.some(n => !n.read);
  }

  get notificationsCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      this.today = new Date();
    }, 60000);

    // Charger les vraies notifications Firestore dès que le user est prêt
    this.auth.currentUser$
      .pipe(filter(user => user !== null && !!user.organisationId), take(1))
      .subscribe(() => {
        this.notifSub = this.notifService.getNotifications()
          .subscribe(notifs => this.notifications = notifs);
      });
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.notifSub?.unsubscribe();
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
    if (user.displayName?.length > 0) return user.displayName.charAt(0).toUpperCase();
    if (user.email?.length > 0) return user.email.charAt(0).toUpperCase();
    return 'U';
  }

  getUserDisplayName(user: any): string {
    if (!user) return 'Utilisateur';
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return 'Utilisateur';
  }

  getRoleLabel(role?: string): string {
    const roles: Record<string, string> = {
      admin: 'Administrateur',
      tresorier: 'Trésorier',
      auditeur: 'Auditeur',
      utilisateur: 'Utilisateur',
    };
    return roles[role || 'utilisateur'];
  }

  getNotifIcon(type: string): string {
    if (type === 'warning') return '⚠️';
    if (type === 'success') return '✓';
    return 'ℹ️';
  }

  toDate(val: any): Date {
    if (val instanceof Date) return val;
    return val?.toDate?.() ?? new Date();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) this.showNotifications = false;
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showUserMenu) this.showUserMenu = false;
  }

  async markAllAsRead(): Promise<void> {
    await this.notifService.markAllAsRead();
    this.toastr.info('Toutes les notifications ont été marquées comme lues');
    this.showNotifications = false;
  }

  async onNotifClick(notif: Notification): Promise<void> {
    if (!notif.read && notif.id) {
      await this.notifService.markAsRead(notif.id);
    }
  }

  closeMenus(): void {
    this.showUserMenu = false;
    this.showNotifications = false;
  }

  async onLogout(): Promise<void> {
    const confirmLogout = confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
    if (confirmLogout) {
      await this.auth.logout();
      this.toastr.success('Déconnecté avec succès');
      this.router.navigate(['/auth/login']);
    }
  }
}
