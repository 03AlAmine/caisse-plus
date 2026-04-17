import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
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
export class CaisseDetailComponent implements OnInit {
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

  ngOnInit(): void {
    this.caisseId = this.route.snapshot.paramMap.get('id')!;
    this.caisse$ = this.caisseService.getById(this.caisseId);
    this.operations$ = this.opService.getByCaisse(this.caisseId);

    // Calculer les totaux
    this.operations$.subscribe(ops => {
      this.totalEntrees = ops
        .filter(op => op.type === 'entree' && op.statut === 'validee')
        .reduce((sum, op) => sum + op.montant, 0);

      this.totalSorties = ops
        .filter(op => op.type === 'sortie' && op.statut === 'validee')
        .reduce((sum, op) => sum + op.montant, 0);

      this.totalOperations = ops.length;
    });
  }

  // Méthode pour filtrer les opérations
  filteredOperations(operations: Operation[]): Operation[] {
    if (!operations) return [];

    return operations.filter(op => {
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

  viewOperationDetails(operation: Operation): void {
    this.selectedOperation = operation;
  }

  closeOperationDetails(): void {
    this.selectedOperation = null;
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      entree: 'Entrée',
      sortie: 'Sortie',
      transfert: 'Transfert'
    };
    return labels[type] ?? type;
  }

  statutLabel(statut: string): string {
    const labels: Record<string, string> = {
      validee: 'Validée',
      en_attente: 'En attente',
      rejetee: 'Rejetée'
    };
    return labels[statut] ?? statut;
  }

  goNouvelleOperation(): void {
    this.router.navigate(['/operations', 'nouveau'], {
      queryParams: { caisseId: this.caisseId }
    });
  }
}
