import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy, getDocs, limit,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export type ResultatType = 'operation' | 'caisse' | 'budget';

export interface ResultatRecherche {
  type: ResultatType;
  id: string;
  titre: string;
  sous_titre: string;
  montant?: number;
  badge?: string;
  badgeClass?: string;
  lien: string;
}

export interface SuggestionRecherche {
  texte: string;
  type: string;
  icon: string;
}

export interface ResultatsGroupes {
  operations: ResultatRecherche[];
  caisses: ResultatRecherche[];
  budgets: ResultatRecherche[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private get orgId() { return this.auth.organisationId; }

  /**
   * Recherche globale
   */
  async rechercher(terme: string): Promise<ResultatsGroupes> {
    if (!terme || terme.trim().length < 2) {
      return { operations: [], caisses: [], budgets: [], total: 0 };
    }

    const t = terme.trim().toLowerCase();

    const [operations, caisses, budgets] = await Promise.all([
      this._rechercherOperations(t),
      this._rechercherCaisses(t),
      this._rechercherBudgets(t),
    ]);

    return {
      operations,
      caisses,
      budgets,
      total: operations.length + caisses.length + budgets.length,
    };
  }

  /**
   *  NOUVEAU : Suggestions rapides d'autocomplétion
   */
  async getSuggestions(terme: string): Promise<SuggestionRecherche[]> {
    if (!terme || terme.trim().length < 1) return this._getSuggestionsRecentes();

    const t = terme.trim().toLowerCase();
    const suggestions: SuggestionRecherche[] = [];

    // Chercher dans les opérations récentes
    const opsQuery = query(
      collection(this.firestore, 'operations'),
      where('organisationId', '==', this.orgId),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const opsSnap = await getDocs(opsQuery);
    const libellesVus = new Set<string>();

    opsSnap.docs.forEach(doc => {
      const data = doc.data();
      const libelle = data['libelle'] as string;
      if (libelle && libelle.toLowerCase().includes(t) && !libellesVus.has(libelle.toLowerCase())) {
        libellesVus.add(libelle.toLowerCase());
        suggestions.push({
          texte: libelle,
          type: 'Historique',
          icon: 'clock',
        });
      }
    });

    // Chercher dans les caisses
    const caissesQuery = query(
      collection(this.firestore, 'caisses'),
      where('organisationId', '==', this.orgId),
      where('actif', '==', true),
    );
    const caissesSnap = await getDocs(caissesQuery);
    caissesSnap.docs.forEach(doc => {
      const data = doc.data();
      const nom = data['nom'] as string;
      if (nom && nom.toLowerCase().includes(t)) {
        suggestions.push({
          texte: nom,
          type: 'Caisse',
          icon: 'wallet',
        });
      }
    });

    return suggestions.slice(0, 8);
  }

  /**
   *  NOUVEAU : Suggestions récentes (quand le champ est vide)
   */
  private _getSuggestionsRecentes(): SuggestionRecherche[] {
    const recentes = localStorage.getItem('recherches_recentes');
    if (!recentes) return [];
    try {
      return JSON.parse(recentes).slice(0, 5).map((r: string) => ({
        texte: r,
        type: 'Récent',
        icon: 'history',
      }));
    } catch {
      return [];
    }
  }

  /**
   *  NOUVEAU : Sauvegarder une recherche récente
   */
  sauvegarderRecherche(terme: string): void {
    const recentes = localStorage.getItem('recherches_recentes');
    let liste: string[] = recentes ? JSON.parse(recentes) : [];
    liste = [terme, ...liste.filter(r => r !== terme)].slice(0, 10);
    localStorage.setItem('recherches_recentes', JSON.stringify(liste));
  }

  // ── Opérations ─────────────────────────────────────────────────────────────
  private async _rechercherOperations(t: string): Promise<ResultatRecherche[]> {
    const q = query(
      collection(this.firestore, 'operations'),
      where('organisationId', '==', this.orgId),
      orderBy('createdAt', 'desc'),
      limit(200),
    );
    const snap = await getDocs(q);

    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter((op: any) =>
        op.libelle?.toLowerCase().includes(t) ||
        op.numeroPiece?.toLowerCase().includes(t) ||
        op.categorieNom?.toLowerCase().includes(t) ||
        op.responsableNom?.toLowerCase().includes(t) ||
        op.caisseNom?.toLowerCase().includes(t) ||
        op.notes?.toLowerCase().includes(t)
      )
      .slice(0, 6)
      .map((op: any): ResultatRecherche => ({
        type: 'operation',
        id: op.id,
        titre: op.libelle,
        sous_titre: `${op.numeroPiece ?? ''} · ${op.caisseNom ?? ''} · ${op.date?.toDate?.()?.toLocaleDateString('fr-FR') ?? ''}`,
        montant: op.montant,
        badge: op.type === 'entree' ? 'Entrée' : op.type === 'sortie' ? 'Sortie' : 'Transfert',
        badgeClass: op.type,
        lien: '/operations',
      }));
  }

  // ── Caisses ────────────────────────────────────────────────────────────────
  private async _rechercherCaisses(t: string): Promise<ResultatRecherche[]> {
    const q = query(
      collection(this.firestore, 'caisses'),
      where('organisationId', '==', this.orgId),
      where('actif', '==', true),
    );
    const snap = await getDocs(q);

    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter((c: any) =>
        c.nom?.toLowerCase().includes(t) ||
        c.description?.toLowerCase().includes(t) ||
        c.responsableNom?.toLowerCase().includes(t)
      )
      .slice(0, 4)
      .map((c: any): ResultatRecherche => ({
        type: 'caisse',
        id: c.id,
        titre: c.nom,
        sous_titre: c.role || (c.type === 'principale' ? 'Principale' : 'Secondaire'),
        montant: c.solde,
        badge: c.role || c.type,
        badgeClass: c.type,
        lien: `/caisses/${c.id}`,
      }));
  }

  // ── Budgets ────────────────────────────────────────────────────────────────
  private async _rechercherBudgets(t: string): Promise<ResultatRecherche[]> {
    const q = query(
      collection(this.firestore, 'budgets'),
      where('organisationId', '==', this.orgId),
    );
    const snap = await getDocs(q);

    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter((b: any) =>
        b.nom?.toLowerCase().includes(t) ||
        b.categorieNom?.toLowerCase().includes(t) ||
        b.caisseNom?.toLowerCase().includes(t)
      )
      .slice(0, 4)
      .map((b: any): ResultatRecherche => ({
        type: 'budget',
        id: b.id,
        titre: b.nom,
        sous_titre: `${b.caisseNom ?? ''} · ${b.categorieNom ?? ''}`,
        montant: b.montantPrevu,
        badge: b.periode ?? 'Mensuel',
        badgeClass: 'budget',
        lien: '/budgets',
      }));
  }
}
