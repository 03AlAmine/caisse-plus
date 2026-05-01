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
  TemplateComportement,
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

    const organisationRef = doc(collection(this.firestore, 'organisations'));
    const organisationId = organisationRef.id;

    await setDoc(organisationRef, {
      nom: organisationNom,
      ownerId: uid,
      templateId,
      createdAt: serverTimestamp(),
      membres: [uid],
      actif: true,
    });

    await setDoc(doc(this.firestore, `users/${uid}`), {
      uid,
      email,
      displayName,
      role: 'admin',
      organisationId,
      actif: true,
      createdAt: serverTimestamp(),
      createdBy: uid,
    });

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

    await updateDoc(orgRef, { membres: arrayUnion(uid) });

    await setDoc(doc(this.firestore, `users/${uid}`), {
      uid,
      email,
      displayName,
      role: 'utilisateur',
      organisationId,
      actif: true,
      createdAt: serverTimestamp(),
      createdBy: uid,
      invitedBy: orgData['ownerId'],
    });
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
      invitationCode,
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

  async getOrganisationTemplate(): Promise<ActiviteTemplate | undefined> {
    const org = await this.getCurrentOrganisation();
    if (!org?.templateId) return undefined;
    return getTemplateById(org.templateId);
  }

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

    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    await updateDoc(orgRef, { templateId });

    await this.initFromTemplate(this.organisationId, templateId);
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

  async updateOrganisation(data: {
    nom?: string;
    description?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  }): Promise<void> {
    if (!this.organisationId) throw new Error('Aucune organisation');
    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    await updateDoc(orgRef, { ...data, updatedAt: serverTimestamp() });
  }

  async getVocabulaire(): Promise<VocabulaireMetier> {
    const template = await this.getOrganisationTemplate();
    return template?.vocabulaire || VOCABULAIRE_DEFAUT;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Comportement — stocké dans organisations/{orgId}.comportement
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Sauvegarde le comportement personnalisé dans le document organisation.
   */
  async saveComportement(comportement: TemplateComportement): Promise<void> {
    if (!this.organisationId) throw new Error('Aucune organisation');
    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    await updateDoc(orgRef, {
      comportement,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Récupère le comportement de l'organisation.
   * Priorité : valeur personnalisée dans Firestore > template par défaut > defaults codés.
   */
  async getComportement(): Promise<TemplateComportement> {
    const defaults: TemplateComportement = {
      transfertActif: true,
      budgetParCategorie: true,
      soldeMinimumActif: true,
      multiCaisse: true,
      rapportsAvances: true,
      validationActive: true,
    };

    try {
      const org = await this.getCurrentOrganisation();
      if (org?.comportement) {
        // Fusionner avec les defaults pour garantir tous les champs
        return { ...defaults, ...org.comportement };
      }

      const template = await this.getOrganisationTemplate();
      if (template?.comportement) {
        return { ...defaults, ...template.comportement };
      }
    } catch (e) {
      console.error('Erreur chargement comportement:', e);
    }

    return defaults;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Seuil de validation — stocké dans organisations/{orgId}.seuilValidation
  // ✅ Unifié avec saveComportement : même document, même logique
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Récupère le seuil de validation de l'organisation.
   * Source unique : organisations/{orgId}.seuilValidation
   * Valeur par défaut : 100 000 FCFA
   */
  async getSeuilValidation(): Promise<number> {
    const defaut = 100000;

    try {
      const org = await this.getCurrentOrganisation();
      if (typeof org?.seuilValidation === 'number' && org.seuilValidation > 0) {
        return org.seuilValidation;
      }
    } catch (e) {
      console.error('Erreur chargement seuil validation:', e);
    }

    return defaut;
  }

  /**
   * Sauvegarde le seuil de validation dans le document organisation.
   * Source unique : organisations/{orgId}.seuilValidation
   * Réservé aux administrateurs.
   */
  async saveSeuilValidation(seuil: number): Promise<void> {
    if (!this.organisationId) throw new Error('Aucune organisation');
    if (!this.isAdmin()) {
      throw new Error('Seul un administrateur peut modifier ce paramètre');
    }

    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    await updateDoc(orgRef, {
      seuilValidation: seuil,
      updatedAt: serverTimestamp(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Initialisation à partir du template
  // ═══════════════════════════════════════════════════════════════════════

  private async initFromTemplate(
    organisationId: string,
    templateId: string,
  ): Promise<number> {
    const template = getTemplateById(templateId);
    if (!template) {
      console.warn(`Template ${templateId} introuvable.`);
      return 0;
    }

    const allCategories = getAllCategoriesFromTemplate(template);

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

    const aAjouter = allCategories.filter(
      (cat) => !nomsExistants.has(cat.nom.toLowerCase().trim()),
    );

    if (aAjouter.length > 0) {
      await Promise.all(
        aAjouter.map((cat) => {
          const ref = doc(collection(this.firestore, 'categories'));
          return setDoc(ref, {
            nom: cat.nom,
            type: cat.type,
            couleur: cat.couleur,
            organisationId,
            systeme: true,
          });
        }),
      );
    }

    return aAjouter.length;
  }

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
      if (caisseSuggeree.role === 'Principale' && hasPrincipale) continue;

      const nomExiste = existingCaisses.some(
        (c) =>
          (c['nom'] as string).toLowerCase().trim() ===
          caisseSuggeree.nom.toLowerCase().trim(),
      );
      if (nomExiste) continue;

      let type: 'principale' | 'secondaire' | 'libre' = 'libre';
      if (caisseSuggeree.role === 'Principale') type = 'principale';
      else if (caisseSuggeree.role === 'Secondaire') type = 'secondaire';

      await addDoc(collection(this.firestore, 'caisses'), {
        nom: caisseSuggeree.nom,
        type,
        role: caisseSuggeree.role,
        description: caisseSuggeree.description || '',
        couleur: caisseSuggeree.couleur || '#6B7280',
        solde: 0,
        organisationId,
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
}
