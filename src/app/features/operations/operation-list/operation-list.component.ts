import { Component, OnInit, inject } from '@angular/core';
import { OperationService } from '../../../services/operation.service';
import { CaisseService } from '../../../services/caisse.service';
import { AuthService } from '../../../services/auth.service';
import { Operation } from '../../../models/operation.model';
import { Caisse } from '../../../models/caisse.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-operation-list',
  templateUrl: './operation-list.component.html',
  styleUrls: ['./operation-list.component.scss'],
})
export class OperationListComponent implements OnInit {
  private opService = inject(OperationService);
  private caisseService = inject(CaisseService);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);

  operationsRaw: Operation[] = [];
  operationsFiltered: Operation[] = [];
  caisses: Caisse[] = [];
  loading = true;

  Math = Math;

  filtreStatut = 'tous';
  filtreType = 'tous';
  filtreCaisseId = 'toutes';
  filtreSearch = '';
  filtreDateDebut = '';
  filtreDateFin = '';

  evolutionEntrees: number | null = null;
  evolutionSorties: number | null = null;

  ngOnInit(): void {
    this.loadData();
    this.loadCaisses();
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.opService.getAll().subscribe(ops => {
      this.operationsRaw = ops;
      this.applyFiltres();
      this.calculateEvolution();
      this.loading = false;
    });
  }

  private loadCaisses(): void {
    this.caisseService.getAll().subscribe(c => this.caisses = c);
  }

  get totalEntrees(): number {
    return this.operationsFiltered
      .filter(o => o.type === 'entree' && o.statut === 'validee')
      .reduce((s, o) => s + o.montant, 0);
  }

  get totalSorties(): number {
    return this.operationsFiltered
      .filter(o => o.type === 'sortie' && o.statut === 'validee')
      .reduce((s, o) => s + o.montant, 0);
  }

  get soldeNet(): number {
    return this.totalEntrees - this.totalSorties;
  }

  get nbEnAttente(): number {
    return this.operationsFiltered.filter(o => o.statut === 'en_attente').length;
  }

  applyFiltres(): void {
    this.operationsFiltered = this.operationsRaw.filter(op => {
      const statutOk = this.filtreStatut === 'tous' || op.statut === this.filtreStatut;
      const typeOk = this.filtreType === 'tous' || op.type === this.filtreType;
      const caisseOk = this.filtreCaisseId === 'toutes' || op.caisseId === this.filtreCaisseId;
      const searchOk = !this.filtreSearch ||
        op.libelle?.toLowerCase().includes(this.filtreSearch.toLowerCase()) ||
        (op.responsableNom ?? '').toLowerCase().includes(this.filtreSearch.toLowerCase());
      const dateOk = this.checkDate(op);
      return statutOk && typeOk && caisseOk && searchOk && dateOk;
    });
  }

  private checkDate(op: Operation): boolean {
    if (!this.filtreDateDebut && !this.filtreDateFin) return true;
    const d = this.toDate(op.date);
    if (this.filtreDateDebut && d < new Date(this.filtreDateDebut)) return false;
    if (this.filtreDateFin) {
      const fin = new Date(this.filtreDateFin);
      fin.setHours(23, 59, 59);
      if (d > fin) return false;
    }
    return true;
  }

  private calculateEvolution(): void {
    // Calcul de l'évolution par rapport au mois précédent
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentEntrees = this.operationsRaw
      .filter(o => o.type === 'entree' && o.statut === 'validee' &&
            this.toDate(o.date).getMonth() === currentMonth &&
            this.toDate(o.date).getFullYear() === currentYear)
      .reduce((s, o) => s + o.montant, 0);

    const lastMonthEntrees = this.operationsRaw
      .filter(o => o.type === 'entree' && o.statut === 'validee' &&
            this.toDate(o.date).getMonth() === currentMonth - 1 &&
            this.toDate(o.date).getFullYear() === currentYear)
      .reduce((s, o) => s + o.montant, 0);

    if (lastMonthEntrees > 0) {
      this.evolutionEntrees = Math.round((currentEntrees - lastMonthEntrees) / lastMonthEntrees * 100);
    }

    // Calcul similaire pour les sorties...
  }

  hasActiveFilters(): boolean {
    return this.filtreStatut !== 'tous' ||
           this.filtreType !== 'tous' ||
           this.filtreCaisseId !== 'toutes' ||
           !!this.filtreSearch ||
           !!this.filtreDateDebut ||
           !!this.filtreDateFin;
  }

  toDate(val: any): Date {
    if (val instanceof Date) return val;
    return val?.toDate?.() ?? new Date();
  }

  resetFiltres(): void {
    this.filtreStatut = 'tous';
    this.filtreType = 'tous';
    this.filtreCaisseId = 'toutes';
    this.filtreSearch = '';
    this.filtreDateDebut = '';
    this.filtreDateFin = '';
    this.applyFiltres();
    this.toastr.info('Filtres réinitialisés');
  }

  getCaisseColor(caisseId: string): string {
    const caisse = this.caisses.find(c => c.id === caisseId);
    return caisse?.couleur || 'var(--color-gray-400)';
  }

  async onValider(op: Operation): Promise<void> {
    try {
      await this.opService.valider(op);
      this.toastr.success(`✓ "${op.libelle}" a été validée avec succès`);
      await this.loadData();
    } catch (err: any) {
      this.toastr.error(err.message ?? 'Erreur lors de la validation');
    }
  }

  async onRejeter(op: Operation): Promise<void> {
    const reason = prompt(`Motif du rejet pour "${op.libelle}" :`);
    if (reason === null) return;

    try {
      await this.opService.rejeter(op.id!);
      this.toastr.warning(`Opération "${op.libelle}" rejetée${reason ? ` : ${reason}` : ''}`);
      await this.loadData();
    } catch {
      this.toastr.error('Erreur lors du rejet');
    }
  }

  exportToCSV(): void {
    const headers = ['Date', 'Libellé', 'Caisse', 'Catégorie', 'Type', 'Statut', 'Montant', 'Responsable'];
    const rows = this.operationsFiltered.map(op => [
      this.toDate(op.date).toLocaleDateString('fr-FR'),
      op.libelle,
      op.caisseNom || '',
      op.categorieNom || '',
      op.type,
      op.statut,
      op.montant.toString(),
      op.responsableNom || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `operations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastr.success('Export CSV effectué');
  }
}
