import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, getDocs, setDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Categorie, CATEGORIES_DEFAUT } from '../models/categorie.model';
import { getTemplateById, getAllCategoriesFromTemplate } from '../models/templates.data';

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

  // ─── Initialisation par défaut (ancienne méthode) ────────────────────────

  /**
   * Initialiser ou compléter les catégories par défaut.
   * Stratégie non-destructive : on n'ajoute que les catégories système
   * absentes (comparaison sur le nom normalisé).
   */
  async initCategories(): Promise<number> {
    const snap = await getDocs(query(this.col, where('organisationId', '==', this.orgId)));

    const nomsExistants = new Set(
      snap.docs.map(d => (d.data()['nom'] as string).toLowerCase().trim())
    );

    const aAjouter = CATEGORIES_DEFAUT.filter(
      cat => !nomsExistants.has(cat.nom.toLowerCase().trim())
    );

    for (const cat of aAjouter) {
      await addDoc(this.col, { ...cat, organisationId: this.orgId, systeme: true });
    }

    return aAjouter.length;
  }

  // ─── Réinitialisation depuis le template ────────────────────────────────

  /**
   * Réinitialise les catégories à partir du template de l'organisation.
   * Supprime les catégories système et les recrée.
   */
  async reinitialiserDepuisTemplate(): Promise<number> {
    // Récupérer l'organisation pour connaître le templateId
    const org = await this.auth.getCurrentOrganisation();
    if (!org?.templateId) {
      throw new Error('Aucun modèle d\'activité défini pour cette organisation');
    }

    const template = getTemplateById(org.templateId);
    if (!template) {
      throw new Error('Modèle d\'activité introuvable');
    }

    // 1. Supprimer toutes les catégories système existantes
    const snap = await getDocs(
      query(
        this.col,
        where('organisationId', '==', this.orgId),
        where('systeme', '==', true)
      )
    );

    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // 2. Recréer les catégories à partir du template
    const allCategories = getAllCategoriesFromTemplate(template);
    const createPromises = allCategories.map(cat =>
      addDoc(this.col, {
        nom: cat.nom,
        type: cat.type,
        couleur: cat.couleur,
        organisationId: this.orgId,
        systeme: true,
      })
    );
    await Promise.all(createPromises);

    return allCategories.length;
  }

  /**
   * Ajoute les catégories d'un template sans supprimer les existantes.
   * Utilisé lors du changement de template.
   */
  async ajouterCategoriesFromTemplate(templateId: string): Promise<number> {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error('Modèle d\'activité introuvable');
    }

    // Récupérer les catégories existantes
    const snap = await getDocs(
      query(this.col, where('organisationId', '==', this.orgId))
    );

    const nomsExistants = new Set(
      snap.docs.map(d => (d.data()['nom'] as string).toLowerCase().trim())
    );

    // Filtrer les catégories à ajouter
    const allCategories = getAllCategoriesFromTemplate(template);
    const aAjouter = allCategories.filter(
      cat => !nomsExistants.has(cat.nom.toLowerCase().trim())
    );

    // Ajouter en parallèle
    const createPromises = aAjouter.map(cat =>
      addDoc(this.col, {
        nom: cat.nom,
        type: cat.type,
        couleur: cat.couleur,
        organisationId: this.orgId,
        systeme: true,
      })
    );
    await Promise.all(createPromises);

    return aAjouter.length;
  }
}
