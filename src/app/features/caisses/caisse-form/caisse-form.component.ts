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
    '#0A1628', '#00A86B', '#7C3AED', '#F4A623', '#E8453C',
    '#0EA5E9', '#EC4899', '#6B7280', '#10B981', '#F59E0B',
  ];

  ngOnInit(): void {
    this.caisseId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.caisseId && this.route.snapshot.url.some((s) => s.path === 'modifier');
    this.initForm();
    if (this.isEdit && this.caisseId) {
      this.loadCaisse(this.caisseId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      role: ['', Validators.required],
      description: ['', [Validators.maxLength(200)]],
      couleur: ['#0A1628'],
      responsableNom: ['', [Validators.maxLength(100)]],
    });
  }

  private async loadCaisse(id: string): Promise<void> {
    this.loading = true;
    try {
      const caisse = await firstValueFrom(this.caisseService.getById(id));
      if (caisse) {
        this.form.patchValue({
          nom: caisse.nom,
          role: caisse.role || '',
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

  get nom() { return this.form.get('nom')!; }

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

  private async saveCaisse(): Promise<void> {
    this.loading = true;
    this.showError = false;
    this.errorMessage = '';

    const formValue = this.form.value;

    const data = {
      nom: formValue.nom,
      role: formValue.role,
      description: formValue.description,
      couleur: formValue.couleur,
      responsableNom: formValue.responsableNom,
      organisationId: this.auth.organisationId,
      actif: true,
      solde: 0,
    };

    try {
      if (this.isEdit && this.caisseId) {
        await this.caisseService.update(this.caisseId, formValue);
        this.toastr.success('Caisse mise à jour avec succès');
      } else {
        await this.caisseService.create(data);
        this.toastr.success('Caisse créée avec succès');
      }
      this.router.navigate(['/caisses']);
    } catch (err: any) {
      this.showError = true;
      this.errorMessage = err.message || "Une erreur est survenue lors de l'enregistrement";
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      this.loading = false;
    }
  }

  closeError(): void {
    this.showError = false;
    this.errorMessage = '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  selectRole(role: string): void {
    this.form.get('role')?.setValue(role);
    this.updateSuggestedName(role);
  }

  private updateSuggestedName(role: string): void {
    if (!role) return;
    this.caisseService.getAll().pipe(take(1)).subscribe((caisses) => {
      const count = caisses.filter((c: Caisse) => c.role === role).length;
      const name = count > 0 ? `Caisse ${role} ${count + 1}` : `Caisse ${role}`;
      if (!this.form.get('nom')?.value || this.form.get('nom')?.value === `Caisse ${role}`) {
        this.form.get('nom')?.setValue(name);
      }
    });
  }

  get suggestedName(): string {
    const role = this.form.get('role')?.value;
    const nom = this.form.get('nom')?.value;
    if (!role) return '';
    if (nom && nom.length > 0) return nom;
    return `Caisse ${role}`;
  }

  // ❌ Supprimer ces méthodes qui utilisaient 'type'
  // onTypeChange()
  // checkExistingPrincipal()

  allRoles = [
    'Boutique', 'Dépôt', 'Livraison', 'Cuisine', 'Terrasse',
    'Atelier', 'Tissus', 'Retouches', 'Outillage', 'Déplacement',
    'Projets', 'Donateurs', 'Carburant', 'Péage', 'Intrants',
    'Matériel', 'Sécurité', 'Événements', 'Divers', 'Générale',
    'Secondaire', 'Principale',
  ];

  get suggestedRoles(): string[] {
    return ['Boutique', 'Dépôt', 'Cuisine', 'Atelier', 'Projets', 'Générale', 'Divers'];
  }
}
