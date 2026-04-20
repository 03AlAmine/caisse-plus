import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  runTransaction,
  setDoc,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { CaisseService } from './caisse.service';
import { BudgetService } from './budget.service';
import { Operation } from '../models/operation.model';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class OperationService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);
  private caisseService = inject(CaisseService);
  private budgetService = inject(BudgetService);
  private notifService  = inject(NotificationService);

  private get orgId(): string {
    return this.auth.organisationId;
  }
  private get col() {
    return collection(this.firestore, 'operations');
  }

  /**
   * Génère un numéro de pièce séquentiel unique par organisation.
   * Préfixe : "CA" pour caisse petites dépenses, "CP" pour grands comptes.
   * Le compteur est stocké dans Firestore : /compteurs/{orgId}_{prefix}
   * Format final : "CA-18976" ou "CP-0559"
   */
  async genererNumeroPiece(prefix: 'CA' | 'CP'): Promise<string> {
    const compteurId = `${this.orgId}_${prefix}`;
    const compteurRef = doc(this.firestore, `compteurs/${compteurId}`);

    let numero = 1;
    await runTransaction(this.firestore, async (tx) => {
      const snap = await tx.get(compteurRef);
      if (snap.exists()) {
        numero = (snap.data()['valeur'] as number) + 1;
      }
      tx.set(compteurRef, { valeur: numero, prefix, organisationId: this.orgId });
    });

    // Padding à 5 chiffres minimum : CA-00001 ... CP-12345
    const padded = String(numero).padStart(5, '0');
    return `${prefix}-${padded}`;
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
      // Les transferts partagent un même numéro de pièce sur les deux lignes
      const numeroPiece = await this.genererNumeroPiece('CP');
      await this.caisseService.alimenter(
        data.caisseId,
        data.transfertCaisseDestId,
        data.montant,
        data.libelle,
        user.uid,
        responsableNom,
        numeroPiece,
      );
      // alimenter() crée ses propres opérations — retourner un ID fictif
      return 'transfert-ok';
    }

    // Préfixe selon le type : CA = alimentation caisse / entrée, CP = pièce comptable / sortie
    const prefix = data.type === 'entree' ? 'CA' : 'CP';
    const numeroPiece = data.numeroPiece ?? await this.genererNumeroPiece(prefix);

    const ref = await addDoc(this.col, {
      ...data,
      numeroPiece,
      statut,
      responsableId: user.uid,
      responsableNom,
      organisationId: this.orgId,
      createdAt: serverTimestamp(),
    });

    const montantFmt = new Intl.NumberFormat('fr-FR').format(data.montant);
    const typeLabel  = data.type === 'entree' ? 'Entrée' : 'Sortie';
    const opLink     = `/operations`;

    // Si validée immédiatement : ajuster solde + notif succès
    if (statut === 'validee') {
      const delta = data.type === 'entree' ? data.montant : -data.montant;
      await this.caisseService.ajusterSolde(data.caisseId, delta);
      await this.budgetService.mettreAJourDepense(
        data.caisseId,
        data.categorieId ?? '',
        data.montant,
        data.type as 'entree' | 'sortie',
      );
      // Notif personnelle : confirmation à l'auteur
      await this.notifService.add(
        `${typeLabel} enregistrée — ${montantFmt} FCFA`,
        'success',
        { detail: data.libelle, link: opLink },
      );
    } else {
      // En attente de validation : alerter les trésoriers
      await this.notifService.notifierTresoriers(
        `Opération en attente de validation`,
        'warning',
        {
          detail: `${numeroPiece} · ${montantFmt} FCFA · ${data.libelle}`,
          link:   opLink,
        },
      );
      // Notif personnelle : informer l'auteur que c'est en attente
      await this.notifService.add(
        `Votre opération est en attente de validation`,
        'info',
        { detail: `${montantFmt} FCFA · ${data.libelle}`, link: opLink },
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
        tx.update(caisseRef, { solde: increment(-op.montant), updatedAt: serverTimestamp() });
        const destRef = doc(this.firestore, `caisses/${op.transfertCaisseDestId}`);
        tx.update(destRef, { solde: increment(op.montant),  updatedAt: serverTimestamp() });
      } else {
        const delta = op.type === 'entree' ? op.montant : -op.montant;
        tx.update(caisseRef, { solde: increment(delta), updatedAt: serverTimestamp() });
      }
    });

    if (op.type !== 'transfert') {
      await this.budgetService.mettreAJourDepense(
        op.caisseId, op.categorieId ?? '', op.montant, op.type as 'entree' | 'sortie',
      );
    }

    // Notifier l'auteur de l'opération que sa demande a été validée
    if (op.responsableId) {
      const montantFmt = new Intl.NumberFormat('fr-FR').format(op.montant);
      await this._notifierUtilisateur(
        op.responsableId,
        `Votre opération a été validée ✓`,
        'success',
        { detail: `${op.numeroPiece ?? ''} · ${montantFmt} FCFA · ${op.libelle}`, link: '/operations' },
      );
    }
  }

  async rejeter(id: string, motif?: string): Promise<void> {
    const opSnap = await getDoc(doc(this.firestore, `operations/${id}`));
    const op = opSnap.exists() ? opSnap.data() as Operation : null;

    await updateDoc(doc(this.firestore, `operations/${id}`), {
      statut: 'rejetee',
      motifRejet: motif ?? null,
      updatedAt: serverTimestamp(),
    });

    // Notifier l'auteur du rejet
    if (op?.responsableId) {
      const montantFmt = new Intl.NumberFormat('fr-FR').format(op.montant);
      await this._notifierUtilisateur(
        op.responsableId,
        `Votre opération a été rejetée`,
        'error',
        {
          detail: `${op.numeroPiece ?? ''} · ${montantFmt} FCFA · ${op.libelle}${motif ? ' — ' + motif : ''}`,
          link: '/operations',
        },
      );
    }
  }

  // Envoie une notification à un utilisateur spécifique (par uid)
  private async _notifierUtilisateur(
    userId: string,
    message: string,
    type: 'info' | 'warning' | 'success' | 'error',
    options: { detail?: string; link?: string } = {},
  ): Promise<void> {
    const { addDoc: add } = await import('@angular/fire/firestore');
    await addDoc(collection(this.firestore, 'notifications'), {
      message,
      detail:         options.detail ?? null,
      link:           options.link   ?? null,
      type,
      read:           false,
      userId,
      organisationId: this.orgId,
      createdAt:      serverTimestamp(),
    });
  }

  // Récupérer toutes les opérations d'une caisse pour un mois donné (triées par date ASC)
  getByCaisseMois(caisseId: string, annee: number, mois: number): Observable<Operation[]> {
    const debut = new Date(annee, mois - 1, 1, 0, 0, 0, 0);
    const fin   = new Date(annee, mois,     0, 23, 59, 59, 999); // dernier jour du mois
    const q = query(
      this.col,
      where('caisseId', '==', caisseId),
      where('organisationId', '==', this.orgId),
      where('date', '>=', debut),
      where('date', '<=', fin),
      orderBy('date', 'asc'),
      orderBy('createdAt', 'asc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Operation[]>;
  }

  /**
   * Calcule le solde net d'une caisse à partir de toutes les opérations
   * VALIDÉES dont la date est STRICTEMENT ANTÉRIEURE à `date`.
   *
   * C'est ce montant qu'on affiche comme "Report à nouveau / Solde d'ouverture"
   * en tête de chaque mois dans le livre de caisse.
   *
   * Firestore ne supporte pas SUM() natif : on ramène les docs et on somme côté client.
   * Pour des performances optimales l'index composite requis est :
   *   caisseId ASC  +  organisationId ASC  +  statut ASC  +  date ASC
   */
  async getSoldeAvantDate(caisseId: string, date: Date): Promise<number> {
    const q = query(
      this.col,
      where('caisseId',       '==', caisseId),
      where('organisationId', '==', this.orgId),
      where('statut',         '==', 'validee'),
      where('date',           '<',  Timestamp.fromDate(date)),
      orderBy('date', 'asc'),
    );

    const snap = await getDocs(q);
    let solde = 0;

    snap.forEach(d => {
      const op = d.data() as Operation;
      // Entrée nette (+) — Sortie nette (-)
      // Les transferts sont comptabilisés selon leur sens :
      //   sens='entree' → la caisse a reçu  → +montant
      //   sens='sortie' → la caisse a envoyé → -montant
      if (op.type === 'entree') {
        solde += op.montant;
      } else if (op.type === 'sortie') {
        solde -= op.montant;
      } else if (op.type === 'transfert') {
        if (op.sens === 'entree') solde += op.montant;
        else if (op.sens === 'sortie') solde -= op.montant;
        else {
          // Fallback legacy sans champ 'sens'
          if (op.transfertCaisseDestId === caisseId) solde += op.montant;
          else solde -= op.montant;
        }
      }
    });

    return Math.round(solde); // évite les erreurs flottantes JS (ex: 5030360 - 3678660)
  }

  async update(id: string, data: Partial<Operation>): Promise<void> {
    await updateDoc(doc(this.firestore, `operations/${id}`), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }
}
