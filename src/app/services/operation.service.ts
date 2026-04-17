import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, updateDoc, query, where, orderBy, limit,
  serverTimestamp, increment, runTransaction,
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

  private get orgId(): string { return this.auth.organisationId; }
  private get col() { return collection(this.firestore, 'operations'); }

  // Récupérer une opération par ID
  getById(id: string): Observable<Operation> {
    return docData(doc(this.firestore, `operations/${id}`), {
      idField: 'id',
    }) as Observable<Operation>;
  }

  getByCaisse(caisseId: string): Observable<Operation[]> {
    const q = query(
      this.col,
      where('caisseId', '==', caisseId),
      where('organisationId', '==', this.orgId),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Operation[]>;
  }

  getAll(statut?: string): Observable<Operation[]> {
    const conditions: any[] = [
      where('organisationId', '==', this.orgId),
      orderBy('createdAt', 'desc'),
      limit(100),
    ];
    if (statut) conditions.splice(1, 0, where('statut', '==', statut));
    return collectionData(query(this.col, ...conditions), { idField: 'id' }) as Observable<Operation[]>;
  }

  async create(data: Omit<Operation, 'id' | 'organisationId' | 'createdAt'>): Promise<string> {
    const user = this.auth.currentUser!;
    const needsValidation = data.montant >= 100000 && !this.auth.isTresorier();
    const statut = needsValidation ? 'en_attente' : 'validee';

    const ref = await addDoc(this.col, {
      ...data,
      statut,
      responsableId: user.uid,
      responsableNom: user.displayName,
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
      const delta = op.type === 'entree' ? op.montant : -op.montant;
      tx.update(caisseRef, { solde: increment(delta), updatedAt: serverTimestamp() });
    });

    await this.budgetService.mettreAJourDepense(
      op.caisseId,
      op.categorieId ?? '',
      op.montant,
      op.type as 'entree' | 'sortie',
    );
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
