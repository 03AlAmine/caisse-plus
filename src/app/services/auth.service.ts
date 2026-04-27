import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole, Permission, peutFaire } from '../models/user.model';
import {
  getTemplateById,
  getAllCategoriesFromTemplate,
  ActiviteTemplate,
  VocabulaireMetier,
  VOCABULAIRE_DEFAUT,
} from '../models/templates.data';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private authReadySubject = new BehaviorSubject<boolean | null>(null);
  authReady$ = this.authReadySubject.asObservable();

  isAuthenticated$: Observable<boolean>;

  constructor() {
    this.isAuthenticated$ = new Observable((observer) => {
      const unsub = onAuthStateChanged(this.auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await this.getUserProfile(firebaseUser.uid);
          this.currentUserSubject.next(profile);
          observer.next(true);
          this.authReadySubject.next(true);
        } else {
          this.currentUserSubject.next(null);
          observer.next(false);
          this.authReadySubject.next(false);
        }
      });
      return unsub;
    });

    this.isAuthenticated$.subscribe();
  }

  // ── Getters ────────────────────────────────────────────────────────────────
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }
  get organisationId(): string {
    return this.currentUser?.organisationId ?? '';
  }
  get role(): UserRole {
    return this.currentUser?.role ?? 'utilisateur';
  }

  // ── Vérification de rôle ───────────────────────────────────────────────────
  hasRole(...roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }
  isTresorier(): boolean {
    return this.hasRole('admin', 'tresorier');
  }
  isAuditeur(): boolean {
    return this.hasRole('admin', 'tresorier', 'auditeur');
  }

  peut(permission: Permission): boolean {
    return peutFaire(this.role, permission);
  }

  // ── Auth Firebase ──────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  /**
   * Inscription avec création d'une nouvelle organisation
   * @param templateId - ID du template d'activité choisi (optionnel, défaut: 'libre')
   */
  async registerWithNewOrganisation(
    email: string,
    password: string,
    displayName: string,
    organisationNom: string,
    templateId: string = 'libre',
  ): Promise<void> {
    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    const uid = credential.user.uid;
    await updateProfile(credential.user, { displayName });

    // Créer l'organisation
    const organisationRef = doc(collection(this.firestore, 'organisations'));
    const organisationId = organisationRef.id;

    await setDoc(organisationRef, {
      nom: organisationNom,
      ownerId: uid,
      templateId: templateId, // ← Stocker le template choisi
      createdAt: serverTimestamp(),
      membres: [uid],
      actif: true,
    });

    // Créer le profil utilisateur
    await setDoc(doc(this.firestore, `users/${uid}`), {
      uid,
      email,
      displayName,
      role: 'admin',
      organisationId: organisationId,
      actif: true,
      createdAt: serverTimestamp(),
      createdBy: uid,
    });

    // Initialiser les catégories et caisses à partir du template
    await this.initFromTemplate(organisationId, templateId);
  }

  /**
   * Inscription pour rejoindre une organisation existante
   */
  async registerToExistingOrganisation(
    email: string,
    password: string,
    displayName: string,
    organisationId: string,
    invitationCode?: string,
    templateId?: string, // Non utilisé pour une organisation existante
  ): Promise<void> {
    const orgRef = doc(this.firestore, `organisations/${organisationId}`);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      throw new Error(
        "Organisation introuvable. Vérifiez le code d'invitation.",
      );
    }

    const orgData = orgSnap.data();

    if (orgData['actif'] === false) {
      throw new Error("Cette organisation n'est plus active.");
    }

    if (invitationCode && orgData['invitationCode'] !== invitationCode) {
      throw new Error("Code d'invitation invalide.");
    }

    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    const uid = credential.user.uid;
    await updateProfile(credential.user, { displayName });

    await updateDoc(orgRef, {
      membres: arrayUnion(uid),
    });

    await setDoc(doc(this.firestore, `users/${uid}`), {
      uid,
      email,
      displayName,
      role: 'utilisateur',
      organisationId: organisationId,
      actif: true,
      createdAt: serverTimestamp(),
      createdBy: uid,
      invitedBy: orgData['ownerId'],
    });

    // Pas d'initialisation de template pour une organisation existante
    // L'utilisateur hérite des catégories déjà en place
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUserSubject.next(null);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async updateUserProfile(data: Partial<User>): Promise<void> {
    if (!this.currentUser) return;
    await updateDoc(doc(this.firestore, `users/${this.currentUser.uid}`), {
      ...data,
    });
    this.currentUserSubject.next({ ...this.currentUser, ...data });
  }

  async generateInvitationCode(): Promise<string> {
    if (!this.isAdmin()) {
      throw new Error(
        "Seul un administrateur peut générer un code d'invitation",
      );
    }
    const invitationCode = Math.random()
      .toString(36)
      .substring(2, 15)
      .toUpperCase();
    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    await updateDoc(orgRef, {
      invitationCode: invitationCode,
      invitationCodeGeneratedAt: serverTimestamp(),
    });
    return invitationCode;
  }

  async getCurrentOrganisation(): Promise<any> {
    if (!this.organisationId) return null;
    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    const orgSnap = await getDoc(orgRef);
    return orgSnap.exists() ? { id: orgSnap.id, ...orgSnap.data() } : null;
  }

  /**
   * Récupère le template de l'organisation courante
   */
  async getOrganisationTemplate(): Promise<ActiviteTemplate | undefined> {
    const org = await this.getCurrentOrganisation();
    if (!org?.templateId) return undefined;
    return getTemplateById(org.templateId);
  }

  /**
   * Change le template de l'organisation (admin uniquement)
   * Ajoute les catégories manquantes sans supprimer les existantes
   */
  async changerTemplate(templateId: string): Promise<void> {
    if (!this.isAdmin()) {
      throw new Error(
        "Seul un administrateur peut changer le modèle d'activité",
      );
    }

    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error("Modèle d'activité introuvable");
    }

    // Mettre à jour l'organisation
    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    await updateDoc(orgRef, { templateId });

    // Ajouter les catégories manquantes
    await this.initFromTemplate(this.organisationId, templateId);

    // Ajouter les caisses suggérées manquantes
    await this.initCaissesFromTemplate(this.organisationId, template);
  }

  async quitOrganisation(): Promise<void> {
    if (!this.currentUser) return;
    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) return;
    const orgData = orgSnap.data();

    if (orgData['ownerId'] === this.currentUser.uid) {
      throw new Error(
        "Vous êtes le propriétaire. Transférez la propriété ou supprimez l'organisation avant de quitter.",
      );
    }

    await updateDoc(orgRef, { membres: arrayRemove(this.currentUser.uid) });
    await updateDoc(doc(this.firestore, `users/${this.currentUser.uid}`), {
      actif: false,
      organisationId: null,
    });
    await this.logout();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Initialisation à partir du template
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Initialise les catégories à partir du template sélectionné.
   * Stratégie non-destructive : n'ajoute que les catégories absentes.
   */
  private async initFromTemplate(
    organisationId: string,
    templateId: string,
  ): Promise<number> {
    const template = getTemplateById(templateId);
    if (!template) {
      console.warn(
        `Template ${templateId} introuvable, utilisation des catégories par défaut.`,
      );
      return 0;
    }

    const allCategories = getAllCategoriesFromTemplate(template);

    // Récupérer les catégories existantes pour éviter les doublons
    const existingSnap = await getDocs(
      query(
        collection(this.firestore, 'categories'),
        where('organisationId', '==', organisationId),
      ),
    );

    const nomsExistants = new Set(
      existingSnap.docs.map((d) =>
        (d.data()['nom'] as string).toLowerCase().trim(),
      ),
    );

    // Filtrer les catégories à ajouter
    const aAjouter = allCategories.filter(
      (cat) => !nomsExistants.has(cat.nom.toLowerCase().trim()),
    );

    // Ajouter en batch
    const batch = [];
    for (const cat of aAjouter) {
      const ref = doc(collection(this.firestore, 'categories'));
      batch.push(
        setDoc(ref, {
          nom: cat.nom,
          type: cat.type,
          couleur: cat.couleur,
          organisationId: organisationId,
          systeme: true, // Marquer comme catégorie système venant du template
        }),
      );
    }

    if (batch.length > 0) {
      await Promise.all(batch);
    }

    return aAjouter.length;
  }

  /**
   * Initialise les caisses suggérées par le template.
   * Ne crée pas de caisse principale s'il en existe déjà une.
   */
  private async initCaissesFromTemplate(
    organisationId: string,
    template: ActiviteTemplate,
  ): Promise<number> {
    const existingSnap = await getDocs(
      query(
        collection(this.firestore, 'caisses'),
        where('organisationId', '==', organisationId),
      ),
    );

    const existingCaisses = existingSnap.docs.map((d) => d.data());
    const hasPrincipale = existingCaisses.some(
      (c) => c['type'] === 'principale',
    );

    let addedCount = 0;

    for (const caisseSuggeree of template.caissesSuggerees) {
      // Ne pas créer de caisse principale s'il en existe déjà une
      if (caisseSuggeree.role === 'Principale' && hasPrincipale) continue;

      const nomExiste = existingCaisses.some(
        (c) =>
          (c['nom'] as string).toLowerCase().trim() ===
          caisseSuggeree.nom.toLowerCase().trim(),
      );

      if (nomExiste) continue;

      // Déterminer le type en fonction du rôle
      let type: 'principale' | 'secondaire' | 'libre' = 'libre';
      if (caisseSuggeree.role === 'Principale') type = 'principale';
      else if (caisseSuggeree.role === 'Secondaire') type = 'secondaire';

      await addDoc(collection(this.firestore, 'caisses'), {
        nom: caisseSuggeree.nom,
        type: type,
        role: caisseSuggeree.role, // ← Stocker le rôle
        description: caisseSuggeree.description || '',
        couleur: caisseSuggeree.couleur || '#6B7280',
        solde: 0,
        organisationId: organisationId,
        actif: true,
        createdAt: serverTimestamp(),
      });

      addedCount++;
    }

    return addedCount;
  }

  // ── Privé ──────────────────────────────────────────────────────────────────
  private async getUserProfile(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(this.firestore, `users/${uid}`));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: data['uid'],
      email: data['email'],
      displayName: data['displayName'],
      role: data['role'],
      organisationId: data['organisationId'],
      actif: data['actif'],
      invitedBy: data['invitedBy'],
      createdAt: data['createdAt']?.toDate() ?? new Date(),
    } as User;
  }

  /**
   * Met à jour les informations de l'organisation
   */
  async updateOrganisation(data: {
    nom?: string;
    description?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  }): Promise<void> {
    if (!this.organisationId) throw new Error('Aucune organisation');

    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    await updateDoc(orgRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }
  /**
   * Récupère le vocabulaire de l'organisation courante
   */
  async getVocabulaire(): Promise<VocabulaireMetier> {
    const template = await this.getOrganisationTemplate();
    return template?.vocabulaire || VOCABULAIRE_DEFAUT;
  }
}
