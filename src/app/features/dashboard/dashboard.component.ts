import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ChartConfiguration } from 'chart.js';
import { CaisseService } from '../../services/caisse.service';
import { OperationService } from '../../services/operation.service';
import { BudgetService } from '../../services/budget.service';
import { AuthService } from '../../services/auth.service';
import { Caisse } from '../../models/caisse.model';
import { Operation } from '../../models/operation.model';
import { BudgetAvecStats } from '../../models/budget.model';

interface KPI {
  label: string;
  value: number;
  color: string;
  isMontant: boolean;
  trend?: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private caisseService = inject(CaisseService);
  private opService = inject(OperationService);
  private budgetService = inject(BudgetService);
  auth = inject(AuthService);
  private router = inject(Router);

  Math = Math;
  today = new Date();
  loading = true;
  chartLoading = true;

  // Données
  caisses: Caisse[] = [];
  dernieresOperations: Operation[] = [];
  operationsEnAttente: Operation[] = [];
  budgets: BudgetAvecStats[] = [];
  budgetsEnAlerte: BudgetAvecStats[] = [];

  // KPIs
  kpis: KPI[] = [];

  // Graphique 6 mois
  chartMois: string[] = [];
  chartEntrees: number[] = [];
  chartSorties: number[] = [];
  chartColors: string[] = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0EA5E9', '#EC4899', '#6B7280'];

  // Catégories
  topCategories: { nom: string; total: number; pct: number }[] = [];

  // Configuration Chart.js
  chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = this.getBarChartOptions();

  pieChartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  pieChartOptions: ChartConfiguration['options'] = this.getPieChartOptions();

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private loadData(): void {
    this.loading = true;
    this.chartLoading = true;

    // Attendre que l'utilisateur soit chargé
    this.auth.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) {
        this.loading = false;
        return;
      }

      combineLatest([
        this.caisseService.getAll(),
        this.opService.getAll(),
        this.budgetService.getAll()
      ]).pipe(take(1)).subscribe({
        next: ([caisses, operations, budgets]) => {
          this.caisses = caisses;
          this.budgets = budgets;

          // Opérations en attente
          this.operationsEnAttente = operations.filter(o => o.statut === 'en_attente');

          // Dernières opérations (10 max)
          this.dernieresOperations = operations
            .filter(o => o.statut === 'validee')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);

          // Budgets en alerte
          this.budgetsEnAlerte = budgets.filter(b => b.estEnAlerte || b.tauxConsommation >= 100);

          // Calculer les KPIs
          this.calculateKPIs(operations, budgets);

          // Charger le graphique
          this.loadChartData(operations);

          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur chargement dashboard:', err);
          this.loading = false;
          this.chartLoading = false;
        }
      });
    });
  }

  private calculateKPIs(operations: Operation[], budgets: BudgetAvecStats[]): void {
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutMoisPrecedent = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const finMoisPrecedent = new Date(now.getFullYear(), now.getMonth(), 0);

    const opsValidees = operations.filter(o => o.statut === 'validee');

    const entreesMois = opsValidees
      .filter(o => this.estEntree(o) && new Date(o.date) >= debutMois)
      .reduce((s, o) => s + o.montant, 0);

    const sortiesMois = opsValidees
      .filter(o => this.estSortie(o) && new Date(o.date) >= debutMois)
      .reduce((s, o) => s + o.montant, 0);

    const entreesMoisPrecedent = opsValidees
      .filter(o => this.estEntree(o) && new Date(o.date) >= debutMoisPrecedent && new Date(o.date) <= finMoisPrecedent)
      .reduce((s, o) => s + o.montant, 0);

    const sortiesMoisPrecedent = opsValidees
      .filter(o => this.estSortie(o) && new Date(o.date) >= debutMoisPrecedent && new Date(o.date) <= finMoisPrecedent)
      .reduce((s, o) => s + o.montant, 0);

    const soldeTotal = this.caisses.reduce((s, c) => s + (c.solde || 0), 0);
    const nbBudgetsActifs = budgets.filter(b => b.actif).length;
    const nbBudgetsAlerte = this.budgetsEnAlerte.length;

    const trendEntrees = entreesMoisPrecedent > 0
      ? Math.round(((entreesMois - entreesMoisPrecedent) / entreesMoisPrecedent) * 100)
      : 0;

    const trendSorties = sortiesMoisPrecedent > 0
      ? Math.round(((sortiesMois - sortiesMoisPrecedent) / sortiesMoisPrecedent) * 100)
      : 0;

    this.kpis = [
      { label: 'Solde total', value: soldeTotal, color: 'var(--navy-600)', isMontant: true },
      { label: 'Entrées ce mois', value: entreesMois, color: 'var(--color-success)', isMontant: true, trend: trendEntrees },
      { label: 'Sorties ce mois', value: sortiesMois, color: 'var(--color-danger)', isMontant: true, trend: trendSorties },
      { label: 'Budgets actifs', value: nbBudgetsActifs, color: 'var(--navy-400)', isMontant: false },
    ];

    if (nbBudgetsAlerte > 0) {
      this.kpis.push({ label: 'Budgets en alerte', value: nbBudgetsAlerte, color: 'var(--color-warning)', isMontant: false });
    }
  }

  private loadChartData(operations: Operation[]): void {
    const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    const labels: string[] = [];
    const entrees: number[] = [];
    const sorties: number[] = [];
    const catMap = new Map<string, number>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(MOIS[d.getMonth()]);
      entrees.push(0);
      sorties.push(0);
    }

    const debut = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    const opsFiltrees = operations.filter(o => o.statut === 'validee' && new Date(o.date) >= debut);

    opsFiltrees.forEach(op => {
      const date = new Date(op.date);
      const diff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
      const idx = 5 - diff;
      if (idx < 0 || idx > 5) return;

      if (this.estEntree(op)) {
        entrees[idx] = Math.round(entrees[idx] + op.montant);
      }
      if (this.estSortie(op)) {
        sorties[idx] = Math.round(sorties[idx] + op.montant);
        const cat = op.categorieNom || 'Autre';
        catMap.set(cat, Math.round((catMap.get(cat) ?? 0) + op.montant));
      }
    });

    this.chartMois = labels;
    this.chartEntrees = entrees;
    this.chartSorties = sorties;

    // Top 5 catégories
    const totalSorties = sorties.reduce((a, b) => a + b, 0);
    this.topCategories = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nom, total]) => ({
        nom,
        total,
        pct: totalSorties > 0 ? Math.round((total / totalSorties) * 100) : 0
      }));

    this.updateChartData();
    this.updatePieChartData();
    this.chartLoading = false;
  }

  private updateChartData(): void {
    this.chartData = {
      labels: this.chartMois,
      datasets: [
        {
          label: 'Entrées',
          data: this.chartEntrees,
          backgroundColor: '#10B981',
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        },
        {
          label: 'Sorties',
          data: this.chartSorties,
          backgroundColor: '#EF4444',
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        }
      ]
    };
  }

  private updatePieChartData(): void {
    this.pieChartData = {
      labels: this.topCategories.map(c => c.nom),
      datasets: [{
        data: this.topCategories.map(c => c.total),
        backgroundColor: this.chartColors.slice(0, this.topCategories.length),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }

  private getBarChartOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#112240',
          titleColor: '#FFFFFF',
          bodyColor: '#D0D5E8',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const value = context.raw as number;
              return `${context.dataset.label}: ${value.toLocaleString('fr-FR')} FCFA`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 }, color: '#68708A' }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#EDEEF2' },
          ticks: {
            font: { family: 'DM Mono', size: 11 },
            color: '#8E95A9',
            callback: (value) => {
              const num = value as number;
              if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
              if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
              return num.toString();
            }
          }
        }
      }
    };
  }

private getPieChartOptions(): ChartConfiguration['options'] {
  return {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 200 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#112240',
        titleColor: '#FFFFFF',
        bodyColor: '#D0D5E8',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percent = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value.toLocaleString('fr-FR')} FCFA (${percent}%)`;
          }
        }
      }
    },
    // cutout n'est pas dans le type de base, on utilise une assertion de type
    ...({ cutout: '65%' } as any)
  };
}

  // Helpers
  estEntree(op: Operation): boolean {
    if (op.type === 'entree') return true;
    if (op.type === 'transfert') return op.sens === 'entree' || op.transfertCaisseDestId !== op.caisseId;
    return false;
  }

  estSortie(op: Operation): boolean {
    if (op.type === 'sortie') return true;
    if (op.type === 'transfert') return op.sens === 'sortie' || op.transfertCaisseDestId === op.caisseId;
    return false;
  }

  toDate(val: any): Date {
    if (!val) return new Date();
    if (val.toDate) return val.toDate();
    if (val instanceof Date) return val;
    return new Date(val);
  }

  get totalChartEntrees(): number {
    return this.chartEntrees.reduce((a, b) => a + b, 0);
  }

  get totalChartSorties(): number {
    return this.chartSorties.reduce((a, b) => a + b, 0);
  }

  get soldeTotal(): number {
    return this.caisses.reduce((s, c) => s + (c.solde || 0), 0);
  }
}
