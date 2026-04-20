import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemePreference = 'light' | 'dark' | 'system';
export type DensityPreference = 'comfortable' | 'compact';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type CurrencyDisplay = 'symbol' | 'code';
export type LanguagePreference = 'fr' | 'en';
export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

export interface UserPreferences {
  // Affichage
  theme: ThemePreference;
  density: DensityPreference;
  sidebarCollapsed: boolean;

  // Notifications
  emailNotifications: boolean;
  inAppNotifications: boolean;
  notifyBudgetAlert: boolean;
  notifyOperationValidation: boolean;
  notifyNewOperation: boolean;

  // Langue et format
  language: LanguagePreference;
  dateFormat: DateFormat;
  currencyDisplay: CurrencyDisplay;

  // Sécurité (admin uniquement)
  validationThreshold: number;
  twoFactorAuth: boolean;
  sessionTimeout: number; // en minutes, 0 = jamais

  // Sauvegarde (admin uniquement)
  autoBackup: boolean;
  backupFrequency: BackupFrequency;
}

export interface OrganisationPreferences {
  validationThreshold: number;
  autoBackup: boolean;
  backupFrequency: BackupFrequency;
  sessionTimeout: number;
  updatedAt?: any;
  updatedBy?: string;
}

// Valeurs par défaut
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  density: 'comfortable',
  sidebarCollapsed: false,

  emailNotifications: true,
  inAppNotifications: true,
  notifyBudgetAlert: true,
  notifyOperationValidation: true,
  notifyNewOperation: false,

  language: 'fr',
  dateFormat: 'DD/MM/YYYY',
  currencyDisplay: 'symbol',

  validationThreshold: 100000,
  twoFactorAuth: false,
  sessionTimeout: 60,

  autoBackup: false,
  backupFrequency: 'weekly',
};

export const DEFAULT_ORG_PREFERENCES: OrganisationPreferences = {
  validationThreshold: 100000,
  autoBackup: false,
  backupFrequency: 'weekly',
  sessionTimeout: 60,
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private get orgId(): string {
    return this.auth.organisationId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Préférences utilisateur
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Récupère les préférences d'un utilisateur.
   * Si elles n'existent pas, retourne les valeurs par défaut.
   */
  async getUserPreferences(uid: string): Promise<UserPreferences> {
    const prefRef = doc(this.firestore, `users/${uid}/preferences/main`);
    const snap = await getDoc(prefRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        ...DEFAULT_USER_PREFERENCES,
        ...data,
        // S'assurer que les dates sont bien des dates
        updatedAt: data['updatedAt']?.toDate?.() ?? new Date(),
      } as UserPreferences;
    }

    return { ...DEFAULT_USER_PREFERENCES };
  }

  /**
   * Sauvegarde les préférences d'un utilisateur.
   * Fusionne avec les préférences existantes.
   */
  async saveUserPreferences(uid: string, prefs: Partial<UserPreferences>): Promise<void> {
    const prefRef = doc(this.firestore, `users/${uid}/preferences/main`);

    await setDoc(prefRef, {
      ...prefs,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  /**
   * Réinitialise les préférences utilisateur aux valeurs par défaut.
   */
  async resetUserPreferences(uid: string): Promise<void> {
    const prefRef = doc(this.firestore, `users/${uid}/preferences/main`);
    await setDoc(prefRef, {
      ...DEFAULT_USER_PREFERENCES,
      updatedAt: serverTimestamp(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Préférences organisation (admin uniquement)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Récupère les préférences de l'organisation.
   */
  async getOrganisationPreferences(): Promise<OrganisationPreferences> {
    if (!this.orgId) {
      return { ...DEFAULT_ORG_PREFERENCES };
    }

    const prefRef = doc(this.firestore, `organisations/${this.orgId}/preferences/main`);
    const snap = await getDoc(prefRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        ...DEFAULT_ORG_PREFERENCES,
        ...data,
      } as OrganisationPreferences;
    }

    return { ...DEFAULT_ORG_PREFERENCES };
  }

  /**
   * Sauvegarde les préférences de l'organisation.
   * Réservé aux administrateurs.
   */
  async saveOrganisationPreferences(prefs: Partial<OrganisationPreferences>): Promise<void> {
    if (!this.auth.isAdmin()) {
      throw new Error('Seul un administrateur peut modifier les préférences de l\'organisation');
    }

    if (!this.orgId) {
      throw new Error('Aucune organisation trouvée');
    }

    const prefRef = doc(this.firestore, `organisations/${this.orgId}/preferences/main`);

    await setDoc(prefRef, {
      ...prefs,
      updatedAt: serverTimestamp(),
      updatedBy: this.auth.currentUser?.uid,
    }, { merge: true });
  }

  /**
   * Récupère le seuil de validation effectif.
   * Priorité : préférences organisation > valeur par défaut.
   */
  async getValidationThreshold(): Promise<number> {
    const orgPrefs = await this.getOrganisationPreferences();
    return orgPrefs.validationThreshold ?? DEFAULT_ORG_PREFERENCES.validationThreshold;
  }

  /**
   * Vérifie si une opération nécessite une validation.
   */
  async needsValidation(montant: number, userId?: string): Promise<boolean> {
    // Les trésoriers et admins n'ont pas besoin de validation
    if (this.auth.isTresorier()) {
      return false;
    }

    const threshold = await this.getValidationThreshold();
    return montant >= threshold;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Méthodes utilitaires pour l'application
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Applique le thème actif dans l'application.
   * À appeler après avoir récupéré les préférences utilisateur.
   */
  applyTheme(theme: ThemePreference): void {
    const html = document.documentElement;

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }
  }

  /**
   * Écoute les changements de thème système.
   * Retourne une fonction pour arrêter l'écoute.
   */
  listenToSystemTheme(callback: (isDark: boolean) => void): () => void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      callback(e.matches);
    };

    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }

  /**
   * Formate une date selon le format préféré de l'utilisateur.
   */
  formatDate(date: Date, format: DateFormat): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return date.toLocaleDateString('fr-FR');
    }
  }

  /**
   * Formate un montant selon les préférences d'affichage.
   */
  formatMontant(montant: number, currencyDisplay: CurrencyDisplay): string {
    const formatted = new Intl.NumberFormat('fr-FR').format(montant);

    if (currencyDisplay === 'symbol') {
      return `${formatted} FCFA`;
    } else {
      return `${formatted} XOF`;
    }
  }

  /**
   * Obtient la densité CSS à appliquer.
   */
  getDensityClass(density: DensityPreference): string {
    return density === 'compact' ? 'density-compact' : 'density-comfortable';
  }

  /**
   * Vérifie si la session a expiré.
   */
  isSessionExpired(lastActivity: Date, timeoutMinutes: number): boolean {
    if (timeoutMinutes === 0) return false;

    const now = new Date();
    const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    return diffMinutes > timeoutMinutes;
  }
}
