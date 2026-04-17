import { Component, OnInit, inject } from '@angular/core';
import { BudgetService, BudgetAvecStats } from '../../../services/budget.service';
import { CaisseService } from '../../../services/caisse.service';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { Caisse } from '../../../models/caisse.model';

@Component({
  selector: 'app-budget-list',
  templateUrl: './budget-list.component.html',
  styleUrls: ['./budget-list.component.scss'],
})
export class BudgetListComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private caisseService = inject(CaisseService);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);

  budgets$!: Observable<BudgetAvecStats[]>;
  caisses: Caisse[] = [];
  loading = true;
  Math = Math;

  // Filtres
  filtrePeriode = 'tous';
  filtreStatut = 'tous';
  filtreCaisseId = 'toutes';

  filteredBudgets: BudgetAvecStats[] = [];
  allBudgets: BudgetAvecStats[] = [];

  ngOnInit(): void {
    this.loadCaisses();
    this.loadBudgets();
  }

  private loadCaisses(): void {
    this.caisseService.getAll().subscribe(c => {
      this.caisses = c;
    });
  }

  private loadBudgets(): void {
    this.loading = true;
    this.budgets$ = this.budgetService.getAll();

    this.budgets$.subscribe(budgets => {
      this.allBudgets = budgets;
      this.applyFiltres(budgets);
      this.loading = false;
    });
  }

  // Méthode appelée quand un filtre change
  onFiltreChange(budgets: BudgetAvecStats[]): void {
    this.applyFiltres(budgets);
  }

  // Méthode qui applique les filtres (attend un paramètre)
  applyFiltres(budgets: BudgetAvecStats[]): void {
    this.filteredBudgets = budgets.filter(b => {
      // Filtre période
      const periodeOk = this.filtrePeriode === 'tous' || b.periode === this.filtrePeriode;

      // Filtre statut
      let statutOk = true;
      if (this.filtreStatut === 'normal') statutOk = !b.estEnAlerte && b.tauxConsommation < 100;
      else if (this.filtreStatut === 'alerte') statutOk = b.estEnAlerte && b.tauxConsommation < 100;
      else if (this.filtreStatut === 'depasse') statutOk = b.tauxConsommation >= 100;

      // Filtre caisse
      const caisseOk = this.filtreCaisseId === 'toutes' || b.caisseId === this.filtreCaisseId;

      return periodeOk && statutOk && caisseOk;
    });
  }

  // Réinitialiser les filtres
  resetFiltres(budgets: BudgetAvecStats[]): void {
    this.filtrePeriode = 'tous';
    this.filtreStatut = 'tous';
    this.filtreCaisseId = 'toutes';
    this.applyFiltres(budgets);
    this.toastr.info('Filtres réinitialisés');
  }

  // Vérifier si des filtres sont actifs
  hasActiveFilters(): boolean {
    return this.filtrePeriode !== 'tous' ||
           this.filtreStatut !== 'tous' ||
           this.filtreCaisseId !== 'toutes';
  }

  get alertesBudgets(): BudgetAvecStats[] {
    return this.filteredBudgets.filter(b => b.estEnAlerte || b.tauxConsommation >= 100);
  }

  get totalBudgetPrevu(): number {
    return this.filteredBudgets.reduce((sum, b) => sum + b.montantPrevu, 0);
  }

  get totalBudgetDepense(): number {
    return this.filteredBudgets.reduce((sum, b) => sum + b.montantDepense, 0);
  }

  get tauxGlobal(): number {
    if (this.totalBudgetPrevu === 0) return 0;
    return Math.round((this.totalBudgetDepense / this.totalBudgetPrevu) * 100);
  }

  getGlobalTauxClass(): string {
    if (this.tauxGlobal >= 100) return 'danger';
    if (this.tauxGlobal >= 80) return 'warning';
    return 'normal';
  }

  getBarreClass(b: BudgetAvecStats): string {
    if (b.tauxConsommation >= 100) return 'danger';
    if (b.tauxConsommation >= b.seuilAlerte) return 'warning';
    return 'normal';
  }

  getPeriodeLabel(b: BudgetAvecStats): string {
    if (b.periode === 'annuel') {
      return `Année ${b.annee}`;
    }
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${mois[(b.mois ?? 1) - 1]} ${b.annee}`;
  }

  scrollToBudget(budgetId?: string): void {
    if (!budgetId) return;
    const element = document.getElementById(`budget-${budgetId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight');
      setTimeout(() => element.classList.remove('highlight'), 2000);
    }
  }

  async onDelete(b: BudgetAvecStats): Promise<void> {
    const confirmed = confirm(`Supprimer le budget "${b.nom}" ?\n\nCette action est irréversible.`);
    if (!confirmed) return;

    try {
      await this.budgetService.delete(b.id!);
      this.toastr.success(`Budget "${b.nom}" supprimé avec succès`);
      this.loadBudgets(); // Recharger la liste
    } catch {
      this.toastr.error('Erreur lors de la suppression du budget');
    }
  }

  exportBudgets(): void {
    const headers = ['Nom', 'Caisse', 'Catégorie', 'Période', 'Prévu (FCFA)', 'Dépensé (FCFA)', 'Consommation', 'Statut'];
    const rows = this.filteredBudgets.map(b => [
      b.nom,
      b.caisseNom || '—',
      b.categorieNom || 'Toutes',
      this.getPeriodeLabel(b),
      b.montantPrevu.toString(),
      b.montantDepense.toString(),
      `${b.tauxConsommation}%`,
      b.tauxConsommation >= 100 ? 'Dépassé' : b.estEnAlerte ? 'Alerte' : 'Normal'
    ]);

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budgets_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastr.success('Export CSV effectué');
  }
}
