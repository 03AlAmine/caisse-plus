// caisse-list.component.ts (version corrigée)
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { CaisseService } from '../../../services/caisse.service';
import { AuthService } from '../../../services/auth.service';
import { Caisse } from '../../../models/caisse.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-caisse-list',
  templateUrl: './caisse-list.component.html',
  styleUrls: ['./caisse-list.component.scss'],
})
export class CaisseListComponent implements OnInit, OnDestroy {
  caisseService = inject(CaisseService);
  auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  caisses$!: Observable<Caisse[]>;
  caissesList: Caisse[] = [];
  showAlimenterModal = false;
  alimenterData = { sourceId: '', destId: '', montant: 0, libelle: '' };
  loadingTransfert = false;
  isLoading = true;
  private subscription: Subscription | null = null;

  ngOnInit(): void {
    // Attendre que l'utilisateur soit chargé AVANT de charger les caisses
    this.subscription = this.auth.currentUser$
      .pipe(
        filter(user => user !== null && !!user.organisationId),
        take(1),
        switchMap(() => {
          this.isLoading = false;
          this.caisses$ = this.caisseService.getAll().pipe(
            catchError(err => {
              console.error('Erreur chargement caisses:', err);
              this.toastr.error('Impossible de charger les caisses');
              return of([]);
            })
          );
          return this.caisses$;
        })
      )
      .subscribe({
        next: (caisses) => {
          this.caissesList = caisses || [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur:', err);
          this.toastr.error('Erreur lors du chargement des données');
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get caissePrincipale(): Caisse | undefined {
    return this.caissesList.find(c => c.type === 'principale');
  }

  get caissesSecondaires(): Caisse[] {
    return this.caissesList.filter(c => c.type === 'secondaire');
  }

  get soldeTotal(): number {
    return this.caissesList.reduce((s, c) => s + (c.solde || 0), 0);
  }

  get selectedSource(): Caisse | undefined {
    return this.caissesList.find(c => c.id === this.alimenterData.sourceId);
  }

  get selectedDest(): Caisse | undefined {
    return this.caissesList.find(c => c.id === this.alimenterData.destId);
  }

  getMaxMontant(): number | null {
    if (this.selectedSource && this.selectedSource.solde) {
      return this.selectedSource.solde;
    }
    return null;
  }

  validateMontant(): void {}

  isTransfertValid(): boolean {
    const { sourceId, destId, montant, libelle } = this.alimenterData;
    if (!sourceId || !destId || montant <= 0 || !libelle) return false;
    if (sourceId === destId) return false;
    if (this.selectedSource && montant > this.selectedSource.solde) return false;
    return true;
  }

  closeModal(): void {
    this.showAlimenterModal = false;
    this.alimenterData = { sourceId: '', destId: '', montant: 0, libelle: '' };
  }

  async onDeactivate(caisse: Caisse): Promise<void> {
    const confirmMsg = `Désactiver la caisse "${caisse.nom}" ?\n\nCette action est irréversible et masquera toutes les opérations associées.`;
    if (!confirm(confirmMsg)) return;

    try {
      await this.caisseService.deactivate(caisse.id!);
      this.toastr.success(`La caisse "${caisse.nom}" a été désactivée.`);
      // L'Observable Firestore se met à jour automatiquement, pas besoin de recharger manuellement
    } catch {
      this.toastr.error('Impossible de désactiver cette caisse.');
    }
  }

  async onAlimenter(): Promise<void> {
    if (!this.isTransfertValid()) {
      this.toastr.warning('Veuillez remplir tous les champs correctement.');
      return;
    }

    this.loadingTransfert = true;
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('Utilisateur non authentifié');

      await this.caisseService.alimenter(
        this.alimenterData.sourceId,
        this.alimenterData.destId,
        this.alimenterData.montant,
        this.alimenterData.libelle,
        user.uid,
        user.displayName || 'Utilisateur'
      );

      this.toastr.success(
        `Transfert de ${this.alimenterData.montant.toLocaleString('fr-FR')} FCFA effectué avec succès.`,
        'Succès'
      );
      this.closeModal();
      // L'Observable Firestore se met à jour automatiquement
    } catch (err: any) {
      this.toastr.error(err.message ?? 'Erreur lors du transfert. Vérifiez les soldes.');
    } finally {
      this.loadingTransfert = false;
    }
  }
}
