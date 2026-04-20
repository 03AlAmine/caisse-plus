import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Firestore, collection, query, where, orderBy, getDocs, Timestamp,
} from '@angular/fire/firestore';
import { CaisseService } from '../../../services/caisse.service';
import { OperationService } from '../../../services/operation.service';
import { AuthService } from '../../../services/auth.service';
import { Caisse } from '../../../models/caisse.model';
import { Operation } from '../../../models/operation.model';
import { ToastrService } from 'ngx-toastr';

// ─── Ligne du livre de caisse ─────────────────────────────────────────────────
export interface LigneLivre {
  type: 'ouverture' | 'operation' | 'cloture';
  operation?: Operation;
  libelle: string;
  entree: number | null;
  sortie: number | null;
  solde: number;
  numeroPiece?: string;
  date?: Date;
}

// ─── Données complètes d'un mois ──────────────────────────────────────────────
export interface MoisData {
  annee: number;
  mois: number;
  label: string;
  soldOuverture: number;
  totalEntrees: number;
  totalSorties: number;
  soldeCloture: number;
  lignes: LigneLivre[];
}

@Component({
  selector: 'app-caisse-detail',
  templateUrl: './caisse-detail.component.html',
  styleUrls: ['./caisse-detail.component.scss'],
})
export class CaisseDetailComponent implements OnInit, OnDestroy {
  private route         = inject(ActivatedRoute);
  private firestore     = inject(Firestore);
  private caisseService = inject(CaisseService);
  private opService     = inject(OperationService);
  auth                  = inject(AuthService);
  private router        = inject(Router);
  private toastr        = inject(ToastrService);

  caisse?: Caisse;
  caisseId = '';

  // Sélecteur de mois
  moisSelectionne: number;
  anneeSelectionnee: number;
  moisDisponibles: { annee: number; mois: number; label: string }[] = [];

  // Données du mois courant
  moisData: MoisData | null = null;
  loadingMois   = false;
  loadingSolde  = false;   // vrai pendant le calcul du solde d'ouverture
  opsMois: Operation[] = [];

  // Stats globales
  totalEntreesGlobal   = 0;
  totalSortiesGlobal   = 0;
  totalOperationsGlobal = 0;

  // ── Données tableau de bord par caisse ───────────────────────────────────
  chartMois:    string[]   = [];
  chartEntrees: number[]   = [];
  chartSorties: number[]   = [];
  chartLoading  = true;
  topCategories: { nom: string; total: number; pct: number }[] = [];

  // Tendance vs mois précédent (%)
  tendanceEntrees: number | null = null;
  tendanceSorties: number | null = null;

  // SVG chart constants
  readonly CHART_W    = 480;
  readonly CHART_H    = 140;
  readonly CHART_PAD_L = 52;
  readonly CHART_PAD_B = 26;
  readonly CHART_PAD_T = 14;
  readonly CHART_PAD_R = 12;

  // Filtres
  filtreStatut = 'tous';
  filtreType   = 'tous';

  // Modal
  selectedOperation: Operation | null = null;

  private caisseSub?: Subscription;
  private opsSub?:    Subscription;
  private moisSub?:   Subscription;

  private readonly MOIS_NOMS = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
  ];

  constructor() {
    const now = new Date();
    this.moisSelectionne   = now.getMonth() + 1;
    this.anneeSelectionnee = now.getFullYear();
  }

  nomMois(m: number): string { return this.MOIS_NOMS[m - 1]; }
  labelMois(a: number, m: number): string { return `${this.nomMois(m)} ${a}`; }

  ngOnInit(): void {
    this.caisseId = this.route.snapshot.paramMap.get('id')!;
    this.buildMoisDisponibles();

    // Charger la caisse (réactif) — sert uniquement à afficher les stats globales
    this.caisseSub = this.caisseService.getById(this.caisseId).pipe(
      map((c: Caisse) => ({ ...c, createdAt: this.toDate(c.createdAt) as Date }))
    ).subscribe(c => {
      this.caisse = c;
      // Le solde d'ouverture est calculé séparément via getSoldeAvantDate()
      // on ne re-construit pas le livre ici pour éviter un double rendu
    });

    // Stats globales (flux complet)
    this.opsSub = this.opService.getAllByCaisse(this.caisseId).pipe(
      map(ops => ops.map(op => ({ ...op, date: this.toDate(op.date) as Date, createdAt: this.toDate(op.createdAt) as Date })))
    ).subscribe(ops => {
      this.totalOperationsGlobal = ops.length;
      this.totalEntreesGlobal    = ops.filter(o => o.statut === 'validee' && this.estEntree(o)).reduce((s, o) => s + o.montant, 0);
      this.totalSortiesGlobal    = ops.filter(o => o.statut === 'validee' && this.estSortie(o)).reduce((s, o) => s + o.montant, 0);
    });

    this.chargerMois();
  }

  ngOnDestroy(): void {
    this.caisseSub?.unsubscribe();
    this.opsSub?.unsubscribe();
    this.moisSub?.unsubscribe();
  }

  // ─── Sélecteur de mois ───────────────────────────────────────────────────────
  private buildMoisDisponibles(): void {
    this.moisDisponibles = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      this.moisDisponibles.push({
        annee: d.getFullYear(),
        mois:  d.getMonth() + 1,
        label: this.labelMois(d.getFullYear(), d.getMonth() + 1),
      });
    }
  }

  onMoisChange(value: string): void {
    const [annee, mois] = value.split('-').map(Number);
    this.anneeSelectionnee = annee;
    this.moisSelectionne   = mois;
    this.chargerMois();
  }

  get moisSelectionneeValue(): string {
    return `${this.anneeSelectionnee}-${String(this.moisSelectionne).padStart(2,'0')}`;
  }

  moisPrecedent(): void {
    const d = new Date(this.anneeSelectionnee, this.moisSelectionne - 2, 1);
    this.anneeSelectionnee = d.getFullYear();
    this.moisSelectionne   = d.getMonth() + 1;
    this.chargerMois();
  }

  moisSuivant(): void {
    const d = new Date(this.anneeSelectionnee, this.moisSelectionne, 1);
    if (d > new Date()) return;
    this.anneeSelectionnee = d.getFullYear();
    this.moisSelectionne   = d.getMonth() + 1;
    this.chargerMois();
  }

  get estMoisCourant(): boolean {
    const now = new Date();
    return this.anneeSelectionnee === now.getFullYear() && this.moisSelectionne === now.getMonth() + 1;
  }

  // ─── Chargement du mois ───────────────────────────────────────────────────────
  chargerMois(): void {
    this.loadingMois  = true;
    this.loadingSolde = true;
    this.moisSub?.unsubscribe();

    // Date du 1er jour du mois sélectionné — sert de borne pour le solde d'ouverture
    const debutMois = new Date(this.anneeSelectionnee, this.moisSelectionne - 1, 1, 0, 0, 0, 0);

    // Calcul du solde d'ouverture exact (somme de toutes les ops validées avant ce mois)
    this.opService.getSoldeAvantDate(this.caisseId, debutMois).then(soldOuverture => {
      this.loadingSolde = false;

      // Écouter les opérations du mois en temps réel
      this.moisSub = this.opService
        .getByCaisseMois(this.caisseId, this.anneeSelectionnee, this.moisSelectionne)
        .pipe(map(ops => ops.map(op => ({
          ...op,
          date:      this.toDate(op.date) as Date,
          createdAt: this.toDate(op.createdAt) as Date,
        }))))
        .subscribe(ops => {
          this.opsMois  = ops;
          this.moisData = this.buildMoisData(ops, soldOuverture);
          this.loadingMois = false;
        });
    }).catch(() => {
      // En cas d'erreur Firestore (index manquant, etc.), fallback sur le solde actuel
      this.loadingSolde = false;
      this.moisSub = this.opService
        .getByCaisseMois(this.caisseId, this.anneeSelectionnee, this.moisSelectionne)
        .pipe(map(ops => ops.map(op => ({
          ...op,
          date:      this.toDate(op.date) as Date,
          createdAt: this.toDate(op.createdAt) as Date,
        }))))
        .subscribe(ops => {
          this.opsMois  = ops;
          // Fallback : reconstituer depuis le solde actuel (approximatif pour mois passés)
          const entreesMois = ops.filter(o => o.statut === 'validee' && this.estEntree(o)).reduce((s, o) => s + o.montant, 0);
          const sortiesMois = ops.filter(o => o.statut === 'validee' && this.estSortie(o)).reduce((s, o) => s + o.montant, 0);
          const soldeFallback = (this.caisse?.solde ?? 0) - entreesMois + sortiesMois;
          this.moisData = this.buildMoisData(ops, soldeFallback);
          this.loadingMois = false;
        });
    });
  }

  // ─── Construction du livre de caisse ─────────────────────────────────────────
  // soldOuverture est maintenant toujours exact : calculé par getSoldeAvantDate()
  // (somme nette de toutes les opérations validées antérieures au 1er du mois).
  buildMoisData(ops: Operation[], soldOuverture: number): MoisData {
    const entreesMois = Math.round(ops.filter(o => o.statut === 'validee' && this.estEntree(o)).reduce((s, o) => s + o.montant, 0));
    const sortiesMois = Math.round(ops.filter(o => o.statut === 'validee' && this.estSortie(o)).reduce((s, o) => s + o.montant, 0));

    // Appliquer les filtres UI
    const opsFiltrees = ops.filter(op => {
      const ok1 = this.filtreStatut === 'tous' || op.statut === this.filtreStatut;
      const ok2 = this.filtreType   === 'tous' || op.type   === this.filtreType;
      return ok1 && ok2;
    });

    const lignes: LigneLivre[] = [];
    let soldeCourant = soldOuverture;

    lignes.push({ type: 'ouverture', libelle: "Report à nouveau", entree: null, sortie: null, solde: soldOuverture });

    for (const op of opsFiltrees) {
      const isEntree = this.estEntree(op);
      if (op.statut === 'validee') {
        soldeCourant = Math.round(soldeCourant + (isEntree ? op.montant : -op.montant));
      }
      lignes.push({
        type: 'operation',
        operation: op,
        libelle: op.libelle,
        numeroPiece: op.numeroPiece,
        date: op.date as Date,
        entree: isEntree ? op.montant : null,
        sortie: !isEntree ? op.montant : null,
        solde: soldeCourant,
      });
    }

    lignes.push({ type: 'cloture', libelle: 'TOTAUX', entree: entreesMois, sortie: sortiesMois, solde: soldeCourant });

    return {
      annee: this.anneeSelectionnee, mois: this.moisSelectionne,
      label: this.labelMois(this.anneeSelectionnee, this.moisSelectionne),
      soldOuverture, totalEntrees: entreesMois, totalSorties: sortiesMois,
      soldeCloture: soldeCourant, lignes,
    };
  }

  // ── Graphique & stats par caisse ─────────────────────────────────────────

  private async loadChart(): Promise<void> {
    const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const now  = new Date();

    // Initialiser 6 buckets mensuels
    const labels:   string[]  = [];
    const entrees:  number[]  = [];
    const sorties:  number[]  = [];
    const catMap = new Map<string, number>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(MOIS[d.getMonth()]);
      entrees.push(0);
      sorties.push(0);
    }

    const debut = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    const q = query(
      collection(this.firestore, 'operations'),
      where('caisseId',       '==', this.caisseId),
      where('organisationId', '==', this.auth.organisationId),
      where('statut',         '==', 'validee'),
      where('date',           '>=', Timestamp.fromDate(debut)),
      orderBy('date', 'asc'),
    );
    const snap = await getDocs(q);

    snap.forEach(doc => {
      const op   = doc.data() as any;
      const date: Date = op.date?.toDate?.() ?? new Date(op.date);
      const diff = (now.getFullYear() - date.getFullYear()) * 12
                 + (now.getMonth()    - date.getMonth());
      const idx  = 5 - diff;
      if (idx < 0 || idx > 5) return;

      if (op.type === 'entree') entrees[idx] = Math.round(entrees[idx] + op.montant);
      if (op.type === 'sortie') {
        sorties[idx] = Math.round(sorties[idx] + op.montant);
        // Top catégories (sorties uniquement)
        const cat = op.categorieNom || 'Autre';
        catMap.set(cat, Math.round((catMap.get(cat) ?? 0) + op.montant));
      }
    });

    this.chartMois    = labels;
    this.chartEntrees = entrees;
    this.chartSorties = sorties;
    this.chartLoading = false;

    // Top 5 catégories
    const totalSorties = sorties.reduce((a, b) => a + b, 0);
    this.topCategories = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nom, total]) => ({
        nom, total,
        pct: totalSorties > 0 ? Math.round((total / totalSorties) * 100) : 0,
      }));

    // Tendance mois courant vs mois précédent
    const mC = 5; const mP = 4;
    if (entrees[mP] > 0)
      this.tendanceEntrees = Math.round(((entrees[mC] - entrees[mP]) / entrees[mP]) * 100);
    if (sorties[mP] > 0)
      this.tendanceSorties = Math.round(((sorties[mC] - sorties[mP]) / sorties[mP]) * 100);
  }

  // SVG helpers (même logique que dashboard)
  get chartMax(): number {
    return Math.max(...this.chartEntrees, ...this.chartSorties, 1);
  }
  get chartInnerW(): number { return this.CHART_W - this.CHART_PAD_L - this.CHART_PAD_R; }
  get chartInnerH(): number { return this.CHART_H - this.CHART_PAD_T - this.CHART_PAD_B; }
  get chartBottom(): number { return this.CHART_PAD_T + this.chartInnerH; }

  barX(i: number, offset: 0 | 1): number {
    const slotW = this.chartInnerW / 6;
    const barW  = slotW * 0.34;
    const gap   = slotW * 0.04;
    return this.CHART_PAD_L + i * slotW + slotW * 0.1 + offset * (barW + gap);
  }
  barW():          number { return (this.chartInnerW / 6) * 0.34; }
  barH(v: number): number { return Math.max(2, (v / this.chartMax) * this.chartInnerH); }
  barY(v: number): number { return this.CHART_PAD_T + this.chartInnerH - this.barH(v); }

  get yLabels(): { y: number; label: string }[] {
    return [0, 0.5, 1].map(p => ({
      y: this.CHART_PAD_T + this.chartInnerH * (1 - p),
      label: p === 0 ? '0' : this.fmtK(this.chartMax * p),
    }));
  }
  fmtK(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0','') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
    return String(Math.round(n));
  }

  appliquerFiltres(): void { this.chargerMois(); }
  resetFilters(): void {
    this.filtreStatut = 'tous';
    this.filtreType   = 'tous';
    this.chargerMois();
    this.toastr.info('Filtres réinitialisés');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  estEntree(op: Operation): boolean {
    if (op.type === 'entree') return true;
    if (op.type === 'transfert') {
      if (op.sens) return op.sens === 'entree';
      return op.transfertCaisseDestId === this.caisseId;
    }
    return false;
  }

  estSortie(op: Operation): boolean {
    if (op.type === 'sortie') return true;
    if (op.type === 'transfert') {
      if (op.sens) return op.sens === 'sortie';
      return op.transfertCaisseDestId !== this.caisseId;
    }
    return false;
  }

  toDate(val: any): Date | null {
    if (!val) return null;
    if (val.toDate) return val.toDate();
    if (val instanceof Date) return val;
    return null;
  }

  statutIcon(s: string): string { return s === 'validee' ? '✓' : s === 'en_attente' ? '⏳' : '✗'; }
  statutLabel(s: string): string {
    const m: Record<string, string> = { validee: 'Validée', en_attente: 'En attente', rejetee: 'Rejetée' };
    return m[s] ?? s;
  }

  viewOperationDetails(op: Operation): void {
    this.selectedOperation = { ...op, date: this.toDate(op.date) as Date };
  }
  closeOperationDetails(): void { this.selectedOperation = null; }

  goNouvelleOperation(): void {
    this.router.navigate(['/operations', 'nouveau'], { queryParams: { caisseId: this.caisseId } });
  }
}
