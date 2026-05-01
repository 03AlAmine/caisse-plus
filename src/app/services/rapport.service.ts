import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  limit,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Operation } from '../models/operation.model';
import { Caisse } from '../models/caisse.model';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RapportData {
  periode: string;
  dateDebut: Date;
  dateFin: Date;
  caisse?: string;
  totalEntrees: number;
  totalSorties: number;
  soldeNet: number;
  operations: Operation[];
  parCategorie: { nom: string; total: number; type: string }[];
  parCaisse: { nom: string; entrees: number; sorties: number }[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RapportService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  // ── Génération du rapport ──────────────────────────────────────────────────

  async generer(
    dateDebut: Date,
    dateFin: Date,
    caisseId?: string,
    pageSize: number = 200, // ✅ Limite à 200 opérations par rapport
  ): Promise<RapportData> {
    const orgId = this.auth.organisationId;
    const finJournee = new Date(dateFin);
    finJournee.setHours(23, 59, 59, 999);

    const conditions: any[] = [
      where('organisationId', '==', orgId),
      where('statut', '==', 'validee'),
      where('date', '>=', Timestamp.fromDate(dateDebut)),
      where('date', '<=', Timestamp.fromDate(finJournee)),
      orderBy('date', 'asc'),
      limit(pageSize), // ✅ Limite explicite
    ];
    if (caisseId) conditions.splice(1, 0, where('caisseId', '==', caisseId));

    const snap = await getDocs(
      query(collection(this.firestore, 'operations'), ...conditions),
    );
    const operations: Operation[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        date: data['date']?.toDate?.() ?? new Date(),
        createdAt: data['createdAt']?.toDate?.() ?? new Date(),
      } as Operation;
    });

    const totalEntrees = operations
      .filter((o) => o.type === 'entree')
      .reduce((s, o) => s + o.montant, 0);
    const totalSorties = operations
      .filter((o) => o.type === 'sortie')
      .reduce((s, o) => s + o.montant, 0);

    // Par catégorie
    const catMap = new Map<
      string,
      { nom: string; total: number; type: string }
    >();
    operations.forEach((op) => {
      const key = op.categorieNom || 'Sans catégorie';
      const ex = catMap.get(key);
      if (ex) ex.total += op.montant;
      else catMap.set(key, { nom: key, total: op.montant, type: op.type });
    });

    // Par caisse
    const caisseMap = new Map<
      string,
      { nom: string; entrees: number; sorties: number }
    >();
    operations.forEach((op) => {
      const key = op.caisseNom || op.caisseId;
      if (!caisseMap.has(key))
        caisseMap.set(key, { nom: key, entrees: 0, sorties: 0 });
      const c = caisseMap.get(key)!;
      if (op.type === 'entree') c.entrees += op.montant;
      else if (op.type === 'sortie') c.sorties += op.montant;
    });

    return {
      periode: `${dateDebut.toLocaleDateString('fr-FR')} — ${dateFin.toLocaleDateString('fr-FR')}`,
      dateDebut,
      dateFin,
      totalEntrees,
      totalSorties,
      soldeNet: totalEntrees - totalSorties,
      operations,
      parCategorie: Array.from(catMap.values()).sort(
        (a, b) => b.total - a.total,
      ),
      parCaisse: Array.from(caisseMap.values()),
    };
  }

  // ── Export CSV (basique, compatibilité existante) ──────────────────────────

  exportCSV(data: RapportData): void {
    const rows = [
      [
        'N° Pièce',
        'Date',
        'Libellé',
        'Caisse',
        'Catégorie',
        'Type',
        'Montant (FCFA)',
        'Responsable',
      ],
      ...data.operations.map((op) => [
        op.numeroPiece ?? '',
        new Date(op.date).toLocaleDateString('fr-FR'),
        op.libelle,
        op.caisseNom ?? '',
        op.categorieNom ?? '',
        op.type === 'entree'
          ? 'Entrée'
          : op.type === 'sortie'
            ? 'Sortie'
            : 'Transfert',
        op.montant.toString(),
        op.responsableNom ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    this._download(blob, `livre-caisse-${this._slugPeriode(data)}.csv`);
  }

  // ── Export Excel (livre de caisse — format fidèle aux fichiers Excel source) ─

  async exportExcel(data: RapportData, caisseName?: string): Promise<void> {
    // Import dynamique pour ne pas alourdir le bundle initial
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();

    // ── Feuille 1 : Livre de caisse ──────────────────────────────────────────
    const livreRows = this._buildLivreRows(data, caisseName);
    const wsLivre = XLSX.utils.aoa_to_sheet(livreRows);

    // Largeurs de colonnes
    wsLivre['!cols'] = [
      { wch: 12 }, // N° Pièce
      { wch: 12 }, // Date
      { wch: 45 }, // Désignation
      { wch: 20 }, // Catégorie
      { wch: 16 }, // Entrées
      { wch: 16 }, // Sorties
      { wch: 18 }, // Solde
      { wch: 18 }, // Responsable
    ];

    // Hauteur ligne titre
    wsLivre['!rows'] = [{ hpt: 28 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }];

    XLSX.utils.book_append_sheet(wb, wsLivre, 'Livre de caisse');

    // ── Feuille 2 : Synthèse par catégorie ───────────────────────────────────
    const catRows = [
      ['Synthèse par catégorie'],
      [''],
      ['Catégorie', 'Type', 'Total (FCFA)', '% du total'],
      ...data.parCategorie.map((c) => [
        c.nom,
        c.type === 'entree' ? 'Entrée' : 'Sortie',
        c.total,
        `${Math.round((c.total / (data.totalEntrees + data.totalSorties)) * 100)} %`,
      ]),
      [''],
      ['TOTAL ENTRÉES', '', data.totalEntrees, ''],
      ['TOTAL SORTIES', '', data.totalSorties, ''],
      ['SOLDE NET', '', data.soldeNet, ''],
    ];
    const wsCat = XLSX.utils.aoa_to_sheet(catRows);
    wsCat['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsCat, 'Synthèse catégories');

    // ── Feuille 3 : Par caisse ────────────────────────────────────────────────
    if (data.parCaisse.length > 1) {
      const caisseRows = [
        ['Synthèse par caisse'],
        [''],
        ['Caisse', 'Entrées (FCFA)', 'Sorties (FCFA)', 'Solde net (FCFA)'],
        ...data.parCaisse.map((c) => [
          c.nom,
          c.entrees,
          c.sorties,
          c.entrees - c.sorties,
        ]),
      ];
      const wsCaisse = XLSX.utils.aoa_to_sheet(caisseRows);
      wsCaisse['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsCaisse, 'Par caisse');
    }

    // ── Téléchargement ───────────────────────────────────────────────────────
    const fileName = `livre-caisse-${this._slugPeriode(data)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // ── Export PDF (livre de caisse imprimable) ────────────────────────────────

  async exportPDF(
    data: RapportData,
    caisseName?: string,
    orgName?: string,
  ): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const bleuMarine = [10, 22, 40]; // var(--color-navy) approximé
    const vert = [5, 150, 105];
    const rouge = [220, 38, 38];
    const gris = [107, 114, 128];
    const grisLight = [248, 250, 252];

    // ── En-tête du document ──────────────────────────────────────────────────
    doc.setFillColor(...(bleuMarine as [number, number, number]));
    doc.rect(0, 0, 297, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(orgName ?? 'Leader Interim et Services', 12, 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('LIVRE DE CAISSE', 12, 16);

    // Caisse + période à droite
    doc.setFontSize(9);
    const periodeTxt = `Période : ${data.periode}`;
    const caisseTxt = caisseName
      ? `Caisse : ${caisseName}`
      : 'Toutes les caisses';
    doc.text(periodeTxt, 285, 10, { align: 'right' });
    doc.text(caisseTxt, 285, 16, { align: 'right' });

    // ── Bande de synthèse ────────────────────────────────────────────────────
    const yBande = 26;
    const pills = [
      { label: 'Entrées totales', val: data.totalEntrees, color: vert },
      { label: 'Sorties totales', val: data.totalSorties, color: rouge },
      {
        label: 'Solde net',
        val: data.soldeNet,
        color: data.soldeNet >= 0 ? vert : rouge,
      },
      {
        label: 'Nb opérations',
        val: data.operations.length,
        color: bleuMarine,
        isMontant: false,
      },
    ];

    pills.forEach((p, i) => {
      const x = 12 + i * 70;
      doc.setFillColor(...(grisLight as [number, number, number]));
      doc.roundedRect(x, yBande, 65, 14, 2, 2, 'F');
      doc.setTextColor(...(gris as [number, number, number]));
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(p.label.toUpperCase(), x + 4, yBande + 5);
      doc.setTextColor(...(p.color as [number, number, number]));
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const valTxt =
        (p as any).isMontant === false
          ? String(p.val)
          : `${Number(p.val).toLocaleString('fr-FR')} FCFA`;
      doc.text(valTxt, x + 4, yBande + 11);
    });

    // ── Tableau principal ─────────────────────────────────────────────────────
    const tableBody = data.operations.map((op) => [
      op.numeroPiece ?? '—',
      new Date(op.date).toLocaleDateString('fr-FR'),
      op.libelle,
      op.caisseNom ?? '—',
      op.categorieNom ?? '—',
      op.type === 'entree' ? this._fmt(op.montant) : '',
      op.type === 'sortie' ? this._fmt(op.montant) : '',
      op.responsableNom ?? '—',
    ]);

    // Ligne de totaux
    tableBody.push([
      '',
      '',
      'TOTAUX',
      '',
      '',
      this._fmt(data.totalEntrees),
      this._fmt(data.totalSorties),
      '',
    ]);

    autoTable(doc, {
      startY: yBande + 18,
      head: [
        [
          'N° Pièce',
          'Date',
          'Désignation',
          'Caisse',
          'Catégorie',
          'Entrées (FCFA)',
          'Sorties (FCFA)',
          'Responsable',
        ],
      ],
      body: tableBody,
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 40, 60],
        lineColor: [220, 220, 225],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: bleuMarine as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 20 },
        2: { cellWidth: 68 },
        3: { cellWidth: 28 },
        4: { cellWidth: 28 },
        5: {
          cellWidth: 28,
          halign: 'right',
          textColor: vert as [number, number, number],
        },
        6: {
          cellWidth: 28,
          halign: 'right',
          textColor: rouge as [number, number, number],
        },
        7: { cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: [252, 253, 254] },
      // Style de la ligne totaux (dernière)
      didParseCell: (hookData: any) => {
        if (hookData.row.index === tableBody.length - 1) {
          hookData.cell.styles.fillColor = [235, 240, 250];
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = bleuMarine;
        }
      },
    });

    // ── Pied de page ─────────────────────────────────────────────────────────
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...(gris as [number, number, number]));
      doc.text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
        12,
        207,
      );
      doc.text(`Page ${i} / ${pageCount}`, 285, 207, { align: 'right' });
    }

    doc.save(`livre-caisse-${this._slugPeriode(data)}.pdf`);
  }

  // ── Export JSON (debug / archivage) ───────────────────────────────────────

  exportJSON(data: RapportData): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    this._download(blob, `rapport-${this._slugPeriode(data)}.json`);
  }

  // ── Privés ─────────────────────────────────────────────────────────────────

  /** Construit les lignes AOA pour la feuille Excel "Livre de caisse" */
  private _buildLivreRows(data: RapportData, caisseName?: string): any[][] {
    const rows: any[][] = [];
    const fmt = (n: number) => n; // garder comme nombre pour que Excel calcule

    // Titre
    rows.push(['LIVRE DE CAISSE']);
    rows.push([caisseName ? `Caisse : ${caisseName}` : 'Toutes les caisses']);
    rows.push([`Période : ${data.periode}`]);
    rows.push(['Généré le : ' + new Date().toLocaleDateString('fr-FR')]);
    rows.push([]);

    // En-têtes colonnes
    rows.push([
      'N° Pièce',
      'Date',
      'Désignation',
      'Catégorie',
      'Entrées (FCFA)',
      'Sorties (FCFA)',
      'Solde (FCFA)',
      'Responsable',
    ]);

    // Ligne solde d'ouverture
    rows.push([
      '—',
      data.dateDebut.toLocaleDateString('fr-FR'),
      "Report à nouveau / Solde d'ouverture",
      '',
      '',
      '',
      '',
      '',
    ]);

    // Opérations
    let soldeCourant = 0;
    for (const op of data.operations) {
      const isEntree = op.type === 'entree';
      const isSortie = op.type === 'sortie';
      if (isEntree) soldeCourant += op.montant;
      if (isSortie) soldeCourant -= op.montant;

      rows.push([
        op.numeroPiece ?? '—',
        new Date(op.date).toLocaleDateString('fr-FR'),
        op.libelle,
        op.categorieNom ?? '',
        isEntree ? fmt(op.montant) : '',
        isSortie ? fmt(op.montant) : '',
        fmt(soldeCourant),
        op.responsableNom ?? '',
      ]);
    }

    // Ligne totaux
    rows.push([]);
    rows.push([
      'TOTAUX',
      '',
      '',
      '',
      fmt(data.totalEntrees),
      fmt(data.totalSorties),
      fmt(data.soldeNet),
      '',
    ]);

    return rows;
  }

  private _fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  private _slugPeriode(data: RapportData): string {
    return data.periode.replace(/\s|—/g, '').replace(/\//g, '-');
  }

  private _download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: filename,
    });
    a.click();
    URL.revokeObjectURL(url);
  }
}
