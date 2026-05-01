import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { OperationService } from '../../../services/operation.service';
import { CaisseService } from '../../../services/caisse.service';
import { AuthService } from '../../../services/auth.service';
import { Operation } from '../../../models/operation.model';
import { Caisse } from '../../../models/caisse.model';
import { ToastrService } from 'ngx-toastr';
import { VocabulaireMetier } from '../../../models/templates.data';
import { VocabulaireService } from '../../../services/vocabulaire.service';

@Component({
  selector: 'app-operation-list',
  templateUrl: './operation-list.component.html',
  styleUrls: ['./operation-list.component.scss'],
})
export class OperationListComponent implements OnInit, OnDestroy {
  private opService = inject(OperationService);
  private caisseService = inject(CaisseService);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);

  operationsRaw: Operation[] = [];
  operationsFiltered: Operation[] = [];
  caisses: Caisse[] = [];
  loading = true;
  selectedOps: Set<string> = new Set();
  showValidationBar = false;

  selectedCaisseTab: string = 'toutes';
  Math = Math;

  filtreStatut = 'tous';
  filtreType = 'tous';
  filtreCaisseId = 'toutes';
  filtreSearch = '';
  filtreDateDebut = '';
  filtreDateFin = '';

  // Modal de détail
  selectedOperation: Operation | null = null;

  evolutionEntrees: number | null = null;
  evolutionSorties: number | null = null;

  private opsSub?: Subscription;
  private userSub?: Subscription;

  private vocabulaireService = inject(VocabulaireService);
  comportement$ = this.vocabulaireService.comportement$;

  get v(): VocabulaireMetier {
    return this.vocabulaireService.vocabulaire;
  }

  ngOnInit(): void {
    this.vocabulaireService.loadVocabulaire(); // Attendre que le profil utilisateur soit chargé avant de lancer les requêtes Firestore
    this.userSub = this.auth.currentUser$
      .pipe(
        filter((user) => user !== null && !!user.organisationId),
        take(1),
      )
      .subscribe(() => {
        this.loadData();
        this.loadCaisses();
      });
  }

  ngOnDestroy(): void {
    this.opsSub?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  private loadData(): void {
    this.loading = true;
    this.opsSub?.unsubscribe();
    this.opsSub = this.opService.getAll().subscribe({
      next: (ops) => {
        this.operationsRaw = ops;
        this.applyFiltres();
        this.calculateEvolution();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement opérations:', err);
        this.toastr.error('Impossible de charger les opérations');
        this.loading = false;
      },
    });
  }

  private loadCaisses(): void {
    this.caisseService.getAll().subscribe((c) => (this.caisses = c));
  }

  get totalEntrees(): number {
    return this.operationsFiltered
      .filter(
        (o) =>
          o.statut === 'validee' &&
          (o.type === 'entree' ||
            (o.type === 'transfert' && o.sens === 'entree')),
      )
      .reduce((s, o) => s + o.montant, 0);
  }

  get totalSorties(): number {
    return this.operationsFiltered
      .filter(
        (o) =>
          o.statut === 'validee' &&
          (o.type === 'sortie' ||
            (o.type === 'transfert' && o.sens === 'sortie')),
      )
      .reduce((s, o) => s + o.montant, 0);
  }

  get soldeNet(): number {
    return this.totalEntrees - this.totalSorties;
  }

  get nbEnAttente(): number {
    return this.operationsFiltered.filter((o) => o.statut === 'en_attente')
      .length;
  }

  applyFiltres(): void {
    this.operationsFiltered = this.operationsRaw.filter((op) => {
      const statutOk =
        this.filtreStatut === 'tous' || op.statut === this.filtreStatut;
      const typeOk = this.filtreType === 'tous' || op.type === this.filtreType;
      const caisseOk =
        this.filtreCaisseId === 'toutes' || op.caisseId === this.filtreCaisseId;
      const searchOk =
        !this.filtreSearch ||
        op.libelle?.toLowerCase().includes(this.filtreSearch.toLowerCase()) ||
        (op.responsableNom ?? '')
          .toLowerCase()
          .includes(this.filtreSearch.toLowerCase()) ||
        (op.numeroPiece ?? '')
          .toLowerCase()
          .includes(this.filtreSearch.toLowerCase());
      const dateOk = this.checkDate(op);
      return statutOk && typeOk && caisseOk && searchOk && dateOk;
    });
  }

  private checkDate(op: Operation): boolean {
    if (!this.filtreDateDebut && !this.filtreDateFin) return true;
    const d = this.toDate(op.date);
    if (this.filtreDateDebut && d < new Date(this.filtreDateDebut))
      return false;
    if (this.filtreDateFin) {
      const fin = new Date(this.filtreDateFin);
      fin.setHours(23, 59, 59);
      if (d > fin) return false;
    }
    return true;
  }

  private calculateEvolution(): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentEntrees = this.operationsRaw
      .filter(
        (o) =>
          o.type === 'entree' &&
          o.statut === 'validee' &&
          this.toDate(o.date).getMonth() === currentMonth &&
          this.toDate(o.date).getFullYear() === currentYear,
      )
      .reduce((s, o) => s + o.montant, 0);

    const lastMonthEntrees = this.operationsRaw
      .filter(
        (o) =>
          o.type === 'entree' &&
          o.statut === 'validee' &&
          this.toDate(o.date).getMonth() ===
            (currentMonth === 0 ? 11 : currentMonth - 1) &&
          this.toDate(o.date).getFullYear() ===
            (currentMonth === 0 ? currentYear - 1 : currentYear),
      )
      .reduce((s, o) => s + o.montant, 0);

    if (lastMonthEntrees > 0) {
      this.evolutionEntrees = Math.round(
        ((currentEntrees - lastMonthEntrees) / lastMonthEntrees) * 100,
      );
    }

    const currentSorties = this.operationsRaw
      .filter(
        (o) =>
          o.type === 'sortie' &&
          o.statut === 'validee' &&
          this.toDate(o.date).getMonth() === currentMonth &&
          this.toDate(o.date).getFullYear() === currentYear,
      )
      .reduce((s, o) => s + o.montant, 0);

    const lastMonthSorties = this.operationsRaw
      .filter(
        (o) =>
          o.type === 'sortie' &&
          o.statut === 'validee' &&
          this.toDate(o.date).getMonth() ===
            (currentMonth === 0 ? 11 : currentMonth - 1) &&
          this.toDate(o.date).getFullYear() ===
            (currentMonth === 0 ? currentYear - 1 : currentYear),
      )
      .reduce((s, o) => s + o.montant, 0);

    if (lastMonthSorties > 0) {
      this.evolutionSorties = Math.round(
        ((currentSorties - lastMonthSorties) / lastMonthSorties) * 100,
      );
    }
  }

  hasActiveFilters(): boolean {
    return (
      this.filtreStatut !== 'tous' ||
      this.filtreType !== 'tous' ||
      this.filtreCaisseId !== 'toutes' ||
      !!this.filtreSearch ||
      !!this.filtreDateDebut ||
      !!this.filtreDateFin
    );
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
    const caisse = this.caisses.find((c) => c.id === caisseId);
    return caisse?.couleur || 'var(--color-gray-400)';
  }

  async onValider(op: Operation): Promise<void> {
    try {
      await this.opService.valider(op);
      this.toastr.success(`✓ "${op.libelle}" a été validée avec succès`);
    } catch (err: any) {
      this.toastr.error(err.message ?? 'Erreur lors de la validation');
    }
  }

  async onRejeter(op: Operation): Promise<void> {
    const reason = prompt(`Motif du rejet pour "${op.libelle}" :`);
    if (reason === null) return;

    try {
      await this.opService.rejeter(op.id!);
      this.toastr.warning(
        `Opération "${op.libelle}" rejetée${reason ? ` : ${reason}` : ''}`,
      );
    } catch {
      this.toastr.error('Erreur lors du rejet');
    }
  }

  // ─── Modal détail ────────────────────────────────────────────────────────────
  openDetail(op: Operation): void {
    this.selectedOperation = {
      ...op,
      date: this.toDate(op.date),
      createdAt: this.toDate(op.createdAt),
    };
  }

  closeDetail(): void {
    this.selectedOperation = null;
  }

  estEntree(op: Operation): boolean {
    if (op.type === 'entree') return true;
    if (op.type === 'transfert') return op.sens === 'entree';
    return false;
  }

  exportToCSV(): void {
    const headers = [
      'Date',
      'Libellé',
      'Caisse',
      'Catégorie',
      'Type',
      'Statut',
      'Montant',
      'Responsable',
    ];
    const rows = this.operationsFiltered.map((op) => [
      this.toDate(op.date).toLocaleDateString('fr-FR'),
      op.libelle,
      op.caisseNom || '',
      op.categorieNom || '',
      op.type,
      op.statut,
      op.montant.toString(),
      op.responsableNom || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `operations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastr.success('Export CSV effectué');
  }

  get caisseTabs(): { id: string; nom: string; couleur: string }[] {
    return this.caisses.map((c) => ({
      id: c.id!,
      nom: c.nom,
      couleur: c.couleur || 'var(--gray-400)',
    }));
  }

  filterByCaisseTab(): void {
    if (this.selectedCaisseTab === 'toutes') {
      this.filtreCaisseId = 'toutes';
    } else {
      this.filtreCaisseId = this.selectedCaisseTab;
    }
    this.applyFiltres();
  }

  toggleOpSelection(op: Operation): void {
    if (!op.id) return;
    if (this.selectedOps.has(op.id)) {
      this.selectedOps.delete(op.id);
    } else {
      this.selectedOps.add(op.id);
    }
    this.showValidationBar = this.selectedOps.size > 0;
  }

  isOpSelected(op: Operation): boolean {
    return !!op.id && this.selectedOps.has(op.id);
  }

  selectAllPending(): void {
    const pendingOps = this.operationsFiltered.filter(
      (o) => o.statut === 'en_attente',
    );
    if (this.selectedOps.size === pendingOps.length) {
      this.selectedOps.clear();
      this.showValidationBar = false;
    } else {
      pendingOps.forEach((o) => {
        if (o.id) this.selectedOps.add(o.id);
      });
      this.showValidationBar = this.selectedOps.size > 0;
    }
  }

  async validerSelection(): Promise<void> {
    const ids = Array.from(this.selectedOps);
    if (ids.length === 0) return;

    try {
      await this.opService.validerBatch(ids);

      this.toastr.success(`${ids.length} opération(s) validée(s) avec succès`);
      this.selectedOps.clear();
      this.showValidationBar = false;
      this.loadData();
    } catch (err: any) {
      this.toastr.error(err.message || 'Erreur lors de la validation');
    }
  }
  /**
   *  Vérifie si toutes les opérations en attente sont sélectionnées
   */
  allPendingSelected(): boolean {
    const pendingOps = this.operationsFiltered.filter(
      (o) => o.statut === 'en_attente',
    );
    if (pendingOps.length === 0) return false;
    return pendingOps.every((o) => o.id && this.selectedOps.has(o.id));
  }
}
