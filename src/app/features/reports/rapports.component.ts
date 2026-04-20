import { Component, OnInit, inject } from '@angular/core';
import { RapportService, RapportData } from '../../services/rapport.service';
import { CaisseService } from '../../services/caisse.service';
import { AuthService } from '../../services/auth.service';
import { Caisse } from '../../models/caisse.model';
import { Operation } from '../../models/operation.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-rapports',
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.scss'],
})
export class RapportsComponent implements OnInit {
  private rapportService = inject(RapportService);
  private caisseService = inject(CaisseService);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);

  caisses: Caisse[] = [];
  loading = false;
  rapport: RapportData | null = null;

  // Paramètres de génération
  dateDebut: string;
  dateFin: string;
  caisseId = '';

  // Affichage
  onglet: 'synthese' | 'operations' | 'categories' | 'caisses' = 'synthese';
  searchTerm = '';

  constructor() {
    const now = new Date();
    this.dateFin = now.toISOString().split('T')[0];
    const debut = new Date(now.getFullYear(), now.getMonth(), 1);
    this.dateDebut = debut.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.caisseService.getAll().subscribe(c => this.caisses = c);
  }

  get filteredOperations(): Operation[] {
    if (!this.rapport) return [];
    if (!this.searchTerm) return this.rapport.operations;
    const term = this.searchTerm.toLowerCase();
    return this.rapport.operations.filter(op =>
      op.libelle?.toLowerCase().includes(term) ||
      op.caisseNom?.toLowerCase().includes(term) ||
      op.categorieNom?.toLowerCase().includes(term)
    );
  }

  get tauxSorties(): number {
    if (!this.rapport || this.rapport.totalEntrees === 0) return 0;
    return Math.round((this.rapport.totalSorties / this.rapport.totalEntrees) * 100);
  }

  get tendanceEntrees(): number {
    // À implémenter avec comparaison période précédente
    return 12;
  }

  get tendanceSorties(): number {
    return 8;
  }

  getPendingCount(): number {
    if (!this.rapport) return 0;
    return this.rapport.operations.filter(op => op.statut === 'en_attente').length;
  }

  getTauxClass(): string {
    if (this.tauxSorties >= 90) return 'danger';
    if (this.tauxSorties >= 75) return 'warning';
    return 'normal';
  }

  getCategoryPercent(total: number): number {
    if (!this.rapport) return 0;
    const grandTotal = this.rapport.totalEntrees + this.rapport.totalSorties;
    if (grandTotal === 0) return 0;
    return Math.round((total / grandTotal) * 100);
  }

  getTotalCategories(): number {
    if (!this.rapport) return 0;
    return this.rapport.parCategorie.reduce((sum, c) => sum + c.total, 0);
  }

  getCategoryColor(categoryName: string): string {
    const colors = ['#10B981', '#0f4c75', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = ((hash << 5) - hash) + categoryName.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getCaissePerformance(c: { entrees: number; sorties: number }): number {
    if (c.entrees === 0) return 0;
    return Math.round((c.sorties / c.entrees) * 100);
  }

  getSelectedCaisseName(): string {
    const caisse = this.caisses.find(c => c.id === this.caisseId);
    return caisse?.nom || '';
  }

  async generer(): Promise<void> {
    if (!this.dateDebut || !this.dateFin) {
      this.toastr.warning('Veuillez sélectionner une période');
      return;
    }

    this.loading = true;
    try {
      this.rapport = await this.rapportService.generer(
        new Date(this.dateDebut),
        new Date(this.dateFin),
        this.caisseId || undefined,
      );
      this.onglet = 'synthese';
      this.searchTerm = '';
      this.toastr.success('Rapport généré avec succès');
    } catch (err: any) {
      this.toastr.error('Erreur lors de la génération du rapport');
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  setMoisActuel(): void {
    const now = new Date();
    this.dateDebut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    this.dateFin = now.toISOString().split('T')[0];
  }

  setMoisPrecedent(): void {
    const now = new Date();
    const debut = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fin = new Date(now.getFullYear(), now.getMonth(), 0);
    this.dateDebut = debut.toISOString().split('T')[0];
    this.dateFin = fin.toISOString().split('T')[0];
  }

  setTrimestre(): void {
    const now = new Date();
    const trimestre = Math.floor(now.getMonth() / 3);
    const debut = new Date(now.getFullYear(), trimestre * 3, 1);
    this.dateDebut = debut.toISOString().split('T')[0];
    this.dateFin = now.toISOString().split('T')[0];
  }

  setAnneeActuelle(): void {
    const now = new Date();
    this.dateDebut = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    this.dateFin = now.toISOString().split('T')[0];
  }

  onExportCSV(): void {
    if (!this.rapport) return;
    this.rapportService.exportCSV(this.rapport);
    this.toastr.success('Export CSV téléchargé');
  }

  async onExportExcel(): Promise<void> {
    if (!this.rapport) return;
    try {
      const caisseName = this.getSelectedCaisseName() || undefined;
      await this.rapportService.exportExcel(this.rapport, caisseName);
      this.toastr.success('Export Excel téléchargé');
    } catch (err) {
      console.error(err);
      this.toastr.error('Erreur lors de l\'export Excel');
    }
  }

  async onExportPDF(): Promise<void> {
    if (!this.rapport) return;
    try {
      const caisseName = this.getSelectedCaisseName() || undefined;
      await this.rapportService.exportPDF(this.rapport, caisseName);
      this.toastr.success('Export PDF téléchargé');
    } catch (err) {
      console.error(err);
      this.toastr.error('Erreur lors de l\'export PDF');
    }
  }

  onExportJSON(): void {
    if (!this.rapport) return;
    this.rapportService.exportJSON(this.rapport);
    this.toastr.success('Export JSON téléchargé');
  }

  printRapport(): void {
    window.print();
  }

  toDate(val: any): Date {
    if (val instanceof Date) return val;
    return val?.toDate?.() ?? new Date();
  }
}
