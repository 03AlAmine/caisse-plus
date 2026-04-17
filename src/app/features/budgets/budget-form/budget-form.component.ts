import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BudgetService, BudgetAvecStats } from '../../../services/budget.service';
import { CaisseService } from '../../../services/caisse.service';
import { CategorieService } from '../../../services/categorie.service';
import { AuthService } from '../../../services/auth.service';
import { Caisse } from '../../../models/caisse.model';
import { Categorie } from '../../../models/categorie.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-budget-form',
  templateUrl: './budget-form.component.html',
  styleUrls: ['./budget-form.component.scss'],
})
export class BudgetFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private budgetService = inject(BudgetService);
  private caisseService = inject(CaisseService);
  private catService = inject(CategorieService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);

  form!: FormGroup;
  caisses: Caisse[] = [];
  categories: Categorie[] = [];
  categoriesFiltrees: Categorie[] = [];
  loading = false;
  saving = false;
  isEdit = false;
  budgetId: string | null = null;
  showConfirmModal = false;

  MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  get anneeActuelle(): number {
    return new Date().getFullYear();
  }

  get annees(): number[] {
    return [this.anneeActuelle - 1, this.anneeActuelle, this.anneeActuelle + 1, this.anneeActuelle + 2];
  }

  get selectedCaisse(): Caisse | undefined {
    const caisseId = this.form.get('caisseId')?.value;
    return this.caisses.find(c => c.id === caisseId);
  }

  get selectedCategorie(): Categorie | undefined {
    const categorieId = this.form.get('categorieId')?.value;
    return this.categories.find(c => c.id === categorieId);
  }

  ngOnInit(): void {
    this.budgetId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.budgetId && this.route.snapshot.url.some(s => s.path === 'modifier');

    this.initForm();
    this.loadData();
  }

  private initForm(): void {
    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      caisseId: ['', Validators.required],
      caisseNom: [''],
      categorieId: [''],
      categorieNom: [''],
      montantPrevu: [null, [Validators.required, Validators.min(1)]],
      periode: ['mensuel', Validators.required],
      mois: [new Date().getMonth() + 1],
      annee: [this.anneeActuelle, Validators.required],
      seuilAlerte: [80, [Validators.required, Validators.min(10), Validators.max(100)]],
    });
  }

  private async loadData(): Promise<void> {
    this.loading = true;

    // Charger les caisses
    this.caisseService.getAll().subscribe(c => {
      this.caisses = c.filter(caisse => caisse.actif === true);
    });

    // Charger toutes les catégories
    this.catService.getAll().subscribe(c => {
      this.categories = c;
      this.updateCategoriesFilter();
    });

    // Charger le budget si édition
    if (this.isEdit && this.budgetId) {
      try {
        const budgets = await firstValueFrom(this.budgetService.getAll());
        const budget = budgets.find(x => x.id === this.budgetId);
        if (budget) {
          this.form.patchValue({
            nom: budget.nom,
            caisseId: budget.caisseId,
            caisseNom: budget.caisseNom,
            categorieId: budget.categorieId || '',
            categorieNom: budget.categorieNom || '',
            montantPrevu: budget.montantPrevu,
            periode: budget.periode,
            mois: budget.mois || new Date().getMonth() + 1,
            annee: budget.annee,
            seuilAlerte: budget.seuilAlerte,
          });
          this.updateCategoriesFilter();
        }
      } catch (error) {
        this.toastr.error('Erreur lors du chargement du budget');
        this.router.navigate(['/budgets']);
      } finally {
        this.loading = false;
      }
    } else {
      this.loading = false;
    }

    // Écouter les changements de caisse
    this.form.get('caisseId')?.valueChanges.subscribe(() => {
      this.updateCategoriesFilter();
    });
  }

  private updateCategoriesFilter(): void {
    // Pour un budget, on ne montre que les catégories de type 'sortie' ou 'les_deux'
    this.categoriesFiltrees = this.categories.filter(c =>
      c.type === 'sortie' || c.type === 'les_deux'
    );
  }

  onCaisseChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const caisse = this.caisses.find(x => x.id === select.value);
    this.form.get('caisseNom')?.setValue(caisse?.nom ?? '');
    this.updateCategoriesFilter();
  }

  onCategorieChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const categorie = this.categories.find(x => x.id === select.value);
    this.form.get('categorieNom')?.setValue(categorie?.nom ?? '');
  }

  getSeuilDescription(): string {
    const seuil = this.form.get('seuilAlerte')?.value || 80;
    if (seuil >= 100) return 'L\'alerte sera déclenchée uniquement en cas de dépassement';
    if (seuil >= 90) return 'Alerte très sensible - déclenchée à seuil élevé';
    if (seuil >= 70) return 'Alerte modérée - équilibre entre anticipation et stabilité';
    return 'Alerte précoce - vous serez informé tôt';
  }

  getMontantSeuil(): number {
    const montant = this.form.get('montantPrevu')?.value || 0;
    const seuil = this.form.get('seuilAlerte')?.value || 80;
    return Math.round(montant * seuil / 100);
  }

  getMontantDepassement(): number {
    const montant = this.form.get('montantPrevu')?.value || 0;
    return montant;
  }

  getPeriodeLabel(): string {
    const periode = this.form.get('periode')?.value;
    const annee = this.form.get('annee')?.value;
    if (periode === 'annuel') {
      return `Année ${annee}`;
    }
    const mois = this.form.get('mois')?.value;
    return `${this.MOIS[(mois || 1) - 1]} ${annee}`;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (this.isEdit) {
      this.showConfirmModal = true;
    } else {
      await this.saveBudget();
    }
  }

  confirmSubmit(): void {
    this.showConfirmModal = false;
    this.saveBudget();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
  }

  private async saveBudget(): Promise<void> {
    this.saving = true;
    try {
      // Construction de l'objet avec toutes les propriétés requises
      const formValues = this.form.value;

      const budgetData = {
        nom: formValues.nom,
        caisseId: formValues.caisseId,
        caisseNom: formValues.caisseNom || '',
        categorieId: formValues.categorieId || null,
        categorieNom: formValues.categorieNom || null,
        montantPrevu: Number(formValues.montantPrevu),
        montantDepense: 0,  // Propriété requise
        periode: formValues.periode,
        mois: formValues.periode === 'mensuel' ? formValues.mois : null,
        annee: formValues.annee,
        seuilAlerte: formValues.seuilAlerte,
        actif: true,  // Propriété requise
      };

      if (this.isEdit && this.budgetId) {
        // Pour la mise à jour, ne pas inclure montantDepense et actif si non voulus
        const updateData = {
          nom: budgetData.nom,
          caisseId: budgetData.caisseId,
          caisseNom: budgetData.caisseNom,
          categorieId: budgetData.categorieId,
          categorieNom: budgetData.categorieNom,
          montantPrevu: budgetData.montantPrevu,
          periode: budgetData.periode,
          mois: budgetData.mois,
          annee: budgetData.annee,
          seuilAlerte: budgetData.seuilAlerte,
        };
        await this.budgetService.update(this.budgetId, updateData);
        this.toastr.success(`Budget "${budgetData.nom}" mis à jour avec succès`);
      } else {
        await this.budgetService.create(budgetData);
        this.toastr.success(`Budget "${budgetData.nom}" créé avec succès`);
      }
      this.router.navigate(['/budgets']);
    } catch (err: any) {
      console.error('Erreur:', err);
      this.toastr.error(err.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      this.saving = false;
    }
  }
}
