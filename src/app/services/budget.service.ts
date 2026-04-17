import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, addDoc, updateDoc,
  query, where, orderBy, getDocs, Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Budget, BudgetAvecStats, calculerStatsBudget } from '../models/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private get orgId() { return this.auth.organisationId; }
  private get col() { return collection(this.firestore, 'budgets'); }

  getAll(): Observable<BudgetAvecStats[]> {
    const q = query(
      this.col,
      where('organisationId', '==', this.orgId),
      where('actif', '==', true),
      orderBy('createdAt', 'desc'),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Budget[]>).pipe(
      map(budgets => budgets.map(b => ({ ...b, ...calculerStatsBudget(b) } as BudgetAvecStats)))
    );
  }

  getByCaisse(caisseId: string): Observable<BudgetAvecStats[]> {
    const q = query(
      this.col,
      where('organisationId', '==', this.orgId),
      where('caisseId', '==', caisseId),
      where('actif', '==', true),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Budget[]>).pipe(
      map(budgets => budgets.map(b => ({ ...b, ...calculerStatsBudget(b) } as BudgetAvecStats)))
    );
  }

  async create(data: Omit<Budget, 'id' | 'organisationId' | 'tauxConsommation' | 'estEnAlerte' | 'restant'>): Promise<string> {
    const ref = await addDoc(this.col, {
      ...data,
      montantDepense: 0,
      organisationId: this.orgId,
      actif: true,
      createdAt: Timestamp.now(),
    });
    return ref.id;
  }

  async update(id: string, data: Partial<Budget>): Promise<void> {
    await updateDoc(doc(this.firestore, `budgets/${id}`), { ...data });
  }

  async delete(id: string): Promise<void> {
    await updateDoc(doc(this.firestore, `budgets/${id}`), { actif: false });
  }

  // Appelé depuis OperationService quand une opération de type 'sortie' est validée
  async mettreAJourDepense(
    caisseId: string,
    categorieId: string,
    montant: number,
    type: 'entree' | 'sortie',
  ): Promise<void> {
    if (type !== 'sortie') return;

    const now = new Date();
    const q = query(
      this.col,
      where('organisationId', '==', this.orgId),
      where('caisseId', '==', caisseId),
      where('actif', '==', true),
    );

    const snap = await getDocs(q);
    const updates: Promise<void>[] = [];

    snap.docs.forEach(d => {
      const b = d.data() as Budget;
      const matchCat = !b.categorieId || b.categorieId === categorieId;
      const matchPeriode = this.estDansPeriode(b, now);

      if (matchCat && matchPeriode) {
        updates.push(
          updateDoc(d.ref, {
            montantDepense: (b.montantDepense || 0) + montant,
          })
        );
      }
    });

    await Promise.all(updates);
  }

  private estDansPeriode(b: Budget, date: Date): boolean {
    if (b.periode === 'annuel') return date.getFullYear() === b.annee;
    return date.getFullYear() === b.annee && date.getMonth() + 1 === b.mois;
  }
}

// Re-export pour compatibilité avec les imports existants
export type { BudgetAvecStats } from '../models/budget.model';
