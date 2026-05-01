import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CategorieService } from '../../../services/categorie.service';
import { CaisseService } from '../../../services/caisse.service';
import { ToastrService } from 'ngx-toastr';
import {
  TEMPLATES,
  ActiviteTemplate,
  getTemplateById,
  getAllCategoriesFromTemplate,
} from '../../../models/templates.data';
import { TemplateComportement } from '../../../models/templates.data';

@Component({
  selector: 'app-organisation',
  templateUrl: './organisation.component.html',
  styleUrls: ['./organisation.component.scss'],
})
export class OrganisationComponent implements OnInit {
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  private categorieService = inject(CategorieService);
  private caisseService = inject(CaisseService);
  private toastr = inject(ToastrService);

  // Dans la classe
  vocabForm!: FormGroup;
  comportement: TemplateComportement = {
    transfertActif: true,
    budgetParCategorie: true,
    soldeMinimumActif: true,
    multiCaisse: true,
    rapportsAvances: true,
    validationActive: true,
  };
  hasConfigChanges = false;
  savingConfig = false;
  // Onglets
  activeTab: 'infos' | 'activite' = 'infos';

  // Template
  templates = TEMPLATES;
  currentTemplate: ActiviteTemplate | undefined;
  selectedNewTemplate: ActiviteTemplate | null = null;

  // Loading
  loading = true;
  loadingReinit = false;
  loadingReinitCaisses = false;
  loadingApply = false;

  // Informations (existant)
  isEditing = false;
  saving = false;
  organisation: any = null;
  form!: FormGroup;

  seuilValidation: number = 100000;
  private originalSeuil: number = 100000;

  ngOnInit(): void {
    this.initForm();
    this.loadOrganisation();
    this.loadTemplate();

    // et passer en mode édition
    const params = new URLSearchParams(window.location.search);
    if (params.get('completer') === 'true') {
      this.activeTab = 'infos';
      // Attendre que les données soient chargées avant d'activer l'édition
      setTimeout(() => {
        if (this.isProfilIncomplet()) {
          this.enableEditing();
        }
      }, 1000);
    }
  }

  // Dans initForm()
  private initForm(): void {
    this.form = this.fb.group({});

    this.vocabForm = this.fb.group({
      entree: [''],
      sortie: [''],
      entreePluriel: [''],
      sortiePluriel: [''],
    });
  }

  // Dans loadTemplate()
  private async loadTemplate(): Promise<void> {
    this.currentTemplate = await this.auth.getOrganisationTemplate();

    if (this.currentTemplate) {
      // Charger le vocabulaire
      this.vocabForm.patchValue({
        entree: this.currentTemplate.vocabulaire.entree,
        sortie: this.currentTemplate.vocabulaire.sortie,
        entreePluriel: this.currentTemplate.vocabulaire.entreePluriel,
        sortiePluriel: this.currentTemplate.vocabulaire.sortiePluriel,
      });

      // ✅ Charger le comportement depuis Firestore (priorité) ou le template
      this.comportement = await this.auth.getComportement();

      // Sauvegarder l'état original pour détecter les changements
      this.originalConfig = {
        vocabulaire: this.vocabForm.value,
        comportement: { ...this.comportement },
      };
    }

    this.seuilValidation = await this.auth.getSeuilValidation();
    this.originalSeuil = this.seuilValidation;

    // Écouter les changements
    this.vocabForm.valueChanges.subscribe(() => this.checkConfigChanges());
  }

  private async loadOrganisation(): Promise<void> {
    try {
      this.organisation = await this.auth.getCurrentOrganisation();
      if (this.organisation) {
        this.form.patchValue({
          nom: this.organisation.nom || '',
          description: this.organisation.description || '',
          adresse: this.organisation.adresse || '',
          telephone: this.organisation.telephone || '',
          email: this.organisation.email || '',
        });
      }
    } catch (error) {
      console.error('Erreur chargement organisation:', error);
    } finally {
      this.loading = false;
    }
  }

  // ─── Template Icon ────────────────────────────────────────────────────
  getTemplateIcon(icon: string): string {
    const icons: Record<string, string> = {
      building: 'M3 21h18M5 21V7l8-4v18M13 21V3l8 4v14',
      store: 'M3 9l2 10h14l2-10M3 9h18M9 9v12M15 9v12',
      fabric: 'M6 2h12v20H6V2zM10 2v20M14 2v20M6 10h12',
      restaurant:
        'M10 3v18M6 8c0-3 2-5 4-5s4 2 4 5v10M18 8c0-3-2-5-4-5s-4 2-4 5',
      tools:
        'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
      heart:
        'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
      plant: 'M12 22v-6M9 10c0-4 3-7 7-7M17 10c0 4-3 7-7 7M5 16c2-2 4-2 7 0',
      truck:
        'M1 12h13M8 3h6l4 6v9h-3M15 3v6h4M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
      custom: 'M12 2l3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6z',
    };
    return icons[icon] || 'M12 2l3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6z';
  }

  // ─── Actions Template ────────────────────────────────────────────────

  selectNewTemplate(template: ActiviteTemplate): void {
    if (this.currentTemplate?.id === template.id) {
      this.selectedNewTemplate = null;
      return;
    }
    this.selectedNewTemplate =
      this.selectedNewTemplate?.id === template.id ? null : template;
  }

  cancelChangeTemplate(): void {
    this.selectedNewTemplate = null;
  }

  getNewTemplatePreview(): { nom: string; type: string }[] {
    if (!this.selectedNewTemplate) return [];
    const allCategories = getAllCategoriesFromTemplate(
      this.selectedNewTemplate,
    );
    return allCategories.slice(0, 12).map((cat) => ({
      nom: cat.nom,
      type: cat.type === 'entree' ? 'Entrée' : 'Sortie',
    }));
  }

  async applyNewTemplate(): Promise<void> {
    if (!this.selectedNewTemplate) return;
    if (this.selectedNewTemplate.id === this.currentTemplate?.id) {
      this.toastr.info('Ce modèle est déjà appliqué');
      return;
    }

    this.loadingApply = true;
    try {
      await this.auth.changerTemplate(this.selectedNewTemplate.id);
      this.currentTemplate = this.selectedNewTemplate;
      this.selectedNewTemplate = null;
      this.toastr.success(
        `Modèle "${this.currentTemplate?.nom}" appliqué avec succès`,
      );
    } catch (error: any) {
      this.toastr.error(error.message || 'Erreur lors du changement de modèle');
    } finally {
      this.loadingApply = false;
    }
  }

  async reinitialiserCategories(): Promise<void> {
    if (!this.currentTemplate) return;

    const confirmMsg = `Réinitialiser les catégories à partir du modèle "${this.currentTemplate.nom}" ?\n\nLes catégories système seront supprimées et recréées.`;
    if (!confirm(confirmMsg)) return;

    this.loadingReinit = true;
    try {
      const count = await this.categorieService.reinitialiserDepuisTemplate();
      this.toastr.success(`${count} catégories réinitialisées avec succès`);
    } catch (error: any) {
      this.toastr.error(error.message || 'Erreur lors de la réinitialisation');
    } finally {
      this.loadingReinit = false;
    }
  }

  async reinitialiserCaisses(): Promise<void> {
    if (!this.currentTemplate) return;
    if (this.currentTemplate.caissesSuggerees.length === 0) {
      this.toastr.info('Aucune caisse suggérée pour ce modèle');
      return;
    }

    this.loadingReinitCaisses = true;
    try {
      // La méthode initCaissesFromTemplate est privée dans AuthService
      // On utilise changerTemplate qui appelle aussi initCaissesFromTemplate
      await this.auth.changerTemplate(this.currentTemplate.id);
      this.toastr.success('Caisses suggérées ajoutées avec succès');
    } catch (error: any) {
      this.toastr.error(error.message || "Erreur lors de l'ajout des caisses");
    } finally {
      this.loadingReinitCaisses = false;
    }
  }

  // ─── Informations (existant) ─────────────────────────────────────────
  enableEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    if (this.organisation) {
      this.form.patchValue({
        nom: this.organisation.nom || '',
        description: this.organisation.description || '',
        adresse: this.organisation.adresse || '',
        telephone: this.organisation.telephone || '',
        email: this.organisation.email || '',
      });
    }
  }

  async onSave(): Promise<void> {
    if (this.form.invalid) return;
    this.saving = true;
    try {
      await this.auth.updateUserProfile(this.form.value);
      this.organisation = { ...this.organisation, ...this.form.value };
      this.isEditing = false;
      this.toastr.success('Organisation mise à jour avec succès');
    } catch (error: any) {
      this.toastr.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      this.saving = false;
    }
  }
  /**
   * Vérifie si le profil de l'organisation est incomplet
   * (pour afficher le message d'invitation à compléter)
   */
  isProfilIncomplet(): boolean {
    if (!this.organisation) return true;

    // Vérifier si au moins 2 champs sont vides
    const champsVides = [
      this.organisation.description,
      this.organisation.adresse,
      this.organisation.telephone,
      this.organisation.email,
    ].filter((v) => !v).length;

    return champsVides >= 2;
  }

  private originalConfig: any = {};

  toggleComportement(key: keyof TemplateComportement): void {
    this.comportement[key] = !this.comportement[key];
    this.checkConfigChanges();
  }

  private checkConfigChanges(): void {
    const vocabChanged =
      JSON.stringify(this.vocabForm.value) !==
      JSON.stringify(this.originalConfig?.vocabulaire);
    const compChanged =
      JSON.stringify(this.comportement) !==
      JSON.stringify(this.originalConfig?.comportement);
    const seuilChanged = this.seuilValidation !== this.originalSeuil;
    this.hasConfigChanges = vocabChanged || compChanged || seuilChanged;
  }

  async saveConfig(): Promise<void> {
    this.savingConfig = true;
    try {
      // Sauvegarder le comportement
      await this.auth.saveComportement(this.comportement);

      //  Sauvegarder le seuil de validation
      if (this.seuilValidation !== this.originalSeuil) {
        await this.auth.saveSeuilValidation(this.seuilValidation);
        this.originalSeuil = this.seuilValidation;
      }

      const config = {
        vocabulaire: this.vocabForm.value,
        comportement: this.comportement,
      };
      localStorage.setItem('caisseplus_user_config', JSON.stringify(config));

      this.originalConfig = {
        vocabulaire: { ...this.vocabForm.value },
        comportement: { ...this.comportement },
      };
      this.hasConfigChanges = false;

      this.toastr.success('Configuration enregistrée avec succès');
    } catch (error: any) {
      this.toastr.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      this.savingConfig = false;
    }
  }

  resetConfig(): void {
    if (this.currentTemplate) {
      this.vocabForm.patchValue({
        entree: this.currentTemplate.vocabulaire.entree,
        sortie: this.currentTemplate.vocabulaire.sortie,
        entreePluriel: this.currentTemplate.vocabulaire.entreePluriel,
        sortiePluriel: this.currentTemplate.vocabulaire.sortiePluriel,
      });
      this.comportement = { ...this.currentTemplate.comportement };
      this.originalConfig = {
        vocabulaire: this.vocabForm.value,
        comportement: { ...this.comportement },
      };
      this.hasConfigChanges = false;
    }
    this.seuilValidation = this.originalSeuil;
    this.hasConfigChanges = false;
  }
}
