import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy, getDocs, Timestamp,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Operation } from '../models/operation.model';
import { Caisse } from '../models/caisse.model';

export interface RapportData {
  periode: string;
  totalEntrees: number;
  totalSorties: number;
  soldeNet: number;
  operations: Operation[];
  parCategorie: { nom: string; total: number; type: string }[];
  parCaisse: { nom: string; entrees: number; sorties: number }[];
}

@Injectable({ providedIn: 'root' })
export class RapportService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  async generer(
    dateDebut: Date,
    dateFin: Date,
    caisseId?: string,
  ): Promise<RapportData> {
    const orgId = this.auth.organisationId;
    const finJournee = new Date(dateFin);
    finJournee.setHours(23, 59, 59, 999);

    const conditions: any[] = [
      where('organisationId', '==', orgId),
      where('statut', '==', 'validee'),
      where('date', '>=', Timestamp.fromDate(dateDebut)),
      where('date', '<=', Timestamp.fromDate(finJournee)),
      orderBy('date', 'desc'),
    ];
    if (caisseId) conditions.splice(1, 0, where('caisseId', '==', caisseId));

    const snap = await getDocs(query(collection(this.firestore, 'operations'), ...conditions));
    const operations: Operation[] = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id, ...data,
        date: data['date']?.toDate?.() ?? new Date(),
        createdAt: data['createdAt']?.toDate?.() ?? new Date(),
      } as Operation;
    });

    const totalEntrees = operations.filter(o => o.type === 'entree').reduce((s, o) => s + o.montant, 0);
    const totalSorties = operations.filter(o => o.type === 'sortie').reduce((s, o) => s + o.montant, 0);

    // Regrouper par catégorie
    const catMap = new Map<string, { nom: string; total: number; type: string }>();
    operations.forEach(op => {
      const key = op.categorieNom || 'Sans catégorie';
      const existing = catMap.get(key);
      if (existing) existing.total += op.montant;
      else catMap.set(key, { nom: key, total: op.montant, type: op.type });
    });

    // Regrouper par caisse
    const caisseMap = new Map<string, { nom: string; entrees: number; sorties: number }>();
    operations.forEach(op => {
      const key = op.caisseNom || op.caisseId;
      if (!caisseMap.has(key)) caisseMap.set(key, { nom: key, entrees: 0, sorties: 0 });
      const c = caisseMap.get(key)!;
      if (op.type === 'entree') c.entrees += op.montant;
      else if (op.type === 'sortie') c.sorties += op.montant;
    });

    const df = dateDebut.toLocaleDateString('fr-FR');
    const dt = dateFin.toLocaleDateString('fr-FR');

    return {
      periode: `${df} — ${dt}`,
      totalEntrees,
      totalSorties,
      soldeNet: totalEntrees - totalSorties,
      operations,
      parCategorie: Array.from(catMap.values()).sort((a, b) => b.total - a.total),
      parCaisse: Array.from(caisseMap.values()),
    };
  }

  exportCSV(data: RapportData): void {
    const rows = [
      ['Date', 'Libellé', 'Caisse', 'Catégorie', 'Type', 'Statut', 'Montant (FCFA)'],
      ...data.operations.map(op => [
        new Date(op.date).toLocaleDateString('fr-FR'),
        op.libelle,
        op.caisseNom ?? '',
        op.categorieNom ?? '',
        op.type,
        op.statut,
        op.montant.toString(),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-caisse-${data.periode.replace(/\s/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportJSON(data: RapportData): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
