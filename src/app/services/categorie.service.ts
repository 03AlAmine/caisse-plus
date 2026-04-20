import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, getDocs, setDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Categorie, CATEGORIES_DEFAUT } from '../models/categorie.model';

@Injectable({ providedIn: 'root' })
export class CategorieService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private get orgId() { return this.auth.organisationId; }
  private get col() { return collection(this.firestore, 'categories'); }

  getAll(): Observable<Categorie[]> {
    const q = query(
      this.col,
      where('organisationId', '==', this.orgId),
      orderBy('nom', 'asc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Categorie[]>;
  }

  getByType(type: 'entree' | 'sortie'): Observable<Categorie[]> {
    const q = query(
      this.col,
      where('organisationId', '==', this.orgId),
      where('type', 'in', [type, 'les_deux']),
      orderBy('nom', 'asc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Categorie[]>;
  }

  async create(data: Omit<Categorie, 'id' | 'organisationId'>): Promise<void> {
    await addDoc(this.col, { ...data, organisationId: this.orgId });
  }

  async update(id: string, data: Partial<Categorie>): Promise<void> {
    await updateDoc(doc(this.firestore, `categories/${id}`), data);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `categories/${id}`));
  }

  // Initialiser ou compléter les catégories par défaut.
  // Stratégie non-destructive : on n'ajoute que les catégories système
  // absentes (comparaison sur le nom normalisé). Les catégories custom
  // de l'organisation ne sont jamais touchées.
  async initCategories(): Promise<number> {
    const snap = await getDocs(query(this.col, where('organisationId', '==', this.orgId)));

    // Noms déjà présents (insensible à la casse pour éviter les doublons)
    const nomsExistants = new Set(
      snap.docs.map(d => (d.data()['nom'] as string).toLowerCase().trim())
    );

    const aAjouter = CATEGORIES_DEFAUT.filter(
      cat => !nomsExistants.has(cat.nom.toLowerCase().trim())
    );

    for (const cat of aAjouter) {
      await addDoc(this.col, { ...cat, organisationId: this.orgId });
    }

    return aAjouter.length; // nombre de catégories ajoutées
  }
}
