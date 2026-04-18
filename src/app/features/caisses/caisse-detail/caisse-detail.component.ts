import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, map } from 'rxjs';
import { CaisseService } from '../../../services/caisse.service';
import { OperationService } from '../../../services/operation.service';
import { AuthService } from '../../../services/auth.service';
import { Caisse } from '../../../models/caisse.model';
import { Operation } from '../../../models/operation.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-caisse-detail',
  templateUrl: './caisse-detail.component.html',
  styleUrls: ['./caisse-detail.component.scss'],
})
export class CaisseDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private caisseService = inject(CaisseService);
  private opService = inject(OperationService);
  auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  caisse$!: Observable<Caisse>;
  operations$!: Observable<Operation[]>;
  caisseId = '';

  filtreStatut: string = 'tous';
  filtreType: string = 'tous';

  selectedOperation: Operation | null = null;
  totalEntrees: number = 0;
  totalSorties: number = 0;
  totalOperations: number = 0;

  // Une seule subscription pour les totaux
  private opsSub?: Subscription;

  ngOnInit(): void {
    this.caisseId = this.route.snapshot.paramMap.get('id')!;

    this.caisse$ = this.caisseService.getById(this.caisseId).pipe(
      map((caisse: Caisse) => ({
        ...caisse,
        createdAt: this.convertTimestamp(caisse.createdAt) as Date,
      }))
    );

    this.operations$ = this.opService.getAllByCaisse(this.caisseId).pipe(
      map((ops: Operation[]) =>
        ops.map((op: Operation) => ({
          ...op,
          date: this.convertTimestamp(op.date) as Date,
          createdAt: this.convertTimestamp(op.createdAt) as Date,
        }))
      )
    );

    this.opsSub = this.operations$.subscribe((ops: Operation[]) => {
      this.totalEntrees = ops
        .filter((op) => op.statut === 'validee' && this.estEntree(op))
        .reduce((sum, op) => sum + op.montant, 0);

      this.totalSorties = ops
        .filter((op) => op.statut === 'validee' && this.estSortie(op))
        .reduce((sum, op) => sum + op.montant, 0);

      this.totalOperations = ops.length;
    });
  }

  ngOnDestroy(): void {
    this.opsSub?.unsubscribe();
  }

  // Détermine si une opération est une entrée pour cette caisse
  // Fallback pour les anciens transferts sans champ 'sens' :
  // - si sens est défini → utiliser sens
  // - si sens absent et type=transfert → regarder transfertCaisseDestId
  //   • si transfertCaisseDestId != caisseId courant → c'est la source = sortie
  //   • si transfertCaisseDestId == caisseId courant → c'est la destination = entrée
  estEntree(op: Operation): boolean {
    if (op.type === 'entree') return true;
    if (op.type === 'transfert') {
      if (op.sens) return op.sens === 'entree';
      // Fallback legacy : si l'autre caisse est la source, on a reçu = entrée
      return op.transfertCaisseDestId === this.caisseId;
    }
    return false;
  }

  estSortie(op: Operation): boolean {
    if (op.type === 'sortie') return true;
    if (op.type === 'transfert') {
      if (op.sens) return op.sens === 'sortie';
      // Fallback legacy : si l'autre caisse est la destination, on a envoyé = sortie
      return op.transfertCaisseDestId !== this.caisseId;
    }
    return false;
  }

  // Conversion Timestamp Firebase → Date
  convertTimestamp(date: any): Date | null {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return null;
  }

  // Modal détail
  viewOperationDetails(op: Operation) {
    this.selectedOperation = {
      ...op,
      date: this.convertTimestamp(op.date) as Date,
    };
  }

  closeOperationDetails(): void {
    this.selectedOperation = null;
  }

  // Filtres
  filteredOperations(operations: Operation[]): Operation[] {
    if (!operations) return [];
    return operations.filter((op) => {
      const statutOk = this.filtreStatut === 'tous' || op.statut === this.filtreStatut;
      const typeOk = this.filtreType === 'tous' || op.type === this.filtreType;
      return statutOk && typeOk;
    });
  }

  resetFilters(): void {
    this.filtreStatut = 'tous';
    this.filtreType = 'tous';
    this.toastr.info('Filtres réinitialisés');
  }

  // Labels
  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      entree: 'Entrée',
      sortie: 'Sortie',
      transfert: 'Transfert',
    };
    return labels[type] ?? type;
  }

  statutLabel(statut: string): string {
    const labels: Record<string, string> = {
      validee: 'Validée',
      en_attente: 'En attente',
      rejetee: 'Rejetée',
    };
    return labels[statut] ?? statut;
  }

  // Navigation
  goNouvelleOperation(): void {
    this.router.navigate(['/operations', 'nouveau'], {
      queryParams: { caisseId: this.caisseId },
    });
  }
}
