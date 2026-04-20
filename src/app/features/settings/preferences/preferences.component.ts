import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import {
  PreferencesService,
  UserPreferences,
  DEFAULT_USER_PREFERENCES,
  OrganisationPreferences,
  DEFAULT_ORG_PREFERENCES,
  ThemePreference,
} from '../../../services/preferences.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss'],
})
export class PreferencesComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  private preferencesService = inject(PreferencesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = true;
  saving = false;
  hasChanges = false;
  showResetModal = false;
  resetConfirmation = '';

  private initialValues: any = {};
  private themeMediaQueryUnsub?: () => void;

  ngOnInit(): void {
    this.initForm();
    this.loadPreferences();
  }

  ngOnDestroy(): void {
    if (this.themeMediaQueryUnsub) {
      this.themeMediaQueryUnsub();
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      // Affichage
      theme: [DEFAULT_USER_PREFERENCES.theme],
      density: [DEFAULT_USER_PREFERENCES.density],
      sidebarCollapsed: [DEFAULT_USER_PREFERENCES.sidebarCollapsed],

      // Notifications
      emailNotifications: [DEFAULT_USER_PREFERENCES.emailNotifications],
      inAppNotifications: [DEFAULT_USER_PREFERENCES.inAppNotifications],
      notifyBudgetAlert: [DEFAULT_USER_PREFERENCES.notifyBudgetAlert],
      notifyOperationValidation: [
        DEFAULT_USER_PREFERENCES.notifyOperationValidation,
      ],
      notifyNewOperation: [DEFAULT_USER_PREFERENCES.notifyNewOperation],

      // Langue et format
      language: [DEFAULT_USER_PREFERENCES.language],
      dateFormat: [DEFAULT_USER_PREFERENCES.dateFormat],
      currencyDisplay: [DEFAULT_USER_PREFERENCES.currencyDisplay],

      // Sécurité
      validationThreshold: [DEFAULT_USER_PREFERENCES.validationThreshold],
      twoFactorAuth: [DEFAULT_USER_PREFERENCES.twoFactorAuth],
      sessionTimeout: [DEFAULT_USER_PREFERENCES.sessionTimeout],

      // Sauvegarde
      autoBackup: [DEFAULT_USER_PREFERENCES.autoBackup],
      backupFrequency: [DEFAULT_USER_PREFERENCES.backupFrequency],
    });

    this.form.valueChanges.subscribe(() => {
      this.hasChanges =
        JSON.stringify(this.form.value) !== JSON.stringify(this.initialValues);
    });

    // Activer/désactiver les sous-options de notifications
    this.form.get('inAppNotifications')?.valueChanges.subscribe((enabled) => {
      const controls = [
        'notifyBudgetAlert',
        'notifyOperationValidation',
        'notifyNewOperation',
      ];
      controls.forEach((ctrl) => {
        if (enabled) {
          this.form.get(ctrl)?.enable();
        } else {
          this.form.get(ctrl)?.disable();
        }
      });
    });

    // Activer/désactiver la fréquence de sauvegarde
    this.form.get('autoBackup')?.valueChanges.subscribe((enabled) => {
      if (enabled) {
        this.form.get('backupFrequency')?.enable();
      } else {
        this.form.get('backupFrequency')?.disable();
      }
    });
  }

  private async loadPreferences(): Promise<void> {
    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) {
        this.loading = false;
        return;
      }

      // Charger les préférences utilisateur
      const userPrefs = await this.preferencesService.getUserPreferences(uid);
      this.form.patchValue(userPrefs);

      // Si admin, charger aussi les préférences organisation
      if (this.auth.isAdmin()) {
        const orgPrefs =
          await this.preferencesService.getOrganisationPreferences();
        this.form.patchValue({
          validationThreshold: orgPrefs.validationThreshold,
          autoBackup: orgPrefs.autoBackup,
          backupFrequency: orgPrefs.backupFrequency,
          sessionTimeout: orgPrefs.sessionTimeout,
        });
      }

      this.initialValues = this.form.value;

      // Appliquer le thème
      this.preferencesService.applyTheme(userPrefs.theme);

      // Écouter les changements de thème système si nécessaire
      if (userPrefs.theme === 'system') {
        this.themeMediaQueryUnsub = this.preferencesService.listenToSystemTheme(
          (isDark) => {
            document.documentElement.setAttribute(
              'data-theme',
              isDark ? 'dark' : 'light',
            );
          },
        );
      }

      // Appliquer la densité
      document.documentElement.classList.add(
        this.preferencesService.getDensityClass(userPrefs.density),
      );
    } catch (error) {
      console.error('Erreur chargement préférences:', error);
      this.toastr.error('Impossible de charger les préférences');
    } finally {
      this.loading = false;
    }
  }

  resetChanges(): void {
    this.form.patchValue(this.initialValues);
    this.hasChanges = false;
  }

  async savePreferences(): Promise<void> {
    if (this.form.invalid) return;

    this.saving = true;
    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) throw new Error('Utilisateur non authentifié');

      const formValue = this.form.value;

      // Préférences utilisateur
      const userPrefs: Partial<UserPreferences> = {
        theme: formValue.theme,
        density: formValue.density,
        sidebarCollapsed: formValue.sidebarCollapsed,
        emailNotifications: formValue.emailNotifications,
        inAppNotifications: formValue.inAppNotifications,
        notifyBudgetAlert: formValue.notifyBudgetAlert,
        notifyOperationValidation: formValue.notifyOperationValidation,
        notifyNewOperation: formValue.notifyNewOperation,
        language: formValue.language,
        dateFormat: formValue.dateFormat,
        currencyDisplay: formValue.currencyDisplay,
        twoFactorAuth: formValue.twoFactorAuth,
      };

      await this.preferencesService.saveUserPreferences(uid, userPrefs);

      // Préférences organisation (admin uniquement)
      if (this.auth.isAdmin()) {
        const orgPrefs: Partial<OrganisationPreferences> = {
          validationThreshold: formValue.validationThreshold,
          autoBackup: formValue.autoBackup,
          backupFrequency: formValue.backupFrequency,
          sessionTimeout: formValue.sessionTimeout,
        };
        await this.preferencesService.saveOrganisationPreferences(orgPrefs);
      }

      this.initialValues = this.form.value;
      this.hasChanges = false;

      // Appliquer les changements de thème et densité
      this.preferencesService.applyTheme(formValue.theme);

      // Mettre à jour la classe de densité
      document.documentElement.classList.remove(
        'density-comfortable',
        'density-compact',
      );
      document.documentElement.classList.add(
        this.preferencesService.getDensityClass(formValue.density),
      );

      this.toastr.success('Préférences enregistrées avec succès');
    } catch (error: any) {
      console.error('Erreur sauvegarde préférences:', error);
      this.toastr.error(
        error.message || "Erreur lors de l'enregistrement des préférences",
      );
    } finally {
      this.saving = false;
    }
  }
  // Dans preferences.component.ts, ajoutez après savePreferences() :

  /**
   * Applique immédiatement le thème sans sauvegarder (pour la preview)
   */
  previewTheme(theme: ThemePreference): void {
    this.preferencesService.applyTheme(theme);
  }

  /**
   * Rétablit le thème sauvegardé
   */
  resetThemePreview(): void {
    const currentTheme = this.form.get('theme')?.value;
    this.preferencesService.applyTheme(currentTheme);
  }
  exportAllData(): void {
    // À implémenter avec le RapportService
    this.toastr.info('Export des données en cours de développement...');
  }

  confirmResetData(): void {
    this.showResetModal = true;
    this.resetConfirmation = '';
  }

  closeResetModal(): void {
    this.showResetModal = false;
    this.resetConfirmation = '';
  }

  async executeResetData(): Promise<void> {
    if (this.resetConfirmation !== 'SUPPRIMER') {
      this.toastr.warning('Veuillez taper "SUPPRIMER" pour confirmer');
      return;
    }

    try {
      // À implémenter : réinitialisation des données
      this.toastr.success('Données réinitialisées avec succès');
      this.closeResetModal();
    } catch (error) {
      this.toastr.error('Erreur lors de la réinitialisation');
    }
  }
}
