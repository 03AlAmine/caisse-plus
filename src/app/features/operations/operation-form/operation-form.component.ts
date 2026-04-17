import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OperationService } from '../../../services/operation.service';
import { CaisseService } from '../../../services/caisse.service';
import { CategorieService } from '../../../services/categorie.service';
import { AuthService } from '../../../services/auth.service';
import { Caisse } from '../../../models/caisse.model';
import { Categorie } from '../../../models/categorie.model';
import { Operation } from '../../../models/operation.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-operation-form',
  templateUrl: './operation-form.component.html',
  styleUrls: ['./operation-form.component.scss'],
})
export class OperationFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private opService = inject(OperationService);
  private caisseService = inject(CaisseService);
  private categorieService = inject(CategorieService);
  public auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  caisses: Caisse[] = [];
  categories: Categorie[] = [];
  loading = false;
  isEdit = false;
  operationId: string | null = null;
  showConfirmModal = false;
  uploadedFiles: File[] = [];

  ngOnInit(): void {
    this.operationId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.operationId && this.route.snapshot.url.some(s => s.path === 'modifier');

    const today = new Date().toISOString().split('T')[0];
    const caisseIdParam = this.route.snapshot.queryParamMap.get('caisseId') ?? '';

    this.initForm(today, caisseIdParam);
    this.loadData();
    this.setupTypeListener();
  }

  private initForm(today: string, caisseIdParam: string): void {
    this.form = this.fb.group({
      libelle: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      montant: [null, [Validators.required, Validators.min(1)]],
      type: ['sortie', Validators.required],
      caisseId: [caisseIdParam, Validators.required],
      transfertCaisseDestId: [''],
      categorieId: [''],
      date: [today, Validators.required],
      notes: ['', Validators.maxLength(500)],
    });
  }

  private async loadData(): Promise<void> {
    // Charger les caisses
    this.caisseService.getAll().subscribe(c => {
      this.caisses = c.filter(caisse => caisse.actif === true);
      if (!this.form.get('caisseId')?.value && this.caisses.length > 0) {
        const principale = this.caisses.find(x => x.type === 'principale');
        this.form.get('caisseId')?.setValue(principale?.id ?? this.caisses[0].id);
      }
    });

    // Charger l'opération si édition
    if (this.isEdit && this.operationId) {
      try {
        const op = await firstValueFrom(this.opService.getById(this.operationId));
        if (op) {
          this.form.patchValue({
            libelle: op.libelle,
            montant: op.montant,
            type: op.type,
            caisseId: op.caisseId,
            categorieId: op.categorieId || '',
            date: new Date(op.date).toISOString().split('T')[0],
            notes: op.notes || '',
          });
          await this.loadCategories(op.type);
        }
      } catch (error) {
        this.toastr.error('Erreur lors du chargement de l\'opération');
        this.router.navigate(['/operations']);
      }
    } else {
      // Charger les catégories par défaut
      await this.loadCategories('sortie');
    }
  }

  private setupTypeListener(): void {
    this.form.get('type')!.valueChanges.subscribe(async (type) => {
      if (type !== 'transfert') {
        await this.loadCategories(type);
        this.form.get('transfertCaisseDestId')?.setValue('');
      } else {
        this.categories = [];
      }
    });
  }

  private async loadCategories(type: string): Promise<void> {
    this.categorieService.getByType(type as 'entree' | 'sortie').subscribe(cats => {
      this.categories = cats;
    });
  }

  get libelle() { return this.form.get('libelle')!; }
  get montant() { return this.form.get('montant')!; }

  get selectedCaisse(): Caisse | undefined {
    const id = this.form.get('caisseId')?.value;
    return this.caisses.find(c => c.id === id);
  }

  get selectedCaisseSolde(): number {
    return this.selectedCaisse?.solde ?? 0;
  }

  getSelectedDestCaisse(): Caisse | undefined {
    const id = this.form.get('transfertCaisseDestId')?.value;
    return this.caisses.find(c => c.id === id);
  }

  onCaisseChange(): void {
    if (this.form.get('type')?.value === 'sortie' && this.montant.value > this.selectedCaisseSolde) {
      this.toastr.warning('Attention : Le montant saisi dépasse le solde de la caisse');
    }
  }

  onCategorieChange(): void {
    // Optionnel : stocker des informations supplémentaires
  }

  // Gestion des fichiers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  private addFiles(files: File[]): void {
    const validFiles = files.filter(f => {
      const isValid = f.size <= 5 * 1024 * 1024;
      if (!isValid) {
        this.toastr.warning(`${f.name} dépasse la taille maximale (5MB)`);
      }
      return isValid;
    });
    this.uploadedFiles.push(...validFiles);
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (this.form.get('type')?.value === 'sortie' && this.montant.value > this.selectedCaisseSolde) {
      const confirm = window.confirm(
        `Attention : Le solde de la caisse (${this.selectedCaisseSolde.toLocaleString()} FCFA) est inférieur au montant saisi (${this.montant.value.toLocaleString()} FCFA).\n\nVoulez-vous continuer ?`
      );
      if (!confirm) return;
    }

    if (this.isEdit) {
      this.showConfirmModal = true;
    } else {
      await this.saveOperation();
    }
  }

  confirmSubmit(): void {
    this.showConfirmModal = false;
    this.saveOperation();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
  }

  private async saveOperation(): Promise<void> {
    this.loading = true;
    const val = this.form.value;
    const caisse = this.selectedCaisse;

    try {
      const data: any = {
        libelle: val.libelle,
        montant: Number(val.montant),
        type: val.type,
        caisseId: val.caisseId,
        caisseNom: caisse?.nom ?? '',
        date: new Date(val.date),
        notes: val.notes || '',
      };

      if (val.categorieId) {
        const categorie = this.categories.find(c => c.id === val.categorieId);
        data.categorieId = val.categorieId;
        data.categorieNom = categorie?.nom ?? '';
      }

      if (val.type === 'transfert' && val.transfertCaisseDestId) {
        const destCaisse = this.caisses.find(c => c.id === val.transfertCaisseDestId);
        data.transfertCaisseDestId = val.transfertCaisseDestId;
        data.transfertCaisseDestNom = destCaisse?.nom ?? '';
      }

      if (this.isEdit && this.operationId) {
        await this.opService.update(this.operationId, data);
        this.toastr.success('Opération modifiée avec succès', 'Succès');
      } else {
        await this.opService.create(data);
        const needsValidation = data.montant >= 100000 && !this.auth.isTresorier();

        if (needsValidation) {
          this.toastr.info(
            'Opération soumise à validation. Un trésorier doit valider cette transaction.',
            'En attente de validation'
          );
        } else {
          this.toastr.success('Opération enregistrée et validée', 'Succès');
        }
      }
      this.router.navigate(['/operations']);
    } catch (err: any) {
      this.toastr.error(err.message ?? 'Erreur lors de l\'enregistrement', 'Erreur');
    } finally {
      this.loading = false;
    }
  }
}
