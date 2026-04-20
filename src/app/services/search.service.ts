import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy, getDocs, limit,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResultatType = 'operation' | 'caisse' | 'budget';

export interface ResultatRecherche {
  type: ResultatType;
  id: string;
  titre: string;       // libellé principal
  sous_titre: string;  // ligne secondaire
  montant?: number;
  badge?: string;      // ex: "Entrée", "Validée"
  badgeClass?: string; // ex: "entree", "validee"
  lien: string;        // route Angular
}

export interface ResultatsGroupes {
  operations: ResultatRecherche[];
  caisses:    ResultatRecherche[];
  budgets:    ResultatRecherche[];
  total:      number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SearchService {
  private firestore = inject(Firestore);
  private auth      = inject(AuthService);

  private get orgId() { return this.auth.organisationId; }

  /**
   * Recherche globale : interroge opérations, caisses et budgets en parallèle.
   * Firestore ne supporte pas LIKE ni full-text nativement — on charge un
   * échantillon récent et on filtre côté client (insensible à la casse).
   * Pour de grands volumes, envisager Algolia ou Typesense.
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

  // ── Opérations ─────────────────────────────────────────────────────────────

  private async _rechercherOperations(t: string): Promise<ResultatRecherche[]> {
    // Charger les 200 dernières opérations validées + en attente et filtrer
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
        type:      'operation',
        id:        op.id,
        titre:     op.libelle,
        sous_titre: `${op.numeroPiece ?? ''} · ${op.caisseNom ?? ''} · ${
          op.date?.toDate?.()?.toLocaleDateString('fr-FR') ?? ''
        }`,
        montant:   op.montant,
        badge:     op.type === 'entree' ? 'Entrée' : op.type === 'sortie' ? 'Sortie' : 'Transfert',
        badgeClass: op.type,
        lien:      '/operations',
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
        type:      'caisse',
        id:        c.id,
        titre:     c.nom,
        sous_titre: c.type === 'principale' ? '⭐ Principale' : '📦 Secondaire',
        montant:   c.solde,
        badge:     c.type === 'principale' ? 'Principale' : 'Secondaire',
        badgeClass: c.type,
        lien:      `/caisses/${c.id}`,
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
        type:      'budget',
        id:        b.id,
        titre:     b.nom,
        sous_titre: `${b.caisseNom ?? ''} · ${b.categorieNom ?? ''}`,
        montant:   b.montantPrevu,
        badge:     b.periode ?? 'Mensuel',
        badgeClass: 'budget',
        lien:      '/budgets',
      }));
  }
}
