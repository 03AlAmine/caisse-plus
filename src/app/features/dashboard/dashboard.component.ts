import { Component, OnInit, inject } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy, limit, getDocs,
} from '@angular/fire/firestore';
import { ActivatedRoute } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { BudgetService, BudgetAvecStats } from '../../services/budget.service';
import { ToastrService } from 'ngx-toastr';
import { Operation } from '../../models/operation.model';
import { Caisse } from '../../models/caisse.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private firestore = inject(Firestore);
  private budgetService = inject(BudgetService);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);

  loading = true;
  soldePrincipal = 0;
  totalEntreesMois = 0;
  totalSortiesMois = 0;
  nombreCaisses = 0;
  caisses: Caisse[] = [];
  dernieresOperations: Operation[] = [];
  operationsEnAttente: Operation[] = [];
  budgetsEnAlerte: BudgetAvecStats[] = [];
  today: Date = new Date();

  Math = Math;

  get userName(): string {
    const user = this.auth.currentUser;
    if (!user) return 'Utilisateur';
    return user.displayName || user.email?.split('@')[0] || 'Utilisateur';
  }

  get kpis() {
    return [
      {
        label: 'Solde global',
        value: this.soldePrincipal,
        icon: '💰',
        color: '#0A1628',
        bgColor: '#E8EDF5',
        isMontant: true,
        trend: null,
      },
      {
        label: 'Entrées ce mois',
        value: this.totalEntreesMois,
        icon: '📈',
        color: '#00A86B',
        bgColor: '#D4F5E9',
        isMontant: true,
        trend: null,
      },
      {
        label: 'Sorties ce mois',
        value: this.totalSortiesMois,
        icon: '📉',
        color: '#E8453C',
        bgColor: '#FDECEA',
        isMontant: true,
        trend: null,
      },
      {
        label: 'Caisses actives',
        value: this.nombreCaisses,
        icon: '🏦',
        color: '#7C3AED',
        bgColor: '#EDE9FE',
        isMontant: false,
        trend: null,
      },
    ];
  }

  ngOnInit(): void {
    // Afficher un message si redirigé pour accès refusé
    if (this.route.snapshot.queryParamMap.get('accesRefuse') === 'true') {
      this.toastr.error('Vous n\'avez pas les droits pour accéder à cette page.', 'Accès refusé');
    }

    // Attendre que le profil utilisateur soit chargé avant les requêtes Firestore
    this.auth.currentUser$
      .pipe(
        filter(user => user !== null && !!user.organisationId),
        take(1)
      )
      .subscribe(async () => {
        await Promise.all([
          this.loadCaisses(),
          this.loadOperationsMois(),
          this.loadDernieresOperations(),
        ]);
        this.loadBudgetsAlerte();
        this.loading = false;
      });
  }

  private async loadCaisses(): Promise<void> {
    const organisationId = this.auth.organisationId;
    if (!organisationId) return;

    const q = query(
      collection(this.firestore, 'caisses'),
      where('organisationId', '==', organisationId),
      where('actif', '==', true),
    );
    const snap = await getDocs(q);
    this.caisses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Caisse));
    this.nombreCaisses = this.caisses.length;
    this.soldePrincipal = this.caisses.reduce((s, c) => s + (c.solde || 0), 0);
  }

  private async loadOperationsMois(): Promise<void> {
    const organisationId = this.auth.organisationId;
    if (!organisationId) return;

    const debut = new Date();
    debut.setDate(1);
    debut.setHours(0, 0, 0, 0);

    const q = query(
      collection(this.firestore, 'operations'),
      where('organisationId', '==', organisationId),
      where('statut', '==', 'validee'),
      where('date', '>=', debut),
    );
    const snap = await getDocs(q);

    snap.docs.forEach(d => {
      const op = d.data() as Operation;
      if (op.type === 'entree') this.totalEntreesMois += op.montant;
      else if (op.type === 'sortie') this.totalSortiesMois += op.montant;
    });
  }

  private async loadDernieresOperations(): Promise<void> {
    const organisationId = this.auth.organisationId;
    if (!organisationId) return;

    const q = query(
      collection(this.firestore, 'operations'),
      where('organisationId', '==', organisationId),
      orderBy('createdAt', 'desc'),
      limit(8),
    );
    const snap = await getDocs(q);
    this.dernieresOperations = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id, ...data,
        date: data['date']?.toDate(),
        createdAt: data['createdAt']?.toDate(),
      } as Operation;
    });
    this.operationsEnAttente = this.dernieresOperations.filter(o => o.statut === 'en_attente');
  }

  private loadBudgetsAlerte(): void {
    this.budgetService.getAll().subscribe(budgets => {
      this.budgetsEnAlerte = budgets.filter(b => b.estEnAlerte);
    });
  }

  toDate(val: any): Date {
    if (val instanceof Date) return val;
    return val?.toDate?.() ?? new Date();
  }
}
