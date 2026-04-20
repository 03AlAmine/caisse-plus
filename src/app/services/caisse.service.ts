import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  runTransaction,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { Caisse } from '../models/caisse.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CaisseService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private get orgId(): string {
    return this.auth.organisationId;
  }
  private get col() {
    return collection(this.firestore, 'caisses');
  }

  // Lister toutes les caisses actives de l'organisation
  getAll(): Observable<Caisse[]> {
    const q = query(
      this.col,
      where('organisationId', '==', this.orgId),
      where('actif', '==', true),
      orderBy('type', 'desc'), // principale en premier
      orderBy('createdAt', 'asc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Caisse[]>;
  }

  // Récupérer une caisse par ID
  getById(id: string): Observable<Caisse> {
    return docData(doc(this.firestore, `caisses/${id}`), {
      idField: 'id',
    }) as Observable<Caisse>;
  }

  // Créer une caisse
  async create(
    data: Omit<Caisse, 'id' | 'organisationId' | 'createdAt'>,
  ): Promise<string> {
    // Vérifier qu'il n'existe pas déjà une caisse principale
    if (data.type === 'principale') {
      const caisses = await firstValueFrom(this.getAll());
      const hasPrincipale = caisses.some((c) => c.type === 'principale');

      if (hasPrincipale) {
        throw new Error('Une caisse principale existe déjà.');
      }
    }

    const ref = await addDoc(this.col, {
      ...data,
      solde: 0,
      organisationId: this.orgId,
      actif: true,
      createdAt: serverTimestamp(),
    });

    return ref.id;
  }

  // Modifier une caisse
  async update(id: string, data: Partial<Caisse>): Promise<void> {
    await updateDoc(doc(this.firestore, `caisses/${id}`), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  // Désactiver une caisse (soft delete)
  async deactivate(id: string): Promise<void> {
    await updateDoc(doc(this.firestore, `caisses/${id}`), { actif: false });
  }

  // Alimenter une caisse secondaire depuis la principale
  async alimenter(
    caisseSourceId: string,
    caisseDestId: string,
    montant: number,
    libelle: string,
    responsableId: string,
    responsableNom: string,
    numeroPiece?: string,
  ): Promise<void> {
    const opsCol = collection(this.firestore, 'operations');
    await runTransaction(this.firestore, async (tx) => {
      const srcRef = doc(this.firestore, `caisses/${caisseSourceId}`);
      const dstRef = doc(this.firestore, `caisses/${caisseDestId}`);

      const srcSnap = await tx.get(srcRef);
      const dstSnap = await tx.get(dstRef);

      if ((srcSnap.data()?.['solde'] ?? 0) < montant) {
        throw new Error('Solde insuffisant dans la caisse source.');
      }

      const sourceNom = srcSnap.data()?.['nom'] ?? 'Caisse source';
      const destNom   = dstSnap.data()?.['nom'] ?? 'Caisse destination';

      tx.update(srcRef, { solde: increment(-montant), updatedAt: serverTimestamp() });
      tx.update(dstRef, { solde: increment(montant),  updatedAt: serverTimestamp() });

      const now = serverTimestamp();

      // Opération SORTIE sur la caisse source
      tx.set(doc(opsCol), {
        libelle,
        montant,
        type: 'transfert',
        sens: 'sortie',
        statut: 'validee',
        ...(numeroPiece ? { numeroPiece } : {}),
        caisseId: caisseSourceId,
        caisseNom: sourceNom,
        transfertCaisseDestId: caisseDestId,
        transfertCaisseDestNom: destNom,
        responsableId,
        responsableNom,
        organisationId: this.orgId,
        date: now,
        createdAt: now,
      });

      // Opération ENTRÉE sur la caisse destination (même numéro de pièce)
      tx.set(doc(opsCol), {
        libelle,
        montant,
        type: 'transfert',
        sens: 'entree',
        statut: 'validee',
        ...(numeroPiece ? { numeroPiece } : {}),
        caisseId: caisseDestId,
        caisseNom: destNom,
        transfertCaisseDestId: caisseSourceId,
        transfertCaisseDestNom: sourceNom,
        responsableId,
        responsableNom,
        organisationId: this.orgId,
        date: now,
        createdAt: now,
      });
    });
  }

  // Ajuster le solde directement (après une entrée/sortie validée)
  async ajusterSolde(caisseId: string, delta: number): Promise<void> {
    await updateDoc(doc(this.firestore, `caisses/${caisseId}`), {
      solde: increment(delta),
      updatedAt: serverTimestamp(),
    });
  }
}
