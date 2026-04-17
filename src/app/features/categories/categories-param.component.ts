import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategorieService } from '../../services/categorie.service';
import { AuthService } from '../../services/auth.service';
import { Categorie, CategorieType } from '../../models/categorie.model';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-categories-param',
  templateUrl: './categories-param.component.html',
  styleUrls: ['./categories-param.component.scss'],
})
export class CategoriesParamComponent implements OnInit {
  private catService = inject(CategorieService);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);

  categories$!: Observable<Categorie[]>;
  showForm = false;
  loadingSave = false;
  editingId: string | null = null;
  showDeleteModal = false;
  categoryToDelete: Categorie | null = null;

  form!: FormGroup;

  COULEURS = [
    '#10B981', '#0f4c75', '#8B5CF6', '#F59E0B',
    '#EF4444', '#06B6D4', '#EC4899', '#6B7280',
    '#F97316', '#3B82F6', '#14B8A6', '#D946EF'
  ];

  TYPES = [
    { value: 'entree',   label: 'Entrée',   icon: '📈' },
    { value: 'sortie',   label: 'Sortie',   icon: '📉' },
    { value: 'les_deux', label: 'Les deux', icon: '🔄' },
  ];

  ngOnInit(): void {
    this.categories$ = this.catService.getAll();
    this.initForm();
  }

  initForm(cat?: Categorie): void {
    this.form = this.fb.group({
      nom: [cat?.nom ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      type: [cat?.type ?? 'sortie', Validators.required],
      couleur: [cat?.couleur ?? '#10B981'],
    });
  }

  openForm(): void {
    this.editingId = null;
    this.initForm();
    this.showForm = true;
  }

  onEdit(cat: Categorie): void {
    this.editingId = cat.id!;
    this.initForm(cat);
    this.showForm = true;
  }

  onCancel(): void {
    this.showForm = false;
    this.editingId = null;
    this.initForm();
  }

  getTypeIcon(type: string): string {
    const found = this.TYPES.find(t => t.value === type);
    return found?.icon || '📄';
  }

  getCountByType(categories: Categorie[], type: CategorieType): number {
    return categories.filter(c => c.type === type).length;
  }

  async onSave(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez corriger les erreurs');
      return;
    }

    this.loadingSave = true;
    try {
      const formValue = this.form.value;

      if (this.editingId) {
        await this.catService.update(this.editingId, formValue);
        this.toastr.success(`Catégorie "${formValue.nom}" mise à jour`);
      } else {
        await this.catService.create(formValue);
        this.toastr.success(`Catégorie "${formValue.nom}" créée`);
      }
      this.onCancel();
    } catch (error) {
      this.toastr.error('Erreur lors de la sauvegarde');
    } finally {
      this.loadingSave = false;
    }
  }

  openDeleteModal(cat: Categorie): void {
    this.categoryToDelete = cat;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.categoryToDelete = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.categoryToDelete) return;

    try {
      await this.catService.delete(this.categoryToDelete.id!);
      this.toastr.success(`Catégorie "${this.categoryToDelete.nom}" supprimée`);
      this.closeDeleteModal();
    } catch (error) {
      this.toastr.error('Erreur lors de la suppression');
    }
  }

  async onDelete(cat: Categorie): Promise<void> {
    if (cat.systeme) {
      this.toastr.warning('Les catégories système ne peuvent pas être supprimées');
      return;
    }
    this.openDeleteModal(cat);
  }

  async onInitDefaut(): Promise<void> {
    const confirmed = confirm('Initialiser les catégories par défaut ?\n\nCette action ajoutera les catégories standard si elles n\'existent pas déjà.');
    if (!confirmed) return;

    try {
      await this.catService.initCategories();
      this.toastr.success('Catégories par défaut initialisées avec succès');
    } catch (error) {
      this.toastr.error('Erreur lors de l\'initialisation');
    }
  }
}
