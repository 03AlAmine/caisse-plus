import { Component, Output, EventEmitter, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, filter, take } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { SearchService, ResultatsGroupes, ResultatRecherche } from '../../services/search.service';
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
  private toastr       = inject(ToastrService);
  private searchService = inject(SearchService);

  today = new Date();
  showUserMenu = false;
  showNotifications = false;
  notifications: Notification[] = [];
  private intervalId: any;
  private notifSub?: Subscription;

  // ── Recherche globale ────────────────────────────────────────────────────
  searchQuery     = '';
  showSearch      = false;
  searchLoading   = false;
  searchResultats: ResultatsGroupes | null = null;
  private searchTimer: any;

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
    // Marquer comme lu
    if (!notif.read && notif.id) {
      await this.notifService.markAsRead(notif.id);
    }
    // Naviguer vers la ressource si un lien est défini
    if (notif.link) {
      this.showNotifications = false;
      this.router.navigateByUrl(notif.link);
    }
  }

  async deleteNotif(event: Event, notif: Notification): Promise<void> {
    event.stopPropagation(); // ne pas déclencher onNotifClick
    if (notif.id) {
      await this.notifService.delete(notif.id);
    }
  }

  async deleteAll(): Promise<void> {
    await this.notifService.deleteAll();
    this.showNotifications = false;
  }

  getNotifIcon(type: string): string {
    if (type === 'warning') return '⚠️';
    if (type === 'success') return '✅';
    if (type === 'error')   return '❌';
    return 'ℹ️';
  }

  // ── Méthodes de recherche ────────────────────────────────────────────────

  onSearchInput(): void {
    clearTimeout(this.searchTimer);
    if (!this.searchQuery.trim()) {
      this.searchResultats = null;
      this.showSearch = false;
      return;
    }
    this.showSearch   = true;
    this.searchLoading = true;
    // Debounce 350ms pour éviter une requête à chaque frappe
    this.searchTimer = setTimeout(async () => {
      try {
        this.searchResultats = await this.searchService.rechercher(this.searchQuery);
      } finally {
        this.searchLoading = false;
      }
    }, 350);
  }

  onSearchFocus(): void {
    if (this.searchQuery.trim().length >= 2) {
      this.showSearch = true;
    }
    this.showUserMenu      = false;
    this.showNotifications = false;
  }

  closeSearch(): void {
    this.showSearch  = false;
    this.searchQuery = '';
    this.searchResultats = null;
  }

  naviguerVers(resultat: ResultatRecherche): void {
    this.router.navigateByUrl(resultat.lien);
    this.closeSearch();
  }

  get hasResultats(): boolean {
    return !!this.searchResultats && this.searchResultats.total > 0;
  }

  closeMenus(): void {
    this.showUserMenu      = false;
    this.showNotifications = false;
    this.showSearch        = false;
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
