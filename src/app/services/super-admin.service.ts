import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where, getDocs, orderBy, limit,
  doc, updateDoc, Timestamp,
} from '@angular/fire/firestore';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

export interface OrganisationInfo {
  id: string;
  nom: string;
  ownerId: string;
  templateId?: string;
  createdAt: any;
  membres: string[];
  actif: boolean;
  // Stats calculées
  nbCaisses?: number;
  nbOperations?: number;
  nbBudgets?: number;
  soldeTotal?: number;
}

export interface StatGlobales {
  nbOrganisations: number;
  nbOrganisationsActives: number;
  nbUtilisateurs: number;
  nbOperations: number;
  nbCaisses: number;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  isSuperAdmin(): boolean {
    return this.auth.role === 'superadmin';
  }

  /**
   * Récupère toutes les organisations
   */
  async getAllOrganisations(): Promise<OrganisationInfo[]> {
    const q = query(
      collection(this.firestore, 'organisations'),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    const snap = await getDocs(q);

    const orgs: OrganisationInfo[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      orgs.push({
        id: doc.id,
        nom: data['nom'] || 'Sans nom',
        ownerId: data['ownerId'] || '',
        templateId: data['templateId'] || '',
        createdAt: data['createdAt']?.toDate() || new Date(),
        membres: data['membres'] || [],
        actif: data['actif'] !== false,
      });
    }
    return orgs;
  }

  /**
   * Récupère les statistiques d'une organisation
   */
  async getOrganisationStats(orgId: string): Promise<{ nbCaisses: number; nbOperations: number; nbBudgets: number; soldeTotal: number }> {
    const [caissesSnap, opsSnap, budgetsSnap] = await Promise.all([
      getDocs(query(collection(this.firestore, 'caisses'), where('organisationId', '==', orgId))),
      getDocs(query(collection(this.firestore, 'operations'), where('organisationId', '==', orgId))),
      getDocs(query(collection(this.firestore, 'budgets'), where('organisationId', '==', orgId))),
    ]);

    const nbCaisses = caissesSnap.size;
    const nbOperations = opsSnap.size;
    const nbBudgets = budgetsSnap.size;
    const soldeTotal = caissesSnap.docs.reduce((s, d) => s + (d.data()['solde'] || 0), 0);

    return { nbCaisses, nbOperations, nbBudgets, soldeTotal };
  }

  /**
   * Récupère les statistiques globales
   */
  async getStatistiquesGlobales(): Promise<StatGlobales> {
    const [orgsSnap, usersSnap, opsSnap, caissesSnap] = await Promise.all([
      getDocs(collection(this.firestore, 'organisations')),
      getDocs(collection(this.firestore, 'users')),
      getDocs(collection(this.firestore, 'operations')),
      getDocs(collection(this.firestore, 'caisses')),
    ]);

    return {
      nbOrganisations: orgsSnap.size,
      nbOrganisationsActives: orgsSnap.docs.filter(d => d.data()['actif'] !== false).length,
      nbUtilisateurs: usersSnap.size,
      nbOperations: opsSnap.size,
      nbCaisses: caissesSnap.size,
    };
  }

  /**
   * Désactiver / Réactiver une organisation
   */
  async toggleOrganisation(orgId: string, actif: boolean): Promise<void> {
    await updateDoc(doc(this.firestore, `organisations/${orgId}`), { actif });
  }

  /**
   * Récupère les utilisateurs d'une organisation
   */
  async getOrganisationUsers(orgId: string): Promise<any[]> {
    const q = query(
      collection(this.firestore, 'users'),
      where('organisationId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  }
}
