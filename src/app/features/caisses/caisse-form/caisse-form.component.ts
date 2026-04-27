import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CaisseService } from '../../../services/caisse.service';
import { AuthService } from '../../../services/auth.service';
import { Caisse } from '../../../models/caisse.model';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
@Component({
  selector: 'app-caisse-form',
  templateUrl: './caisse-form.component.html',
  styleUrls: ['./caisse-form.component.scss'],
})
export class CaisseFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private caisseService = inject(CaisseService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = false;
  isEdit = false;
  caisseId: string | null = null;
  showConfirmModal = false;
  errorMessage: string = '';
  showError: boolean = false;
  showAllRoles = false;

  COULEURS = [
    '#0A1628', // Navy
    '#00A86B', // Green
    '#7C3AED', // Purple
    '#F4A623', // Gold
    '#E8453C', // Red
    '#0EA5E9', // Cyan
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#10B981', // Emerald
    '#F59E0B', // Amber
  ];

  ngOnInit(): void {
    this.caisseId = this.route.snapshot.paramMap.get('id');
    this.isEdit =
      !!this.caisseId &&
      this.route.snapshot.url.some((s) => s.path === 'modifier');

    this.initForm();

    if (this.isEdit && this.caisseId) {
      this.loadCaisse(this.caisseId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      nom: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ],
      ],
      type: ['secondaire', Validators.required],
      role: [''], // ← Nouveau champ
      description: ['', [Validators.maxLength(200)]],
      couleur: ['#0A1628'],
      responsableNom: ['', [Validators.maxLength(100)]],
    });
  }

  // Dans loadCaisse()

  private async loadCaisse(id: string): Promise<void> {
    this.loading = true;
    try {
      const caisse = await firstValueFrom(this.caisseService.getById(id));
      if (caisse) {
        this.form.patchValue({
          nom: caisse.nom,
          type: caisse.type,
          role: caisse.role || '', // ← Charger le rôle
          description: caisse.description || '',
          couleur: caisse.couleur || '#0A1628',
          responsableNom: caisse.responsableNom || '',
        });
      }
    } catch (error) {
      this.toastr.error('Impossible de charger les informations de la caisse');
      this.router.navigate(['/caisses']);
    } finally {
      this.loading = false;
    }
  }

  get nom() {
    return this.form.get('nom')!;
  }
  get type() {
    return this.form.get('type')!;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.toastr.warning('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (this.isEdit) {
      this.showConfirmModal = true;
    } else {
      this.saveCaisse();
    }
  }

  confirmSubmit(): void {
    this.showConfirmModal = false;
    this.saveCaisse();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
  }

  // Dans saveCaisse()
  private async saveCaisse(): Promise<void> {
    this.loading = true;
    this.showError = false;
    this.errorMessage = '';

    const formValue = this.form.value;
    const data = {
      ...formValue,
      organisationId: this.auth.organisationId,
      actif: true,
      solde: 0,
    };

    try {
      if (this.isEdit && this.caisseId) {
        const caisse = await firstValueFrom(
          this.caisseService.getById(this.caisseId),
        );
        if (caisse?.type === 'principale' && formValue.type !== 'principale') {
          this.showError = true;
          this.errorMessage =
            'Impossible de modifier le type de la caisse principale';
          this.loading = false;
          return;
        }
        await this.caisseService.update(this.caisseId, formValue);
        this.toastr.success('Caisse mise à jour avec succès');
      } else {
        // Vérifier si une caisse principale existe déjà
        if (formValue.type === 'principale') {
          const existingPrincipal = await this.checkExistingPrincipal();
          if (existingPrincipal) {
            this.showError = true;
            this.errorMessage =
              'Une caisse principale existe déjà. Veuillez choisir un type secondaire.';
            this.loading = false;
            // Faire défiler vers le haut pour voir l'erreur
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
        }
        await this.caisseService.create(data);
        this.toastr.success('Caisse créée avec succès');
      }
      this.router.navigate(['/caisses']);
    } catch (err: any) {
      this.showError = true;
      this.errorMessage =
        err.message || "Une erreur est survenue lors de l'enregistrement";
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      this.loading = false;
    }
  }

  // Méthode pour fermer l'alerte
  closeError(): void {
    this.showError = false;
    this.errorMessage = '';
  }

  private async checkExistingPrincipal(): Promise<boolean> {
    try {
      const caisses = await firstValueFrom(this.caisseService.getAll());
      return caisses.some((c) => c.type === 'principale' && c.actif === true);
    } catch {
      return false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  /**
   * Sélectionne un rôle et met à jour le nom suggéré
   */
  selectRole(role: string): void {
    this.form.get('role')?.setValue(role);
    // ✅ Toujours mettre à jour le nom suggéré, même si déjà rempli
    this.updateSuggestedName(role);
  }

  /**
   * Met à jour le nom de la caisse en fonction du rôle choisi
   */
  private updateSuggestedName(role: string): void {
    if (!role) return;

    this.caisseService
      .getAll()
      .pipe(take(1))
      .subscribe((caisses) => {
        const count = caisses.filter((c: Caisse) => c.role === role).length;
        const name =
          count > 0 ? `Caisse ${role} ${count + 1}` : `Caisse ${role}`;
        this.form.get('nom')?.setValue(name);
      });
  }

  /**
   * Appelé quand on change le type de caisse
   */
  onTypeChange(): void {
    const type = this.type.value;
    const roleControl = this.form.get('role');
    const nomControl = this.form.get('nom');

    if (type === 'principale') {
      nomControl?.setValue('Caisse principale');
      roleControl?.setValue('Principale');
    } else if (type === 'secondaire') {
      // Réinitialiser si on passe de principale à secondaire
      if (roleControl?.value === 'Principale') {
        roleControl?.setValue('');
        nomControl?.setValue('');
      }
    }
    // Pour "libre", on laisse l'utilisateur choisir
  }
  get suggestedName(): string {
    const role = this.form.get('role')?.value;
    const nom = this.form.get('nom')?.value;

    if (!role) return '';
    if (nom && nom.length > 0) return nom;

    // ✅ Au lieu de getExistingCaisses(), utiliser une valeur simple
    // Le compteur sera fait dans suggestCaisseName()
    return `Caisse ${role}`;
  }

  suggestCaisseName(role: string): void {
    if (!role || this.form.get('nom')?.value) return;

    // ✅ Compter les caisses existantes via le service
    this.caisseService
      .getAll()
      .pipe(take(1))
      .subscribe((caisses) => {
        const count = caisses.filter((c: Caisse) => c.role === role).length;
        const name =
          count > 0 ? `Caisse ${role} ${count + 1}` : `Caisse ${role}`;
        this.form.get('nom')?.setValue(name);
      });
  }

  allRoles = [
    'Boutique',
    'Dépôt',
    'Livraison',
    'Cuisine',
    'Terrasse',
    'Atelier',
    'Tissus',
    'Retouches',
    'Outillage',
    'Déplacement',
    'Projets',
    'Donateurs',
    'Carburant',
    'Péage',
    'Intrants',
    'Matériel',
    'Sécurité',
    'Événements',
    'Divers',
    'Générale',
    'Secondaire',
    'Principale',
  ];

  // Rôles suggérés en fonction du template
  get suggestedRoles(): string[] {
    // Récupérer les rôles depuis le template de l'organisation
    const template = this.auth.getOrganisationTemplate(); // ou via un service
    // Pour l'instant, retourner les plus courants
    return [
      'Boutique',
      'Dépôt',
      'Cuisine',
      'Atelier',
      'Projets',
      'Générale',
      'Divers',
    ];
  }
}
