import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  runTransaction,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { CaisseService } from './caisse.service';
import { BudgetService } from './budget.service';
import { Operation } from '../models/operation.model';

@Injectable({ providedIn: 'root' })
export class OperationService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);
  private caisseService = inject(CaisseService);
  private budgetService = inject(BudgetService);

  private get orgId(): string {
    return this.auth.organisationId;
  }
  private get col() {
    return collection(this.firestore, 'operations');
  }

  // Récupérer une opération par ID
  getById(id: string): Observable<Operation> {
    return docData(doc(this.firestore, `operations/${id}`), {
      idField: 'id',
    }) as Observable<Operation>;
  }

  // Récupérer les opérations d'une caisse (filtre organisationId obligatoire selon les règles Firestore)
  getByCaisse(caisseId: string): Observable<Operation[]> {
    const q = query(
      this.col,
      where('caisseId', '==', caisseId),
      where('organisationId', '==', this.orgId),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Operation[]>;
  }

  // Alias pour compatibilité (même logique que getByCaisse)
  getAllByCaisse(caisseId: string): Observable<Operation[]> {
    return this.getByCaisse(caisseId);
  }

  getAll(statut?: string): Observable<Operation[]> {
    const conditions: any[] = [
      where('organisationId', '==', this.orgId),
      orderBy('createdAt', 'desc'),
      limit(100),
    ];
    if (statut) conditions.splice(1, 0, where('statut', '==', statut));
    return collectionData(query(this.col, ...conditions), {
      idField: 'id',
    }) as Observable<Operation[]>;
  }

  async create(
    data: Omit<Operation, 'id' | 'organisationId' | 'createdAt'>,
  ): Promise<string> {
    const user = this.auth.currentUser!;
    const needsValidation = data.montant >= 100000 && !this.auth.isTresorier();
    const statut = needsValidation ? 'en_attente' : 'validee';

    // Utiliser displayName du profil Firestore (plus fiable que Firebase Auth)
    const responsableNom = user.displayName || user.email?.split('@')[0] || 'Utilisateur';

    // Pour un transfert : utiliser alimenter() qui gère les deux caisses atomiquement
    if (data.type === 'transfert' && data.transfertCaisseDestId) {
      await this.caisseService.alimenter(
        data.caisseId,
        data.transfertCaisseDestId,
        data.montant,
        data.libelle,
        user.uid,
        responsableNom,
      );
      // alimenter() crée ses propres opérations — retourner un ID fictif
      return 'transfert-ok';
    }

    const ref = await addDoc(this.col, {
      ...data,
      statut,
      responsableId: user.uid,
      responsableNom,
      organisationId: this.orgId,
      createdAt: serverTimestamp(),
    });

    // Si validée immédiatement : ajuster solde + mettre à jour le budget
    if (statut === 'validee') {
      const delta = data.type === 'entree' ? data.montant : -data.montant;
      await this.caisseService.ajusterSolde(data.caisseId, delta);
      await this.budgetService.mettreAJourDepense(
        data.caisseId,
        data.categorieId ?? '',
        data.montant,
        data.type as 'entree' | 'sortie',
      );
    }

    return ref.id;
  }

  async valider(op: Operation): Promise<void> {
    await runTransaction(this.firestore, async (tx) => {
      const opRef = doc(this.firestore, `operations/${op.id}`);
      tx.update(opRef, { statut: 'validee', updatedAt: serverTimestamp() });

      const caisseRef = doc(this.firestore, `caisses/${op.caisseId}`);

      if (op.type === 'transfert' && op.transfertCaisseDestId) {
        // Débiter la source ET créditer la destination dans la même transaction
        tx.update(caisseRef, {
          solde: increment(-op.montant),
          updatedAt: serverTimestamp(),
        });
        const destRef = doc(this.firestore, `caisses/${op.transfertCaisseDestId}`);
        tx.update(destRef, {
          solde: increment(op.montant),
          updatedAt: serverTimestamp(),
        });
      } else {
        const delta = op.type === 'entree' ? op.montant : -op.montant;
        tx.update(caisseRef, {
          solde: increment(delta),
          updatedAt: serverTimestamp(),
        });
      }
    });

    // Pas de mise à jour budget pour les transferts (neutre entre caisses)
    if (op.type !== 'transfert') {
      await this.budgetService.mettreAJourDepense(
        op.caisseId,
        op.categorieId ?? '',
        op.montant,
        op.type as 'entree' | 'sortie',
      );
    }
  }

  async rejeter(id: string): Promise<void> {
    await updateDoc(doc(this.firestore, `operations/${id}`), {
      statut: 'rejetee',
      updatedAt: serverTimestamp(),
    });
  }

  async update(id: string, data: Partial<Operation>): Promise<void> {
    await updateDoc(doc(this.firestore, `operations/${id}`), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }
}
